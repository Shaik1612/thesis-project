import { Moon } from 'lucide-react'

export default function ClosedPage({
  title = "We're closed",
  message = 'This service is currently unavailable.',
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-50 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-100 text-ink-400">
        <Moon className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-display font-bold text-ink-900">{title}</h1>
      <p className="max-w-sm text-base text-ink-600">{message}</p>
    </div>
  )
}
