import { ArrowLeft, ShoppingBag } from 'lucide-react'

const RESTAURANT_NAME = 'POETRY CAFE'

// Common kiosk frame: header with optional back arrow and cart access.

export default function KioskFrame({
  onBack,
  onCart,
  cartCount = 0,
  step,
  children,
}) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-50">
      <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-surface-line/70 bg-surface-0/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="touch-target-xl inline-flex items-center gap-2 rounded-2xl bg-surface-100 px-5 text-base font-semibold text-ink-700 transition active:scale-[0.97] hover:bg-surface-150"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-hot text-white shadow-brand">
                <span className="font-display text-xl font-extrabold leading-none">P</span>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-brand-600">Self order</div>
              </div>
            </div>
          )}
        </div>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center">
          <span className="font-display text-xl font-extrabold tracking-tight text-ink-900">{RESTAURANT_NAME}</span>
        </div>
        {onCart ? (
          <button
            type="button"
            onClick={onCart}
            aria-label={`Open cart with ${cartCount} items`}
            className="touch-target relative inline-flex items-center justify-center rounded-2xl bg-surface-100 px-4 text-ink-800 transition active:scale-[0.97] hover:bg-surface-150"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-extrabold text-white">
                {cartCount}
              </span>
            )}
          </button>
        ) : (
          <div />
        )}
      </header>
      <div data-kiosk-step={step} className="relative flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
