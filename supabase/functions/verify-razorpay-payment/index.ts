import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const RAZORPAY_KEY_SECRET  = Deno.env.get('RAZORPAY_KEY_SECRET')!
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json()

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return error(400, 'razorpay_payment_id, razorpay_order_id and razorpay_signature are required')
    }

    // Checkout.js signature: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    const expected = createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expected !== razorpay_signature) {
      return error(400, 'invalid payment signature')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Idempotency: webhook may have already created the order.
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ order_id: existing.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const { data: cart, error: cartErr } = await supabase
      .from('pending_carts')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle()

    if (cartErr || !cart) {
      return error(404, 'pending cart not found — order may still be processing')
    }

    if (cart.consumed_at) {
      // Webhook beat us to it; order is in-flight. Client can poll.
      const { data: raceOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('razorpay_order_id', razorpay_order_id)
        .maybeSingle()
      if (raceOrder) {
        return new Response(JSON.stringify({ order_id: raceOrder.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
      return error(409, 'payment is being processed — please wait')
    }

    const couponDiscount  = Number(cart.coupon_discount ?? 0)
    const loyaltyDiscount = Number(cart.loyalty_discount_amount ?? 0)

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_type:              cart.order_type,
        channel:                 cart.channel,
        status:                  'pending',
        payment_method:          'upi',
        payment_status:          'paid',
        razorpay_order_id,
        customer_phone:          cart.customer_phone ?? null,
        total_amount:            cart.total_amount,
        gst_rate:                cart.gst_rate,
        gst_amount:              cart.gst_amount,
        discount_amount:         couponDiscount + loyaltyDiscount,
        coupon_code:             cart.coupon_code ?? null,
        loyalty_points_redeemed: cart.loyalty_points_redeemed ?? 0,
      })
      .select('id')
      .single()

    if (orderErr || !order) {
      console.error('order insert failed:', orderErr)
      return error(500, 'order creation failed')
    }

    const orderItems = (cart.items as Array<{
      menu_item_id: string
      quantity: number
      unit_price: number
      subtotal: number
      variant_id?: string | null
      variant_name?: string | null
      customizations?: Record<string, unknown>
    }>).map((i) => ({
      order_id:       order.id,
      menu_item_id:   i.menu_item_id,
      quantity:       i.quantity,
      unit_price:     i.unit_price,
      subtotal:       i.subtotal,
      variant_id:     i.variant_id ?? null,
      variant_name:   i.variant_name ?? null,
      customizations: i.customizations ?? {},
    }))

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
    if (itemsErr) {
      console.error('order_items insert failed:', itemsErr)
      // Order row exists — kitchen will see it. Surface 200 so the client
      // doesn't re-attempt and produce a duplicate order.
      return new Response(JSON.stringify({ order_id: order.id, items_warning: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (cart.customer_phone) {
      await supabase.rpc('award_loyalty_for_order', {
        p_phone:           String(cart.customer_phone),
        p_amount_paid:     Number(cart.total_amount ?? 0),
        p_points_redeemed: Math.max(0, Math.floor(Number(cart.loyalty_points_redeemed ?? 0))),
      })
    }

    await supabase
      .from('pending_carts')
      .update({ consumed_at: new Date().toISOString() })
      .eq('razorpay_order_id', razorpay_order_id)

    return new Response(JSON.stringify({ order_id: order.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    console.error(e)
    return error(500, 'internal server error')
  }
})

function error(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}
