import { useEffect, useRef } from 'react'

// Tabs primitive driven by a parent `value` + `onChange`.
// Three visual variants:
//   - `segmented` (default): rounded pill group, brand-filled active tab.
//   - `underline`: text labels with an underline indicator under the active tab.
//   - `pill`: rounded chips with subtle background. Good for filter rows.
//
// Two layouts:
//   - `horizontal` (default): scrollable on overflow with snap.
//   - `vertical`: stacked rail (used by kiosk category sidebar).
//
// Items: array of { value, label, icon?, count?, disabled? }.
//
// Selected tab is centered on change (horizontal layouts) so the active tab
// is always visible — important for long category strips on mobile.

const SIZES = {
  sm: { btn: 'h-8 px-3 text-sm gap-1.5', icon: 'h-4 w-4', count: 'text-[10px] px-1.5' },
  md: { btn: 'h-10 px-4 text-sm gap-2',   icon: 'h-4 w-4', count: 'text-xs px-2' },
  lg: { btn: 'h-12 px-5 text-base gap-2', icon: 'h-5 w-5', count: 'text-xs px-2' },
  // Kiosk uses lg in horizontal mode; vertical mode handles its own sizing.
}

export default function Tabs({
  items,
  value,
  onChange,
  variant = 'segmented',
  orientation = 'horizontal',
  size = 'md',
  fullWidth = false,
  ariaLabel,
  className = '',
}) {
  const sz = SIZES[size] ?? SIZES.md
  const listRef = useRef(null)

  useEffect(() => {
    if (orientation !== 'horizontal' || !listRef.current) return
    const active = listRef.current.querySelector('[data-active="true"]')
    if (active && 'scrollIntoView' in active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [value, orientation])

  if (orientation === 'vertical') {
    return (
      <ul
        ref={listRef}
        role="tablist"
        aria-orientation="vertical"
        aria-label={ariaLabel}
        className={['flex flex-col gap-1', className].join(' ')}
      >
        {items.map((it) => {
          const active = it.value === value
          return (
            <li key={it.value}>
              <button
                type="button"
                role="tab"
                aria-selected={active}
                data-active={active}
                disabled={it.disabled}
                onClick={() => onChange(it.value)}
                className={[
                  'group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-medium transition-colors',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  active
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-ink-700 hover:bg-surface-100',
                ].join(' ')}
              >
                {it.icon && <span className={['shrink-0', active ? 'text-white' : 'text-ink-500'].join(' ')}>{it.icon}</span>}
                <span className="min-w-0 flex-1 truncate">{it.label}</span>
                {it.count != null && (
                  <span className={[
                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                    active ? 'bg-white/20 text-white' : 'bg-surface-100 text-ink-600',
                  ].join(' ')}>
                    {it.count}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  const containerCls = variant === 'segmented'
    ? 'inline-flex gap-1 rounded-xl bg-surface-100 p-1 ring-1 ring-inset ring-surface-line/60'
    : variant === 'pill'
      ? 'inline-flex gap-2'
      : 'inline-flex gap-6 border-b border-surface-line'

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      className={[
        containerCls,
        'no-scrollbar overflow-x-auto snap-x snap-mandatory',
        fullWidth ? 'flex w-full' : '',
        className,
      ].join(' ')}
    >
      {items.map((it) => {
        const active = it.value === value
        const baseBtn = [
          'inline-flex items-center justify-center font-medium font-body whitespace-nowrap snap-start',
          'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
          sz.btn,
          fullWidth ? 'flex-1' : '',
        ]

        let visual = ''
        if (variant === 'segmented') {
          visual = active
            ? 'rounded-lg bg-surface-0 text-ink-900 shadow-sm ring-1 ring-inset ring-surface-line/70'
            : 'rounded-lg text-ink-600 hover:text-ink-900'
        } else if (variant === 'pill') {
          visual = active
            ? 'rounded-full bg-brand-500 text-white shadow-sm'
            : 'rounded-full bg-surface-100 text-ink-700 hover:bg-surface-150'
        } else {
          // underline
          visual = active
            ? 'relative text-ink-900 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-brand-500 after:content-[""]'
            : 'text-ink-500 hover:text-ink-900'
        }

        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            disabled={it.disabled}
            onClick={() => onChange(it.value)}
            className={[...baseBtn, visual].join(' ')}
          >
            {it.icon && <span className={sz.icon}>{it.icon}</span>}
            <span>{it.label}</span>
            {it.count != null && (
              <span className={[
                'rounded-full font-semibold tabular-nums',
                sz.count,
                active && variant === 'pill' ? 'bg-white/25 text-white' : 'bg-surface-150 text-ink-600',
              ].join(' ')}>
                {it.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
