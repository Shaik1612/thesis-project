import { formatMoney } from './ui/MoneyText'

export function formatPrice(amount) {
  return formatMoney(amount)
}

export function calcGst(subtotal, gstRate = 5, gstInclusive = false) {
  const rate = Number(gstRate) || 0
  if (!subtotal) return { gstAmount: 0, grandTotal: 0 }
  if (gstInclusive) {
    const base = subtotal / (1 + rate / 100)
    return { gstAmount: subtotal - base, grandTotal: subtotal }
  }
  const gstAmount = subtotal * (rate / 100)
  return { gstAmount, grandTotal: subtotal + gstAmount }
}

export default function PriceDisplay({ amount, className = '' }) {
  return <span className={['num', className].join(' ')}>{formatMoney(amount)}</span>
}
