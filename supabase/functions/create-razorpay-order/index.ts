import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RAZORPAY_KEY_ID      = Deno.env.get('RAZORPAY_KEY_ID')!
const RAZORPAY_KEY_SECRET  = Deno.env.get('RAZORPAY_KEY_SECRET')!
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const UPI_VPA              = Deno.env.get('UPI_VPA') ?? ''   // optional: merchant VPA for upi:// intent
const UPI_PAYEE_NAME       = Deno.env.get('UPI_PAYEE_NAME') ?? 'DineFlow'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return error(401, 'payment provider credentials are not configured')
    }

    const body = await req.json()
    const {
      items,
      channel,
      customer_phone,
      order_type,
      loyalty_points_to_redeem,
      coupon_code,
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return error(400, 'items array is required')
    }
    if (!channel || !['kiosk', 'web', 'desk'].includes(channel)) {
      return error(400, 'invalid channel')
    }
    if (channel === 'web' && !customer_phone) {
      return error(400, 'customer_phone is required for web orders')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: settings } = await supabase
      .from('restaurant_settings')
      .select('gst_rate, gst_inclusive')
      .single()

    if (!settings) return error(500, 'could not load restaurant settings')

    const itemIds = items.map((i: { menu_item_id: string }) => i.menu_item_id)
    const variantIds = [
      ...new Set(
        items
          .map((i: { variant_id?: string | null }) => i.variant_id)
          .filter((v: string | null | undefined): v is string => !!v)
      ),
    ]

    const [{ data: menuItems, error: menuErr }, { data: variants, error: varErr }, { data: removableMappings }] = await Promise.all([
      supabase
        .from('menu_items')
        .select('id, name, price, available')
        .in('id', itemIds),
      variantIds.length
        ? supabase
            .from('menu_item_variants')
            .select('id, menu_item_id, name, price, available')
            .in('id', variantIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      supabase
        .from('menu_item_ingredients')
        .select('menu_item_id, ingredient_id, customer_removable')
        .in('menu_item_id', itemIds),
    ])

    if (menuErr || !menuItems) return error(500, 'failed to validate menu items')
    if (varErr) return error(500, 'failed to validate variants')

    const menuMap = new Map(menuItems.map((m) => [m.id, m]))
    const variantMap = new Map((variants ?? []).map((v) => [v.id, v]))
    const removableMap = new Map<string, Set<string>>()
    for (const r of removableMappings ?? []) {
      if (!r.customer_removable) continue
      if (!removableMap.has(r.menu_item_id)) removableMap.set(r.menu_item_id, new Set())
      removableMap.get(r.menu_item_id)!.add(r.ingredient_id)
    }

    let subtotal = 0
    const validatedItems: Array<{
      menu_item_id: string
      variant_id: string | null
      variant_name: string | null
      quantity: number
      unit_price: number
      subtotal: number
      customizations: { removed_ingredients?: string[]; special_instructions?: string }
    }> = []

    for (const item of items) {
      const mi = menuMap.get(item.menu_item_id)
      if (!mi) return error(400, `item ${item.menu_item_id} not found`)
      if (!mi.available) return error(400, `item ${item.menu_item_id} is not available`)
      if (!item.quantity || item.quantity < 1) return error(400, 'quantity must be >= 1')

      // Variant: when supplied, must belong to this menu item and be available.
      // Price is taken from the variant; menu_items.price is ignored in that case.
      let unitPrice = Number(mi.price)
      let variantName: string | null = null
      let variantId: string | null = null
      if (item.variant_id) {
        const v = variantMap.get(item.variant_id)
        if (!v || v.menu_item_id !== item.menu_item_id) {
          return error(400, `variant ${item.variant_id} does not belong to ${item.menu_item_id}`)
        }
        if (!v.available) return error(400, `variant ${item.variant_id} is not available`)
        unitPrice = Number(v.price)
        variantName = v.name
        variantId = v.id
      }

      // Drop any ingredient ids the customer tried to mark removed that aren't
      // actually customer-removable for this menu item. This is the only
      // server-side check that defends the kitchen from receiving spurious
      // "NO FLOUR" instructions if a tampered client posts arbitrary ids.
      const allowedRemovals = removableMap.get(item.menu_item_id) ?? new Set<string>()
      const removed: string[] = Array.isArray(item.customizations?.removed_ingredients)
        ? item.customizations.removed_ingredients.filter((id: string) => allowedRemovals.has(id))
        : []
      const instr = typeof item.customizations?.special_instructions === 'string'
        ? item.customizations.special_instructions.slice(0, 140).trim()
        : ''
      const customizations: { removed_ingredients?: string[]; special_instructions?: string } = {}
      if (removed.length > 0) customizations.removed_ingredients = removed
      if (instr) customizations.special_instructions = instr

      const lineTotal = unitPrice * item.quantity
      subtotal += lineTotal
      validatedItems.push({
        menu_item_id: item.menu_item_id,
        variant_id: variantId,
        variant_name: variantName,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: lineTotal,
        customizations,
      })
    }

    let gst_amount = 0
    let total_amount = subtotal

    if (settings.gst_inclusive) {
      gst_amount = subtotal - subtotal / (1 + settings.gst_rate / 100)
    } else {
      gst_amount = subtotal * (settings.gst_rate / 100)
      total_amount = subtotal + gst_amount
    }

    gst_amount   = Math.round(gst_amount * 100) / 100
    total_amount = Math.round(total_amount * 100) / 100

    // Coupon (server-side validation). Throws on invalid/expired.
    let coupon_discount = 0
    let normalized_coupon: string | null = null
    if (coupon_code && String(coupon_code).trim()) {
      normalized_coupon = String(coupon_code).trim().toUpperCase()
      const { data: discData, error: couponErr } = await supabase.rpc('validate_coupon', {
        p_code: normalized_coupon,
        p_order_total: total_amount,
      })
      if (couponErr) return error(400, couponErr.message)
      coupon_discount = Math.max(0, Math.min(Number(discData ?? 0), total_amount - 1))
      total_amount = Math.round(Math.max(0, total_amount - coupon_discount) * 100) / 100
    }

    // Loyalty points (1 pt = ₹1, capped at balance and total - 1).
    let loyalty_points_redeemed = 0
    let loyalty_discount_amount = 0
    const requestedPoints = Math.max(0, Math.floor(Number(loyalty_points_to_redeem ?? 0)))

    if (requestedPoints > 0) {
      if (!customer_phone) return error(400, 'customer_phone is required to use points')

      const phoneDigits = String(customer_phone).replace(/\D/g, '')
      const { data: loyalty } = await supabase
        .from('loyalty_accounts')
        .select('points')
        .eq('phone', phoneDigits)
        .maybeSingle()

      const availablePoints = Math.max(0, Number(loyalty?.points ?? 0))
      loyalty_points_redeemed = Math.min(requestedPoints, availablePoints, Math.max(0, Math.floor(total_amount) - 1))
      loyalty_discount_amount = loyalty_points_redeemed
      total_amount = Math.round(Math.max(0, total_amount - loyalty_discount_amount) * 100) / 100
    }

    const amountPaise = Math.round(total_amount * 100)
    if (amountPaise < 100) {
      return error(400, 'amount must be at least 100 paise')
    }

    // --- Create Razorpay order ---
    const rzpAuth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
    const receipt = `df_${Date.now()}`
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${rzpAuth}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        // Notes stays small on purpose — full cart goes in pending_carts.
        notes: { channel, receipt },
      }),
    })

    if (!rzpRes.ok) {
      const rzpErr = await rzpRes.text()
      console.error('Razorpay error:', rzpErr)
      if (rzpRes.status === 401) {
        return error(401, 'payment provider authentication failed')
      }
      return error(502, 'payment provider error')
    }

    const rzpOrder = await rzpRes.json()

    // --- Persist the full cart, keyed by razorpay_order_id ---
    const { error: pcErr } = await supabase.from('pending_carts').insert({
      razorpay_order_id: rzpOrder.id,
      channel,
      order_type:     order_type ?? 'takeaway',
      customer_phone: customer_phone ? String(customer_phone).replace(/\D/g, '') : null,
      items:          validatedItems,
      subtotal,
      gst_rate:       settings.gst_rate,
      gst_amount,
      total_amount,
      loyalty_points_redeemed,
      loyalty_discount_amount,
      coupon_code:    normalized_coupon,
      coupon_discount,
    })

    if (pcErr) {
      console.error('pending_carts insert failed:', pcErr)
      return error(500, 'could not stage cart')
    }

    // --- Build a UPI intent URL when a merchant VPA is configured. ---
    // When unset (dev/sandbox), the client falls back to the simulate flow.
    let upi_intent_url: string | null = null
    if (UPI_VPA) {
      const params = new URLSearchParams({
        pa: UPI_VPA,
        pn: UPI_PAYEE_NAME,
        am: total_amount.toFixed(2),
        cu: 'INR',
        tn: `DineFlow ${receipt}`,
        tr: rzpOrder.id,
      })
      upi_intent_url = `upi://pay?${params.toString()}`
    }

    return new Response(
      JSON.stringify({
        order_id:          rzpOrder.id,
        razorpay_order_id: rzpOrder.id,
        razorpay_key_id:   RAZORPAY_KEY_ID,
        amount:            amountPaise,
        amount_paise:      amountPaise,
        currency:          'INR',
        total_amount,
        gst_amount,
        gst_rate:          settings.gst_rate,
        coupon_discount,
        loyalty_discount_amount,
        upi_intent_url,
        validated_items:   validatedItems,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
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
