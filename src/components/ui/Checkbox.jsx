import { forwardRef, useId } from 'react'
import { Check, Minus } from 'lucide-react'

// Custom checkbox with a hidden native input for accessibility. Click target
// is the whole label row; the box is decorative.

const SIZE = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

const Checkbox = forwardRef(function Checkbox(
  {
    label,
    hint,
    checked,
    indeterminate = false,
    onChange,
    size = 'md',
    disabled,
    id,
    className = '',
    ...rest
  },
  ref,
) {
  const generated = useId()
  const inputId = id ?? rest.name ?? generated
  const boxSize = SIZE[size] ?? SIZE.md

  return (
    <label
      htmlFor={inputId}
      className={[
        'group inline-flex items-start gap-3 select-none',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      ].join(' ')}
    >
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked, e)}
        className="sr-only"
        {...rest}
      />
      <span
        aria-hidden
        className={[
          'mt-0.5 flex shrink-0 items-center justify-center rounded-md ring-1 ring-inset transition-colors',
          checked || indeterminate
            ? 'bg-brand-500 ring-brand-600 text-white'
            : 'bg-surface-0 ring-surface-line group-hover:ring-ink-400',
          'group-focus-within:ring-2 group-focus-within:ring-brand-500 group-focus-within:ring-offset-2 group-focus-within:ring-offset-surface-50',
          boxSize,
        ].join(' ')}
      >
        {indeterminate ? (
          <Minus className="h-3.5 w-3.5" strokeWidth={3} />
        ) : checked ? (
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        ) : null}
      </span>
      {(label || hint) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-ink-900">{label}</span>}
          {hint && <span className="mt-0.5 block text-xs text-ink-500">{hint}</span>}
        </span>
      )}
    </label>
  )
})

export default Checkbox
