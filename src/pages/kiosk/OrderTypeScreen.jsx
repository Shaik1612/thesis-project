import { ShoppingBag, Utensils } from 'lucide-react'

const OPTIONS = [
  {
    value: 'dine_in',
    label: 'Dine in',
    sub:   'Eat at a table',
    Icon:  Utensils,
    accent: 'from-brand-400 to-brand-600',
  },
  {
    value: 'takeaway',
    label: 'Takeaway',
    sub:   'Pack to go',
    Icon:  ShoppingBag,
    accent: 'from-amber-300 to-brand-500',
  },
]

export default function OrderTypeScreen({ onPick }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center px-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_30%,rgba(255,228,209,0.45),transparent_70%)]" />
      <div className="flex w-full max-w-5xl flex-col items-center gap-12">
        <div className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Step 1 of 4</p>
          <h2 className="text-balance font-display text-5xl font-extrabold tracking-tight text-ink-900">
            How are you eating today?
          </h2>
          <p className="text-lg text-ink-600">Pick one to start your order.</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
          {OPTIONS.map(({ value, label, sub, Icon, accent }) => (
            <button
              key={value}
              type="button"
              onClick={() => onPick(value)}
              className={[
                'group relative flex h-72 flex-col justify-between overflow-hidden rounded-3xl bg-surface-0 p-10 text-left',
                'ring-1 ring-inset ring-surface-line shadow-md transition-all',
                'active:scale-[0.98] hover:-translate-y-1 hover:shadow-lg hover:ring-brand-500',
              ].join(' ')}
            >
              <div
                aria-hidden
                className={[
                  'absolute -right-12 -top-12 h-56 w-56 rounded-full bg-gradient-to-br opacity-25 blur-2xl transition-opacity group-hover:opacity-40',
                  accent,
                ].join(' ')}
              />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-soft text-brand-600 ring-1 ring-inset ring-brand-100">
                <Icon className="h-10 w-10" />
              </div>
              <div className="relative">
                <div className="font-display text-4xl font-extrabold tracking-tight text-ink-900">
                  {label}
                </div>
                <div className="mt-1 text-base text-ink-600">{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
