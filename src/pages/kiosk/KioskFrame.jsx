import { ArrowLeft, X } from 'lucide-react'

// Common kiosk frame: header with optional back arrow, contextual chip,
// and a cancel/restart button on the right.

export default function KioskFrame({
  onBack,
  onExit,
  step,
  contextChip,
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
                <span className="font-display text-xl font-extrabold leading-none">D</span>
              </div>
              <div>
                <div className="font-display text-xl font-extrabold leading-none">DineFlow</div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-brand-600">Self order</div>
              </div>
            </div>
          )}
        </div>
        {contextChip}
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            aria-label="Cancel and start over"
            className="touch-target inline-flex items-center justify-center rounded-2xl bg-surface-100 px-4 text-sm font-semibold text-ink-700 transition active:scale-[0.97] hover:bg-status-cancelled/12 hover:text-status-cancelled"
          >
            <X className="h-5 w-5" />
            <span className="ml-1.5 hidden md:inline">Cancel</span>
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
