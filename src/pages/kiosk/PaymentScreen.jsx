import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, QrCode, ReceiptText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { MoneyText } from '../../components/ui'
import CheckoutAdjustments from '../../components/CheckoutAdjustments'
import OrderSummary from '../../components/OrderSummary'

// Kiosk checkout uses a local UPI QR confirmation flow instead of Razorpay.

const UPI_ID = 'poetrycafe@upi'
const UPI_PAYEE_NAME = 'POETRY CAFE'

export default function PaymentScreen({ cart, phone, orderType, onConfirmed, items = [], gstRate }) {
  const [adjustments, setAdjustments] = useState({
    pointsToRedeem: 0,
    couponCode: null,
    couponDiscount: 0,
    pointsDiscount: 0,
    totalDiscount: 0,
    payable: cart.grandTotal,
  })
  const payable = adjustments.payable > 0 || adjustments.totalDiscount > 0
    ? adjustments.payable
    : cart.grandTotal
  const [paymentStep, setPaymentStep] = useState('idle')

  useEffect(() => {
    if (paymentStep !== 'waiting') return undefined
    let cancelled = false
    const successTimer = window.setTimeout(async () => {
      try {
        await createKioskOrder({
          cart,
          phone,
          orderType,
          pointsToRedeem: adjustments.pointsToRedeem,
          couponCode: adjustments.couponCode,
        })
      } catch (e) {
        console.error('Kiosk order creation failed:', e)
      }
      if (!cancelled) setPaymentStep('success')
    }, 8500)
    return () => {
      cancelled = true
      window.clearTimeout(successTimer)
    }
  }, [adjustments.couponCode, adjustments.pointsToRedeem, cart, orderType, paymentStep, phone])

  useEffect(() => {
    if (paymentStep !== 'success') return undefined
    const doneTimer = window.setTimeout(() => onConfirmed?.(), 1400)
    return () => window.clearTimeout(doneTimer)
  }, [paymentStep, onConfirmed])

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface-100 px-6 py-5 lg:px-8">
      <div className="mx-auto h-full w-full max-w-5xl">
        <div className="flex min-h-0 flex-col gap-4">
          <section className="rounded-[24px] bg-white p-5 shadow-sm">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-ink-500">To pay</p>
                <MoneyText
                  amount={payable}
                  className="mt-1 block font-display text-6xl font-extrabold leading-none tracking-normal text-ink-900"
                />
              </div>
              <div className="text-right text-base font-semibold text-ink-500">
                <div>{cart.totalItems} item{cart.totalItems === 1 ? '' : 's'}</div>
              </div>
            </div>
            {adjustments.totalDiscount > 0 && (
              <p className="mt-3 text-base font-semibold text-emerald-700">
                You saved ₹{adjustments.totalDiscount.toLocaleString('en-IN')}
              </p>
            )}
          </section>

          <section className="rounded-[24px] bg-white p-5 shadow-sm">
            <h2 className="font-display text-2xl font-extrabold text-ink-900">Offers</h2>
            <div className="mt-4">
              <CheckoutAdjustments
                phone={phone}
                onPhoneChange={() => { /* phone is captured on the previous screen */ }}
                subtotal={cart.grandTotal}
                showPhoneField={false}
                showHints={false}
                onChange={setAdjustments}
              />
            </div>
          </section>

          <section className="min-h-0 flex-1 rounded-[24px] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ReceiptText className="h-6 w-6 text-ink-500" />
                <h2 className="font-display text-2xl font-extrabold text-ink-900">Summary</h2>
              </div>
              <MoneyText amount={payable} className="font-display text-2xl font-extrabold leading-none text-ink-900" />
            </div>
            <div className="max-h-[30vh] overflow-y-auto pr-1 scrollbar-thin">
              <OrderSummary cart={cart} menuItems={items} gstRate={gstRate} stepperSize="sm" showClear={false} hideTax />
            </div>
            <button
              type="button"
              onClick={() => setPaymentStep('waiting')}
              disabled={cart.items.length === 0}
              className="mt-5 inline-flex h-16 w-full items-center justify-center rounded-2xl bg-emerald-600 px-8 text-xl font-extrabold text-white shadow-sm ring-1 ring-emerald-700/25 transition active:scale-[0.98] active:bg-emerald-800 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-ink-400 disabled:shadow-none disabled:ring-0"
            >
              Pay
            </button>
          </section>
        </div>
      </div>

      {paymentStep !== 'idle' && (
        <UpiQrOverlay
          step={paymentStep}
          amount={payable}
          onClose={() => setPaymentStep('idle')}
        />
      )}
    </div>
  )
}

async function createKioskOrder({ cart, phone, orderType, pointsToRedeem, couponCode }) {
  const phoneDigits = /^\d{10}$/.test(phone ?? '') ? phone : null
  const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
    body: {
      items: cart.items.map((i) => ({
        menu_item_id:   i.menuItemId,
        quantity:       i.quantity,
        variant_id:     i.variantId ?? null,
        customizations: i.customizations ?? {},
      })),
      channel: 'kiosk',
      customer_phone: phoneDigits,
      order_type: orderType,
      loyalty_points_to_redeem: phoneDigits ? pointsToRedeem : 0,
      coupon_code: couponCode,
    },
  })
  if (error) throw new Error(error.message)
  if (!data?.razorpay_order_id) throw new Error('payment order was not created')

  const { error: confirmError } = await supabase.functions.invoke('razorpay-webhook', {
    body: { __simulate: true, razorpay_order_id: data.razorpay_order_id },
  })
  if (confirmError) throw new Error(confirmError.message)
}

function UpiQrOverlay({ step, amount, onClose }) {
  const upiUri = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_PAYEE_NAME)}&am=${encodeURIComponent(amount.toFixed(2))}&cu=INR&tn=${encodeURIComponent('Kiosk order')}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(upiUri)}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/55 px-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 text-center shadow-xl">
        {step === 'waiting' ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-700">
              <QrCode className="h-8 w-8" />
            </div>
            <h2 className="font-display text-3xl font-extrabold text-ink-900">Scan to pay</h2>
            <p className="mt-1 text-sm font-semibold text-ink-500">Use any UPI app</p>
            <div className="mx-auto mt-5 flex h-64 w-64 items-center justify-center rounded-3xl bg-white p-4 ring-1 ring-surface-line">
              <img
                src={qrUrl}
                alt={`UPI QR code for ${UPI_PAYEE_NAME}`}
                className="h-full w-full rounded-xl object-contain"
              />
            </div>
            <p className="mt-3 font-mono text-xs font-semibold text-ink-500">{UPI_ID}</p>
            <MoneyText amount={amount} className="mt-5 block font-display text-3xl font-extrabold text-ink-900" />
            <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-ink-500">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              Waiting for payment...
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 text-sm font-semibold text-ink-500 hover:text-ink-900"
            >
              Cancel
            </button>
          </>
        ) : (
          <div className="py-8">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
            <h2 className="mt-4 font-display text-3xl font-extrabold text-ink-900">Payment successful</h2>
            <p className="mt-2 text-sm font-semibold text-ink-500">Preparing your order now.</p>
          </div>
        )}
      </div>
    </div>
  )
}
