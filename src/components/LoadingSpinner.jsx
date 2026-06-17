import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ fullscreen = false, label }) {
  if (fullscreen) {
    return (
      <div className="flex h-full min-h-screen w-full flex-col items-center justify-center gap-3 bg-surface-50">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        {label && <span className="text-sm text-ink-600">{label}</span>}
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center gap-2 py-6">
      <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
      {label && <span className="text-sm text-ink-600">{label}</span>}
    </div>
  )
}
