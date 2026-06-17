import { useId } from 'react'

// Accessible radio group. Each option renders as a tappable card; the native
// inputs are visually hidden but tab-reachable. The cards expand-on-select for
// nice visual feedback.

const SIZES = {
  sm: 'p-3 text-sm',
  md: 'p-4 text-sm',
  lg: 'p-5 text-base',
}

export default function RadioGroup({
  name,
  value,
  onChange,
  options = [],
  size = 'md',
  orientation = 'vertical',
  className = '',
  ariaLabel,
}) {
  const generated = useId()
  const groupName = name ?? generated

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={[
        orientation === 'horizontal' ? 'flex flex-wrap gap-2' : 'flex flex-col gap-2',
        className,
      ].join(' ')}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        const inputId = `${groupName}-${opt.value}`
        return (
          <label
            key={opt.value}
            htmlFor={inputId}
            className={[
              'relative flex cursor-pointer items-start gap-3 rounded-2xl ring-1 ring-inset transition-all',
              SIZES[size] ?? SIZES.md,
              selected
                ? 'bg-brand-soft ring-brand-500 shadow-sm'
                : 'bg-surface-0 ring-surface-line hover:ring-ink-400',
              opt.disabled ? 'cursor-not-allowed opacity-50' : '',
            ].join(' ')}
          >
            <input
              type="radio"
              id={inputId}
              name={groupName}
              value={opt.value}
              checked={selected}
              disabled={opt.disabled}
              onChange={() => onChange?.(opt.value)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={[
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-colors',
                selected ? 'ring-brand-500' : 'ring-surface-line',
              ].join(' ')}
            >
              <span
                className={[
                  'h-2.5 w-2.5 rounded-full transition-transform',
                  selected ? 'scale-100 bg-brand-500' : 'scale-0 bg-transparent',
                ].join(' ')}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-ink-900">{opt.label}</span>
              {opt.hint && <span className="mt-0.5 block text-xs text-ink-600">{opt.hint}</span>}
            </span>
            {opt.right && <span className="shrink-0 self-center text-sm font-medium text-ink-700">{opt.right}</span>}
          </label>
        )
      })}
    </div>
  )
}
