import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!
const SUPABASE_URL            = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// Set to "true" in dev/staging only. When set, the function accepts a
// { __simulate: true, razorpay_order_id } body without HMAC verification.
// MUST be unset/false in production.
const ALLOW_SIMULATE          = Deno.env.get('ALLOW_RAZORPAY_SIMULATE') === 'true'

serve(async (req) => {
  const rawBody = await req.text()
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // --- Dev-only: simulate a successful capture for the given order id ---
  if (ALLOW_SIMULATE) {
    let parsed: any = null
    try { parsed = JSON.parse(rawBody) } catch { /* fall through */ }
    if (parsed?.__simulate === true && typeof parsed.razorpay_order_id === 'string') {
      return await processCapture(supabase, parsed.razorpay_order_id)
    }
  }

  // --- Production path: verify HMAC, then process payment.captured ---
  const signature = req.headers.get('x-razorpay-signature')
  if (!signature) {
    return new Response('missing signature', { status: 400 })
  }

  const expectedSig = createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')

  if (signature !== expectedSig) {
    return new Response('invalid signature', { status: 401 })
  }

  const event = JSON.parse(rawBody)

  if (event.event !== 'payment.captured') {
    return new Response('ignored', { status: 200 })
  }

  const payment       = event.payload.payment.entity
  const rzp_order_id  = payment.order_id

  return await processCapture(supabase, rzp_order_id)
})

async function processCapture(supabase: any, rzp_order_id: string) {
  // --- Idempotency: skip if an order already exists for this Razorpay order ---
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('razorpay_order_id', rzp_order_id)
    .maybeSingle()

  if (existing) {
    return new Response(JSON.stringify({ order_id: existing.id, deduplicated: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  }

  // --- Load the staged cart written by create-razorpay-order ---
  const { data: cart, error: cartErr } = await supabase
    .from('pending_carts')
    .select('*')
    .eq('razorpay_order_id', rzp_order_id)
    .maybeSingle()

  if (cartErr || !cart) {
    console.error('pending_cart not found for', rzp_order_id, cartErr)
    return new Response('pending cart not found', { status: 404 })
  }

  if (cart.consumed_at) {
    // Race: another webhook delivery already consumed this cart but the
    // order insert below hadn't committed yet. Return 200 so Razorpay
    // doesn't retry forever; the duplicate-order check above will catch
    // the real row on the next read.
    return new Response('already consumed', { status: 200 })
  }

  // --- Insert the order (status='pending' triggers ingredient deduction) ---
  const couponDiscount = Number(cart.coupon_discount ?? 0)
  const loyaltyDiscount = Number(cart.loyalty_discount_amount ?? 0)
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      order_type:              cart.order_type,
      channel:                 cart.channel,
      status:                  'pending',
      payment_method:          'upi',
      payment_status:          'paid',
      razorpay_order_id:       rzp_order_id,
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
    console.error('failed to insert order:', orderErr)
    return new Response('order insert failed', { status: 500 })
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
    order_id:      order.id,
    menu_item_id:  i.menu_item_id,
    quantity:      i.quantity,
    unit_price:    i.unit_price,
    subtotal:      i.subtotal,
    variant_id:    i.variant_id ?? null,
    variant_name:  i.variant_name ?? null,
    customizations: i.customizations ?? {},
  }))

  const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
  if (itemsErr) {
    console.error('failed to insert order items:', itemsErr)
    // Order row is already in place. Leave it — the operator can recover from
    // logs. Returning 500 would cause Razorpay to retry and produce duplicates
    // on the next delivery (the idempotency check at the top would catch it,
    // but we'd never reconcile the missing items). Surface a 200 with a flag.
    return new Response(JSON.stringify({ order_id: order.id, items_failed: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  }

  if (cart.customer_phone) {
    await supabase.rpc('award_loyalty_for_order', {
      p_phone: String(cart.customer_phone),
      p_amount_paid: Number(cart.total_amount ?? 0),
      p_points_redeemed: Math.max(0, Math.floor(Number(cart.loyalty_points_redeemed ?? 0))),
    })
  }

  // --- Mark the staged cart consumed so retries are cheap ---
  await supabase
    .from('pending_carts')
    .update({ consumed_at: new Date().toISOString() })
    .eq('razorpay_order_id', rzp_order_id)

  return new Response(JSON.stringify({ order_id: order.id }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
}
