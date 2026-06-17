import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

// Inline, non-modal alert. Use for persistent context (e.g. "Cash is the only
// payment available at this counter") rather than transient feedback (use Toast).

const TONE = {
  info: {
    Icon: Info,
    container: 'bg-status-pending/8 ring-status-pending/25 text-ink-900',
    icon:      'text-status-pending',
  },
  success: {
    Icon: CheckCircle2,
    container: 'bg-status-ready/10 ring-status-ready/25 text-ink-900',
    icon:      'text-status-ready',
  },
  warning: {
    Icon: AlertTriangle,
    container: 'bg-status-preparing/12 ring-status-preparing/30 text-ink-900',
    icon:      'text-status-preparing',
  },
  error: {
    Icon: AlertCircle,
    container: 'bg-status-cancelled/10 ring-status-cancelled/30 text-ink-900',
    icon:      'text-status-cancelled',
  },
  neutral: {
    Icon: Info,
    container: 'bg-surface-100 ring-surface-line text-ink-900',
    icon:      'text-ink-600',
  },
}

export default function Alert({
  tone = 'info',
  title,
  children,
  action = null,
  onDismiss,
  icon,
  className = '',
}) {
  const t = TONE[tone] ?? TONE.info
  const Icon = icon ?? t.Icon

  return (
    <div
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className={[
        'flex items-start gap-3 rounded-2xl px-4 py-3 ring-1 ring-inset',
        t.container,
        className,
      ].join(' ')}
    >
      <span className={['mt-0.5 shrink-0', t.icon].join(' ')}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        {title && <div className="text-sm font-semibold leading-tight">{title}</div>}
        {children && (
          <div className={['text-sm text-ink-700', title ? 'mt-0.5' : ''].join(' ')}>
            {children}
          </div>
        )}
        {action && <div className="mt-2 flex flex-wrap gap-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-0.5 shrink-0 rounded-full p-1 text-ink-500 transition hover:bg-black/5 hover:text-ink-900"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
