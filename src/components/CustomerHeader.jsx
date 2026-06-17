import { ShoppingBag } from 'lucide-react'
import { MoneyText } from './ui'

// Shared sticky header for customer-facing surfaces (QR menu, web order,
// status page). Renders the restaurant brand, a contextual subtitle (e.g.
// "Table 14" or "Takeaway"), and an optional cart pill that opens the
// summary sheet.

export default function CustomerHeader({
  restaurantName = 'DineFlow',
  subtitle,
  // When provided, renders the cart pill bottom-right of the header.
  cart,
  onCartClick,
  // Optional right-side slot (replaces the cart pill).
  right,
  // Optional thin status row beneath the title.
  status,
  className = '',
}) {
  return (
    <header
      className={[
        'sticky top-0 z-30 border-b border-surface-line bg-surface-0/90 backdrop-blur safe-top',
        className,
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-hot text-white shadow-brand">
          <span className="font-display text-lg font-extrabold leading-none">
            {restaurantName.slice(0, 1)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base font-bold leading-tight text-ink-900">
            {restaurantName}
          </div>
          {subtitle && (
            <div className="mt-0.5 truncate text-xs font-medium uppercase tracking-wide text-ink-500">
              {subtitle}
            </div>
          )}
        </div>
        {right ? (
          right
        ) : cart && cart.totalItems > 0 ? (
          <button
            type="button"
            onClick={onCartClick}
            className="group inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-brand transition-transform active:scale-[0.97]"
            aria-label={`Open cart with ${cart.totalItems} items`}
          >
            <span className="relative inline-flex">
              <ShoppingBag className="h-4 w-4" />
              <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-white px-1 text-[10px] font-extrabold tabular-nums text-brand-600">
                {cart.totalItems}
              </span>
            </span>
            <MoneyText amount={cart.subtotal} className="tabular-nums" />
          </button>
        ) : null}
      </div>
      {status && (
        <div className="mx-auto max-w-3xl px-4 pb-2 text-xs text-ink-600">{status}</div>
      )}
    </header>
  )
}
