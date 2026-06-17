export function formatMoney(amount) {
  if (amount == null || isNaN(amount)) return '₹0'
  const n = Number(amount)
  if (Number.isInteger(n)) return `₹${n.toLocaleString('en-IN')}`
  const fixed = n.toFixed(2)
  return fixed.endsWith('.00')
    ? `₹${Math.trunc(n).toLocaleString('en-IN')}`
    : `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function MoneyText({ amount, className = '', as: Tag = 'span' }) {
  return <Tag className={['num', className].join(' ')}>{formatMoney(amount)}</Tag>
}
