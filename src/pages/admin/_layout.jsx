// Admin shell helpers used by every admin page. Backward-compatible — every
// previous export still exists with the same signature. The visual layer was
// upgraded in Phase 4 of the design refresh.

export function AdminPage({ title, subtitle, action, breadcrumbs, children, maxWidth = 'max-w-7xl' }) {
  return (
    <div className={`mx-auto ${maxWidth} px-8 py-8`}>
      <header className="flex flex-col gap-3 pb-6">
        {breadcrumbs && <div className="text-xs text-ink-500">{breadcrumbs}</div>}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-ink-600">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>
      <div className="space-y-6">{children}</div>
    </div>
  )
}

export function AdminCard({ title, action, children, className = '', padding = 'p-5' }) {
  return (
    <section className={['rounded-2xl bg-surface-0 ring-1 ring-inset ring-surface-line shadow-sm', className].join(' ')}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-surface-line px-5 py-3">
          {title && <h3 className="font-display text-base font-bold tracking-tight text-ink-900">{title}</h3>}
          {action}
        </header>
      )}
      <div className={padding}>{children}</div>
    </section>
  )
}

export function StatCard({ label, value, hint, tone = 'default', icon = null, trend = null }) {
  const accent =
    tone === 'good'  ? 'text-status-ready' :
    tone === 'bad'   ? 'text-status-cancelled' :
    tone === 'brand' ? 'text-brand-700' : 'text-ink-900'
  const iconBg =
    tone === 'good'  ? 'bg-status-ready/12  text-status-ready' :
    tone === 'bad'   ? 'bg-status-cancelled/12 text-status-cancelled' :
    tone === 'brand' ? 'bg-brand-soft text-brand-700' :
                       'bg-surface-100 text-ink-600'
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-0 p-5 ring-1 ring-inset ring-surface-line shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">{label}</div>
          <div className={['mt-1 font-display text-3xl font-extrabold tabular-nums leading-tight', accent].join(' ')}>{value}</div>
          {hint && <div className="mt-1 text-xs text-ink-600">{hint}</div>}
        </div>
        {icon && (
          <span className={['flex h-10 w-10 items-center justify-center rounded-2xl', iconBg].join(' ')}>{icon}</span>
        )}
      </div>
      {trend != null && (
        <div className="absolute inset-x-0 -bottom-1 h-12 opacity-90">{trend}</div>
      )}
    </div>
  )
}

// AdminTable is kept for compatibility — new pages should use the design-system
// DataTable primitive directly. This is a thin styled wrapper.
export function AdminTable({ columns, rows, empty }) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl bg-surface-0 px-5 py-12 text-center text-sm text-ink-600 ring-1 ring-inset ring-surface-line">
        {empty ?? 'No data yet.'}
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-2xl bg-surface-0 ring-1 ring-inset ring-surface-line shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-surface-50 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={['px-4 py-3', c.align === 'right' ? 'text-right' : ''].join(' ')}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-line">
          {rows.map((r, ri) => (
            <tr key={r.id ?? ri} className="hover:bg-surface-50">
              {columns.map((c, ci) => (
                <td
                  key={ci}
                  className={[
                    'px-4 py-3',
                    c.align === 'right' ? 'text-right tabular-nums' : '',
                    c.className ?? '',
                  ].join(' ')}
                >
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint }) {
  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-150',
        checked ? 'bg-brand-500' : 'bg-surface-line',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-150 mt-0.5',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  )
  if (!label && !hint) return button
  return (
    <label className="flex items-start justify-between gap-4">
      <span className="min-w-0">
        {label && <span className="block text-sm font-medium text-ink-900">{label}</span>}
        {hint && <span className="mt-0.5 block text-xs text-ink-500">{hint}</span>}
      </span>
      {button}
    </label>
  )
}

export function FormRow({ label, hint, children, className = '' }) {
  return (
    <label className={['flex flex-col gap-1.5', className].join(' ')}>
      <span className="text-sm font-medium text-ink-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-500">{hint}</span>}
    </label>
  )
}

export function TextField(props) {
  return (
    <input
      {...props}
      className={[
        'h-10 w-full rounded-lg bg-surface-100 px-3 text-sm placeholder:text-ink-400',
        'ring-1 ring-inset ring-transparent transition-shadow',
        'focus:outline-none focus:bg-surface-0 focus:ring-brand-500',
        props.className ?? '',
      ].join(' ')}
    />
  )
}

export function Select(props) {
  return (
    <select
      {...props}
      className={[
        'h-10 w-full appearance-none rounded-lg bg-surface-100 px-3 text-sm',
        'ring-1 ring-inset ring-transparent transition-shadow',
        'focus:outline-none focus:bg-surface-0 focus:ring-brand-500',
        props.className ?? '',
      ].join(' ')}
    />
  )
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className={[
        'w-full rounded-lg bg-surface-100 px-3 py-2 text-sm placeholder:text-ink-400',
        'ring-1 ring-inset ring-transparent transition-shadow',
        'focus:outline-none focus:bg-surface-0 focus:ring-brand-500',
        props.className ?? '',
      ].join(' ')}
    />
  )
}

// SectionHeader — used by SettingsAdmin to group related settings.
export function SectionHeader({ title, subtitle, icon: Icon = null, action = null }) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-surface-line pb-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-soft text-brand-700">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
