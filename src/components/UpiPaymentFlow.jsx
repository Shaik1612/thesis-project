import { useState } from 'react'
import { CheckCircle2, Smartphone, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button, MoneyText } from './ui'

const IS_DEV = import.meta.env.DEV
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID

function loadCheckoutScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload  = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

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
  const [step, setStep]               = useState('idle')
  const [razorpayOrderId, setRazorpayOrderId] = useState('')
  const [errorMsg, setErrorMsg]       = useState('')

  async function initiate() {
    setStep('creating')
    setErrorMsg('')
    try {
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          items: cart.items.map((i) => ({
            menu_item_id:   i.menuItemId,
            quantity:       i.quantity,
            variant_id:     i.variantId ?? null,
            customizations: i.customizations ?? {},
          })),
          channel,
          customer_phone:           phone ?? null,
          order_type:               orderType,
          loyalty_points_to_redeem: loyaltyPointsToRedeem,
          coupon_code:              couponCode,
        },
      })
      if (error) throw new Error(error.message)
      if (!data?.razorpay_order_id) throw new Error('no order id returned')

      setRazorpayOrderId(data.razorpay_order_id)

      if (IS_DEV) {
        setStep('waiting')
        return
      }

      // Production: Razorpay Standard Checkout modal (works on desktop + mobile).
      const loaded = await loadCheckoutScript()
      if (!loaded) throw new Error('could not load payment module')
      const checkoutKey = RAZORPAY_KEY_ID || data.razorpay_key_id
      if (!checkoutKey) throw new Error('Razorpay key is not configured')

      const rzp = new window.Razorpay({
        key:      checkoutKey,
        amount:   data.amount_paise,
        currency: data.currency ?? 'INR',
        order_id: data.razorpay_order_id,
        name:     'DineFlow',
        handler:  (response) => handleCheckoutSuccess(response),
        prefill:  { contact: phone ?? '' },
        theme:    { color: '#EA580C' },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay using UPI',
                instruments: [{ method: 'upi' }],
              },
            },
            sequence: ['block.upi'],
            preferences: { show_default_blocks: true },
          },
        },
        modal: {
          ondismiss: () => {
            setStep((prev) => {
              if (prev !== 'waiting') return prev
              const message = 'Payment cancelled before completion'
              setErrorMsg(message)
              onError?.(message)
              return 'error'
            })
          },
        },
      })

      rzp.on('payment.failed', (response) => {
        const message = response.error?.description ?? response.error?.reason ?? 'Payment failed'
        setErrorMsg(message)
        setStep('error')
        onError?.(message)
      })

      setStep('waiting')
      rzp.open()
    } catch (e) {
      setErrorMsg(e.message)
      setStep('error')
      onError?.(e.message)
    }
  }

  async function handleCheckoutSuccess({ razorpay_payment_id, razorpay_order_id, razorpay_signature }) {
    setStep('creating')
    try {
      const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
        body: { razorpay_payment_id, razorpay_order_id, razorpay_signature },
      })
      if (error) throw new Error(error.message)
      if (!data?.order_id) throw new Error('verification failed')
      setStep('confirmed')
      onConfirmed?.()
    } catch (e) {
      setErrorMsg(e.message)
      setStep('error')
      onError?.(e.message)
    }
  }

  // Dev-only: bypass the real payment modal.
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
              Complete payment in the Razorpay window, then return here.
            </p>
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
