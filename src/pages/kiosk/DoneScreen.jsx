import { useEffect, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { Button } from '../../components/ui'

export default function DoneScreen({ orderType, onReset, autoResetSeconds = 12 }) {
  const [count, setCount] = useState(autoResetSeconds)
  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => {
        if (c <= 1) { clearInterval(id); onReset(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [onReset])

  return (
    <div className="relative flex h-full w-full items-center justify-center px-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_30%,rgba(220,252,231,0.7),transparent_70%)]" />
      <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-status-ready/20 animate-ping" />
          <span className="absolute inset-2 rounded-full bg-status-ready/30" />
          <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-status-ready text-white shadow-lg">
            <Check className="h-14 w-14" strokeWidth={3} />
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-status-ready">Payment received</p>
          <h2 className="mt-2 text-balance font-display text-5xl font-extrabold tracking-tight text-ink-900">
            Order on the way!
          </h2>
          <p className="mt-3 text-lg text-ink-600">
            {orderType === 'dine_in'
              ? 'A team member will bring your food to your table.'
              : 'We&apos;ll call you to the counter when it&apos;s ready.'}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-surface-0 px-4 py-2 text-sm text-ink-700 ring-1 ring-inset ring-surface-line">
          <Bell className="h-4 w-4 text-brand-500" />
          Returning home in <span className="ml-1 tabular-nums font-semibold text-ink-900">{count}s</span>
        </div>
        <Button variant="hero" size="xl" onClick={onReset}>
          Place another order
        </Button>
      </div>
    </div>
  )
}
