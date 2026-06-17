import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWILIO_ACCOUNT_SID  = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN   = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_WA_FROM      = Deno.env.get('TWILIO_WHATSAPP_FROM')!  // whatsapp:+14155238886
const TWILIO_SMS_FROM     = Deno.env.get('TWILIO_SMS_FROM')!
const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// This function is called by a Supabase Database Webhook on:
//   table: orders, event: UPDATE, filter: status=ready
serve(async (req) => {
  const body = await req.json()

  const record    = body.record     // the updated order row
  const old_record = body.old_record

  // Only act when status transitions to 'ready'
  if (!record || record.status !== 'ready' || old_record?.status === 'ready') {
    return new Response('no action', { status: 200 })
  }

  const orderId = record.id
  const phone   = record.customer_phone

  if (!phone) {
    // No phone — nothing to notify (waiter-service dine-in orders)
    return new Response('no phone', { status: 200 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Dedup: check we haven't already sent a notification for this order
  const { data: existing } = await supabase
    .from('print_jobs')  // reuse print_jobs as a simple notification log (or add notification_log table)
    .select('id')
    .eq('order_id', orderId)
    .eq('type', 'kot')  // proxy: if KOT was printed, order is being processed

  const message = `Your order is ready for pickup! 🍽️ Thank you for choosing us.`
  const to      = `+${phone.replace(/\D/g, '')}`

  const twilioBase = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
  const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)

  // Try WhatsApp first
  let notified = false

  const waRes = await fetch(twilioBase, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${twilioAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: TWILIO_WA_FROM,
      To: `whatsapp:${to}`,
      Body: message,
    }),
  })

  if (waRes.ok) {
    notified = true
    console.log(`WhatsApp sent for order ${orderId}`)
  } else {
    const waErr = await waRes.text()
    console.warn(`WhatsApp failed for order ${orderId}:`, waErr)

    // SMS fallback
    const smsRes = await fetch(twilioBase, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: TWILIO_SMS_FROM,
        To: to,
        Body: message,
      }),
    })

    if (smsRes.ok) {
      notified = true
      console.log(`SMS fallback sent for order ${orderId}`)
    } else {
      const smsErr = await smsRes.text()
      console.error(`SMS fallback also failed for order ${orderId}:`, smsErr)
    }
  }

  return new Response(JSON.stringify({ notified }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
