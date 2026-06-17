import { useEffect, useState } from 'react'
import { Sparkles, TicketPercent, Check, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSettings } from '../lib/SettingsContext'
import { Button, Input } from './ui'
import PhoneField from './PhoneField'

// One reusable checkout block: phone capture (when loyalty is on), points
// balance + redeem toggle (1 pt = ₹1), and coupon validation against the
// server-side validate_coupon RPC. Channels (web, kiosk, desk) read these
// values back via the onChange callback and pass them into their respective
// order-creation entrypoints — never trust the client value alone.

export default function CheckoutAdjustments({
  phone,
  onPhoneChange,
  subtotal,
  showPhoneField = true,
  phoneRequired = false,
  kiosk = false,
  onChange,
}) {
  const settings = useSettings()
  const loyaltyOn = settings.loyaltyEnabled
  const phoneValid = /^\d{10}$/.test(phone ?? '')

  const [pointsBalance, setPointsBalance] = useState(0)
  const [pointsLoading, setPointsLoading] = useState(false)
  const [redeem, setRedeem] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [couponCode, setCouponCode] = useState(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponError, setCouponError] = useState('')
  const [couponBusy, setCouponBusy] = useState(false)

  // Fetch live points whenever the phone becomes valid.
  useEffect(() => {
    if (!loyaltyOn || !phoneValid) {
      setPointsBalance(0)
      setRedeem(false)
      return undefined
    }
    let cancelled = false
    setPointsLoading(true)
    supabase
      .rpc('get_loyalty_points', { p_phone: phone })
      .then(({ data }) => { if (!cancelled) setPointsBalance(Number(data ?? 0)) })
      .finally(() => { if (!cancelled) setPointsLoading(false) })
    return () => { cancelled = true }
  }, [phone, phoneValid, loyaltyOn])

  // Re-validate any applied coupon when the cart changes.
  useEffect(() => {
    if (!couponCode) return
    let cancelled = false
    supabase
      .rpc('validate_coupon', { p_code: couponCode, p_order_total: subtotal })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setCouponCode(null)
          setCouponDiscount(0)
          setCouponError(error.message)
          return
        }
        setCouponDiscount(Number(data ?? 0))
      })
    return () => { cancelled = true }
  }, [subtotal, couponCode])

  const maxRedeemable = Math.max(
    0,
    Math.min(pointsBalance, Math.floor(subtotal - couponDiscount) - 1),
  )
  const pointsToRedeem = redeem ? maxRedeemable : 0
  const pointsDiscount = pointsToRedeem
  const payable = Math.max(0, subtotal - couponDiscount - pointsDiscount)

  // Push the current adjustments upstream every time anything changes.
  useEffect(() => {
    onChange?.({
      pointsToRedeem,
      couponCode,
      couponDiscount,
      pointsDiscount,
      totalDiscount: couponDiscount + pointsDiscount,
      payable,
    })
    // The callback shape is stable; we intentionally don't include onChange
    // in deps to avoid re-firing on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsToRedeem, couponCode, couponDiscount, pointsDiscount, payable])

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setCouponBusy(true)
    setCouponError('')
    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: code,
      p_order_total: subtotal,
    })
    setCouponBusy(false)
    if (error) {
      setCouponCode(null)
      setCouponDiscount(0)
      setCouponError(error.message)
      return
    }
    setCouponCode(code)
    setCouponDiscount(Number(data ?? 0))
  }

  function clearCoupon() {
    setCouponInput('')
    setCouponCode(null)
    setCouponDiscount(0)
    setCouponError('')
  }

  return (
    <div className="space-y-4">
      {showPhoneField && loyaltyOn && (
        <PhoneField
          value={phone ?? ''}
          onChange={onPhoneChange}
          required={phoneRequired}
          kiosk={kiosk}
        />
      )}

      {loyaltyOn && (
        <div className="rounded-2xl bg-surface-0 p-4 ring-1 ring-inset ring-surface-line">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-600" />
              <h3 className="font-display text-sm font-extrabold text-ink-900">Loyalty points</h3>
            </div>
            <span className="rounded-md bg-surface-100 px-2 py-0.5 font-mono text-xs font-bold tabular-nums text-ink-800">
              {pointsLoading ? '…' : `${pointsBalance} pts`}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {!phoneValid
              ? 'Enter a 10-digit phone to see your balance.'
              : maxRedeemable === 0
                ? 'No points available to redeem on this order.'
                : `Redeem up to ${maxRedeemable} pts (1 pt = ₹1).`}
          </p>
          {phoneValid && maxRedeemable > 0 && (
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink-800">
              <input
                type="checkbox"
                checked={redeem}
                onChange={(e) => setRedeem(e.target.checked)}
                className="h-4 w-4 accent-brand-500"
              />
              Use {maxRedeemable} pts (−₹{maxRedeemable.toLocaleString('en-IN')})
            </label>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-surface-0 p-4 ring-1 ring-inset ring-surface-line">
        <div className="flex items-center gap-2">
          <TicketPercent className="h-4 w-4 text-emerald-600" />
          <h3 className="font-display text-sm font-extrabold text-ink-900">Coupon code</h3>
        </div>
        {couponCode ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-inset ring-emerald-200">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <Check className="h-4 w-4" />
              <span className="font-mono">{couponCode}</span>
              <span className="text-emerald-700">−₹{couponDiscount.toLocaleString('en-IN')}</span>
            </span>
            <button
              type="button"
              onClick={clearCoupon}
              className="text-xs font-semibold text-emerald-800 underline-offset-2 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <Input
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="Enter code"
              aria-label="Coupon code"
            />
            <Button variant="secondary" busy={couponBusy} onClick={applyCoupon} disabled={!couponInput.trim()}>
              Apply
            </Button>
          </div>
        )}
        {couponError && (
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-status-cancelled">
            <AlertCircle className="h-3 w-3" />
            {couponError}
          </p>
        )}
      </div>
    </div>
  )
}
