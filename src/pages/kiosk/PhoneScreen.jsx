import { Sparkles } from 'lucide-react'
import { Button, Keypad } from '../../components/ui'

export default function PhoneScreen({ phone, onPhoneChange, onSkip, onContinue }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center px-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_30%,rgba(255,228,209,0.55),transparent_70%)]" />
      <div className="mx-auto grid w-full max-w-5xl gap-12 md:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col justify-center gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            Loyalty
          </span>
          <h2 className="text-balance font-display text-5xl font-extrabold tracking-tight text-ink-900">
            Earn points on this order.
          </h2>
          <p className="text-pretty text-lg text-ink-600">
            Enter your mobile number to collect loyalty points. We&apos;ll text you when your order is ready.
            Skip if you&apos;d rather stay anonymous.
          </p>
          <div className="rounded-3xl bg-surface-0 px-6 py-5 ring-1 ring-inset ring-surface-line shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">Your number</p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-display text-2xl font-bold text-ink-500">+91</span>
              <span className="font-display text-4xl font-extrabold tabular-nums text-ink-900">
                {phone.padEnd(10, '·')}
              </span>
            </div>
            <p className="mt-2 text-xs text-ink-500">10-digit Indian mobile</p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="outline" size="xl" onClick={onSkip}>
              Skip for now
            </Button>
            <Button
              variant="hero"
              size="xl"
              disabled={phone.length > 0 && phone.length < 10}
              onClick={onContinue}
            >
              Continue
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center">
          <Keypad
            value={phone}
            onChange={(v) => onPhoneChange(v.replace(/\D/g, '').slice(0, 10))}
            allowDecimal={false}
            className="w-full max-w-sm"
          />
        </div>
      </div>
    </div>
  )
}
