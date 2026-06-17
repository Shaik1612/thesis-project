import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!
const SUPABASE_URL            = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const rawBody = await req.text()

  const signature = req.headers.get('x-razorpay-signature')
  if (!signature) return new Response('missing signature', { status: 400 })

  const expectedSig = createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')

  if (signature !== expectedSig) return new Response('invalid signature', { status: 401 })

  const event = JSON.parse(rawBody)

  if (!['refund.created', 'refund.processed', 'refund.failed'].includes(event.event)) {
    return new Response('ignored', { status: 200 })
  }

  const refundEntity   = event.payload.refund.entity
  const rzpRefundId    = refundEntity.id
  const rzpOrderId     = refundEntity.payment_id  // Razorpay sends payment_id here
  const refundStatus   = event.event === 'refund.processed' ? 'processed'
                       : event.event === 'refund.failed'    ? 'failed'
                       : 'pending'

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Find the order by razorpay_order_id
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('razorpay_order_id', rzpOrderId)
    .maybeSingle()

  if (!order) {
    console.warn('no order found for razorpay payment_id', rzpOrderId)
    return new Response('order not found', { status: 404 })
  }

  // Update existing refund record by razorpay_refund_id, or insert if new
  const { data: existing } = await supabase
    .from('refunds')
    .select('id')
    .eq('razorpay_refund_id', rzpRefundId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('refunds')
      .update({ status: refundStatus })
      .eq('id', existing.id)
  } else {
    await supabase.from('refunds').insert({
      order_id: order.id,
      razorpay_refund_id: rzpRefundId,
      amount: refundEntity.amount / 100, // paise → rupees
      status: refundStatus,
    })
  }

  return new Response('ok', { status: 200 })
})
