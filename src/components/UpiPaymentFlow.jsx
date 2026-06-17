import { useState } from 'react'
import { CheckCircle2, Smartphone, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button, MoneyText } from './ui'

const IS_DEV = import.meta.env.DEV

export default function UpiPaymentFlow({
  cart,
  channel,
  phone,
  orderType = 'takeaway',
  amount,
  loyaltyPointsToRedeem = 0,
  couponCode = null,
  onConfirmed,
  onError,
}) {
  const [step, setStep] = useState('idle')
  const [razorpayOrderId, setRazorpayOrderId] = useState('')
  const [upiIntentUrl, setUpiIntentUrl] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  async function initiate() {
    setStep('creating')
    setErrorMsg('')
    try {
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          items: cart.items.map((i) => ({
            menu_item_id: i.menuItemId,
            quantity: i.quantity,
            variant_id: i.variantId ?? null,
            customizations: i.customizations ?? {},
          })),
          channel,
          customer_phone: phone ?? null,
          order_type: orderType,
          loyalty_points_to_redeem: loyaltyPointsToRedeem,
          coupon_code: couponCode,
        },
      })
      if (error) throw new Error(error.message)
      if (!data?.razorpay_order_id) throw new Error('no order id returned')

      setRazorpayOrderId(data.razorpay_order_id)
      setUpiIntentUrl(data.upi_intent_url ?? '')
      setStep('waiting')

      // Production: redirect into the user's UPI app when an intent URL was returned.
      // Without one (sandbox / no VPA configured), we rely on the dev simulate button.
      if (!IS_DEV && data.upi_intent_url) {
        window.location.href = data.upi_intent_url
      }
    } catch (e) {
      setErrorMsg(e.message)
      setStep('error')
      onError?.(e.message)
    }
  }

  async function simulate() {
    setStep('creating')
    try {
      const { error } = await supabase.functions.invoke('razorpay-webhook', {
        body: { __simulate: true, razorpay_order_id: razorpayOrderId },
      })
      if (error) throw new Error(error.message)
      setStep('confirmed')
      onConfirmed?.()
    } catch (e) {
      setErrorMsg(e.message)
      setStep('error')
    }
  }

  if (step === 'idle') {
    return (
      <Button variant="primary" size="lg" fullWidth onClick={initiate}>
        <Smartphone className="h-5 w-5" />
        Pay <MoneyText amount={amount} /> with UPI
      </Button>
    )
  }

  if (step === 'creating') {
    return (
      <div className="flex items-center justify-center gap-3 rounded-xl bg-surface-100 px-4 py-6">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
        <span className="text-sm text-ink-600">Preparing payment…</span>
      </div>
    )
  }

  if (step === 'waiting') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl bg-surface-100 px-4 py-6 text-center">
        {IS_DEV ? (
          <>
            <div className="text-xs uppercase tracking-wide text-ink-400">Dev mode</div>
            <div className="font-mono text-xs text-ink-600 break-all">{razorpayOrderId}</div>
            <Button variant="primary" size="md" onClick={simulate}>
              Simulate successful payment
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            <p className="max-w-xs text-sm text-ink-600">
              Finish payment in your UPI app, then return here.
            </p>
            {upiIntentUrl && (
              <a
                href={upiIntentUrl}
                className="text-xs text-brand-700 underline"
              >
                Open UPI app again
              </a>
            )}
          </>
        )}
      </div>
    )
  }

  if (step === 'confirmed') {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl bg-status-ready/10 px-4 py-6 text-status-ready">
        <CheckCircle2 className="h-6 w-6" />
        <span className="font-medium">Payment confirmed</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-status-cancelled/10 px-4 py-6 text-status-cancelled">
      <AlertCircle className="h-6 w-6" />
      <span className="text-sm font-medium">Payment failed.</span>
      {errorMsg && <span className="text-xs">{errorMsg}</span>}
      <Button variant="secondary" size="sm" onClick={() => setStep('idle')}>
        Try again
      </Button>
    </div>
  )
}
