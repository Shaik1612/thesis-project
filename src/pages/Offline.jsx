import { WifiOff } from 'lucide-react'

export default function Offline() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface-50 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-100 text-ink-400">
        <WifiOff className="h-8 w-8" />
      </div>
      <h1 className="font-display text-2xl font-bold text-ink-900">You're offline</h1>
      <p className="max-w-sm text-base text-ink-600">
        You can browse the menu, but ordering needs an internet connection.
      </p>
    </div>
  )
}
