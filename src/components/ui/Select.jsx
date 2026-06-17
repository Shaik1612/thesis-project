import { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'

// Lightweight Select. Renders a styled native <select> so the OS picker is
// used on mobile (best a11y, free dark-mode handling) and the desktop visual
// matches our Input primitive.

const SIZE = {
  sm:    { wrap: 'h-9  text-sm   rounded-lg',  pad: 'pl-3 pr-9', icon: 'h-4 w-4' },
  md:    { wrap: 'h-11 text-base rounded-lg',  pad: 'pl-3 pr-9', icon: 'h-4 w-4' },
  lg:    { wrap: 'h-14 text-lg   rounded-xl',  pad: 'pl-4 pr-10', icon: 'h-5 w-5' },
  kiosk: { wrap: 'h-16 text-xl   rounded-2xl', pad: 'pl-5 pr-12', icon: 'h-6 w-6' },
}

const Select = forwardRef(function Select(
  {
    label,
    hint,
    error,
    options = [],
    value,
    onChange,
    placeholder,
    size = 'md',
    id,
    className = '',
    wrapperClassName = '',
    required = false,
    ...rest
  },
  ref,
) {
  const generated = useId()
  const selectId = id ?? rest.name ?? generated
  const sz = SIZE[size] ?? SIZE.md
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined

  return (
    <div className={['flex flex-col gap-1.5', wrapperClassName].join(' ')}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-ink-700">
          {label}
          {required && <span aria-hidden className="ml-0.5 text-status-cancelled">*</span>}
        </label>
      )}
      <div className={[
        'relative bg-surface-100 ring-1 ring-inset ring-transparent transition-shadow',
        'focus-within:bg-surface-0 focus-within:ring-brand-500 focus-within:shadow-glow',
        error ? 'ring-status-cancelled/40 bg-status-cancelled/5' : '',
        sz.wrap,
      ].join(' ')}>
        <select
          ref={ref}
          id={selectId}
          value={value ?? ''}
          onChange={onChange}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={[
            'h-full w-full appearance-none bg-transparent font-body text-ink-900',
            'focus:outline-none disabled:cursor-not-allowed disabled:text-ink-400',
            sz.pad,
            className,
          ].join(' ')}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className={['pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-500', sz.icon].join(' ')}
          aria-hidden
        />
      </div>
      {error ? (
        <span id={`${selectId}-error`} className="text-xs font-medium text-status-cancelled">
          {error}
        </span>
      ) : hint ? (
        <span id={`${selectId}-hint`} className="text-xs text-ink-500">
          {hint}
        </span>
      ) : null}
    </div>
  )
})

export default Select
