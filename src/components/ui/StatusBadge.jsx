// Token-driven status badge. Drives color from Tailwind's `status.*` palette
// (defined in tailwind.config.js) instead of duplicating hex values. Two
// visual variants:
//   - `solid` (default) — pill with tinted background, dot, and label
//   - `dot`             — just a colored dot + label, ideal for dense rows
//
// New `status` values can be added in one place: the TONE map below. The
// `paid` / `unpaid` aliases reuse the ready/cancelled tones since they are
// not first-class entries in the Tailwind palette.

const TONE = {
  pending:   { bg: 'bg-status-pending/12   ring-status-pending/20',   text: 'text-status-pending',   dot: 'bg-status-pending' },
  accepted:  { bg: 'bg-status-accepted/14  ring-status-accepted/20',  text: 'text-status-accepted',  dot: 'bg-status-accepted' },
  preparing: { bg: 'bg-status-preparing/15 ring-status-preparing/25', text: 'text-status-preparing', dot: 'bg-status-preparing' },
  ready:     { bg: 'bg-status-ready/15     ring-status-ready/25',     text: 'text-status-ready',     dot: 'bg-status-ready' },
  completed: { bg: 'bg-surface-100         ring-surface-line',        text: 'text-ink-600',          dot: 'bg-status-completed' },
  cancelled: { bg: 'bg-status-cancelled/12 ring-status-cancelled/20', text: 'text-status-cancelled', dot: 'bg-status-cancelled' },
  expired:   { bg: 'bg-surface-100         ring-surface-line',        text: 'text-ink-600',          dot: 'bg-status-expired' },
}

const ALIASES = {
  paid:   { tone: 'ready',     label: 'Paid' },
  unpaid: { tone: 'cancelled', label: 'Unpaid' },
}

const LABELS = {
  pending:   'Pending',
  accepted:  'Accepted',
  preparing: 'Preparing',
  ready:     'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired:   'Expired',
}

const SIZES = {
  sm: 'gap-1.5 px-2.5 py-0.5 text-[11px]',
  md: 'gap-1.5 px-3 py-1 text-xs',
  lg: 'gap-2 px-3.5 py-1.5 text-sm',
}

export default function StatusBadge({
  status,
  label,
  variant = 'solid',
  size = 'md',
  pulse = false,
  className = '',
}) {
  const alias = ALIASES[status]
  const toneKey = alias?.tone ?? status
  const tone = TONE[toneKey] ?? TONE.completed
  const text = label ?? alias?.label ?? LABELS[status] ?? status

  if (variant === 'dot') {
    return (
      <span className={['inline-flex items-center gap-2 text-sm text-ink-700', className].join(' ')}>
        <span
          className={[
            'h-2 w-2 rounded-full',
            tone.dot,
            pulse ? 'live-dot' : '',
          ].join(' ')}
          style={pulse ? { color: 'currentColor' } : undefined}
        />
        <span>{text}</span>
      </span>
    )
  }

  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-medium ring-1 ring-inset',
        tone.bg,
        tone.text,
        SIZES[size],
        className,
      ].join(' ')}
    >
      <span className={['h-1.5 w-1.5 rounded-full', tone.dot, pulse ? 'live-dot' : ''].join(' ')} />
      {text}
    </span>
  )
}
