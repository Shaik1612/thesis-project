import { forwardRef, useId } from 'react'

const SIZE = {
  sm:    { wrap: 'h-9  text-sm   rounded-lg',  pad: 'px-3', icon: 'h-4 w-4' },
  md:    { wrap: 'h-11 text-base rounded-lg',  pad: 'px-3', icon: 'h-4 w-4' },
  lg:    { wrap: 'h-14 text-lg   rounded-xl',  pad: 'px-4', icon: 'h-5 w-5' },
  kiosk: { wrap: 'h-16 text-xl   rounded-2xl', pad: 'px-5', icon: 'h-6 w-6' },
}

const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    // Back-compat: `kiosk` boolean still works. New: explicit `size`.
    kiosk = false,
    size,
    prefix = null,
    suffix = null,
    id,
    className = '',
    wrapperClassName = '',
    required = false,
    ...rest
  },
  ref,
) {
  const generated = useId()
  const inputId = id ?? rest.name ?? generated
  const sz = SIZE[size] ?? (kiosk ? SIZE.kiosk : SIZE.md)
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

  const hasPrefix = prefix != null
  const hasSuffix = suffix != null

  return (
    <div className={['flex flex-col gap-1.5', wrapperClassName].join(' ')}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
          {label}
          {required && <span aria-hidden className="ml-0.5 text-status-cancelled">*</span>}
        </label>
      )}
      <div
        className={[
          'relative flex items-center gap-2 bg-surface-100',
          'ring-1 ring-inset ring-transparent transition-shadow',
          'focus-within:bg-surface-0 focus-within:ring-brand-500 focus-within:shadow-glow',
          error ? 'ring-status-cancelled/40 bg-status-cancelled/5' : '',
          sz.wrap,
          sz.pad,
          className,
        ].join(' ')}
      >
        {hasPrefix && (
          <span className={['flex shrink-0 items-center text-ink-500', sz.icon].join(' ')}>
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={[
            'min-w-0 flex-1 bg-transparent font-body text-ink-900',
            'placeholder:text-ink-400 focus:outline-none',
          ].join(' ')}
          {...rest}
        />
        {hasSuffix && (
          <span className={['flex shrink-0 items-center text-ink-500', sz.icon].join(' ')}>
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <span id={`${inputId}-error`} className="text-xs font-medium text-status-cancelled">
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="text-xs text-ink-500">
          {hint}
        </span>
      ) : null}
    </div>
  )
})

export default Input
