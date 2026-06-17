import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary: [
    'bg-brand-500 text-white shadow-brand',
    'hover:bg-brand-600 active:bg-brand-700',
    'disabled:bg-ink-400 disabled:shadow-none',
  ].join(' '),

  // Hero CTA for kiosk + customer surfaces. Hot orange gradient + glow.
  hero: [
    'bg-brand-hot text-white shadow-brand ring-1 ring-brand-700/30',
    'hover:brightness-110 active:brightness-95',
    'disabled:bg-ink-400 disabled:bg-none disabled:shadow-none disabled:ring-0',
  ].join(' '),

  secondary: [
    'bg-surface-100 text-ink-900',
    'hover:bg-surface-150 active:bg-surface-line',
    'disabled:text-ink-400',
  ].join(' '),

  // Subtle = no fill, hover tint. For dense desk/admin actions.
  subtle: [
    'bg-transparent text-ink-700',
    'hover:bg-surface-100 active:bg-surface-150',
    'disabled:text-ink-400',
  ].join(' '),

  ghost: [
    'bg-transparent text-ink-900',
    'hover:bg-surface-100 active:bg-surface-150',
    'disabled:text-ink-400',
  ].join(' '),

  outline: [
    'bg-transparent text-ink-900 ring-1 ring-inset ring-surface-line',
    'hover:bg-surface-100 active:bg-surface-150',
    'disabled:text-ink-400',
  ].join(' '),

  danger: [
    'bg-status-cancelled text-white shadow-sm',
    'hover:brightness-95 active:brightness-90',
    'disabled:bg-ink-400 disabled:shadow-none',
  ].join(' '),

  // Inverse for KDS / dark contexts.
  inverse: [
    'bg-kds-card text-kds-text ring-1 ring-inset ring-kds-line',
    'hover:bg-kds-line active:bg-kds-line',
    'disabled:opacity-50',
  ].join(' '),
}

const SIZES = {
  sm: 'h-9  px-3 text-sm   gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-base gap-2   rounded-lg',
  lg: 'h-14 px-6 text-lg   gap-2.5 rounded-xl',
  // Kiosk: ≥64px height, slightly looser radius for big-touch.
  xl: 'h-16 px-8 text-xl   gap-3   rounded-2xl',
}

const ICON_SIZE = {
  sm: 'h-4 w-4',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
}

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    busy = false,
    loading = false,
    iconLeft = null,
    iconRight = null,
    disabled,
    className = '',
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const showSpinnerInline = loading && !busy
  const spinner = <Loader2 className={[ICON_SIZE[size], 'animate-spin'].join(' ')} aria-hidden />

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || busy || loading}
      aria-busy={busy || loading || undefined}
      className={[
        'inline-flex items-center justify-center font-medium font-body whitespace-nowrap',
        'transition-[background-color,box-shadow,transform] duration-150',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {busy ? (
        spinner
      ) : (
        <>
          {showSpinnerInline ? spinner : iconLeft ? <span className={ICON_SIZE[size]}>{iconLeft}</span> : null}
          <span className="min-w-0 truncate">{children}</span>
          {iconRight ? <span className={ICON_SIZE[size]}>{iconRight}</span> : null}
        </>
      )}
    </button>
  )
})

export default Button
