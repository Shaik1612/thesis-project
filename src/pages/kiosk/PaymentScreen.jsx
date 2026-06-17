import { useState } from 'react'
import { ShieldCheck, Smartphone } from 'lucide-react'
import { MoneyText } from '../../components/ui'
import UpiPaymentFlow from '../../components/UpiPaymentFlow'
import CheckoutAdjustments from '../../components/CheckoutAdjustments'

// Kiosk checkout: large amount-due card on the left, embedded UPI flow on the
// right. CheckoutAdjustments sits above the UPI button so a guest who entered
// their phone on the previous step can redeem points or apply a coupon.

export default function PaymentScreen({ cart, phone, orderType, onConfirmed }) {
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

  return (
    <div className="relative flex h-full w-full items-center justify-center px-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_30%,rgba(255,228,209,0.45),transparent_70%)]" />
      <div className="mx-auto grid w-full max-w-5xl gap-10 md:grid-cols-[1fr_1fr]">
        <div className="flex flex-col justify-center gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure UPI
          </span>
          <div>
            <p className="text-base text-ink-600">Total to pay</p>
            <MoneyText
              amount={payable}
              className="block font-display text-7xl font-extrabold leading-none tracking-tighter text-ink-900"
            />
            {adjustments.totalDiscount > 0 && (
              <p className="mt-1 text-sm font-semibold text-emerald-700">
                You saved ₹{adjustments.totalDiscount.toLocaleString('en-IN')}
              </p>
            )}
          </div>
          <CheckoutAdjustments
            phone={phone}
            onPhoneChange={() => { /* phone is captured on the previous screen */ }}
            subtotal={cart.grandTotal}
            showPhoneField={false}
            onChange={setAdjustments}
          />
          <p className="flex items-center gap-2 text-xs text-ink-500">
            <Smartphone className="h-3.5 w-3.5" />
            Use any UPI app on your phone — nothing is charged to this kiosk.
          </p>
        </div>
        <div className="flex flex-col justify-center">
          <div className="rounded-3xl bg-surface-0 p-6 ring-1 ring-inset ring-surface-line shadow-md">
            <UpiPaymentFlow
              cart={cart}
              channel="kiosk"
              orderType={orderType}
              phone={phone || null}
              amount={payable}
              loyaltyPointsToRedeem={adjustments.pointsToRedeem}
              couponCode={adjustments.couponCode}
              onConfirmed={onConfirmed}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
