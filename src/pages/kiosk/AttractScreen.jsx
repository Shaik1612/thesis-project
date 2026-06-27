import { Hand } from 'lucide-react'

// Clean kiosk start screen with one clear action.

export default function AttractScreen({ onStart }) {
  return (
    <button
      type="button"
      onClick={onStart}
      className="group flex h-full w-full flex-col items-center justify-center bg-surface-50 px-8 text-center transition-transform active:scale-[0.995]"
      aria-label="Tap anywhere to start ordering"
    >
      <div className="flex max-w-3xl flex-col items-center gap-8">
        <div>
          <h1 className="font-display text-6xl font-extrabold tracking-tight text-ink-900">
            POETRY CAFE
          </h1>
          <p className="mt-3 text-2xl font-semibold text-ink-500">
            Self order kiosk
          </p>
        </div>
        <div className="mt-4 inline-flex items-center gap-4 rounded-2xl bg-brand-500 px-10 py-5 text-white shadow-brand transition-transform group-hover:-translate-y-0.5 group-active:translate-y-0">
          <Hand className="h-7 w-7" />
          <span className="font-display text-3xl font-extrabold tracking-tight">
            Tap to order
          </span>
        </div>
      </div>
    </button>
  )
}
