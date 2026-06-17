import { forwardRef } from 'react'

const VARIANTS = {
  flat:     'bg-surface-0 ring-1 ring-inset ring-surface-line shadow-sm',
  elevated: 'bg-surface-0 shadow-md ring-1 ring-inset ring-surface-line/70',
  outline:  'bg-transparent ring-1 ring-inset ring-surface-line',
  // Dark KDS card — use on body[data-zone='kitchen'] surfaces.
  inverse:  'bg-kds-card ring-1 ring-inset ring-kds-line text-kds-text',
  // Hot, customer-facing emphasis card.
  hero:     'bg-brand-soft ring-1 ring-inset ring-brand-100',
}

const PAD = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
}

const RADIUS = {
  md:   'rounded-xl',
  lg:   'rounded-2xl',
  xl:   'rounded-3xl',
}

const Card = forwardRef(function Card(
  {
    variant = 'flat',
    padding = 'md',
    radius = 'md',
    interactive = false,
    as: Tag = 'div',
    className = '',
    children,
    ...rest
  },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={[
        VARIANTS[variant] ?? VARIANTS.flat,
        PAD[padding] ?? PAD.md,
        RADIUS[radius] ?? RADIUS.md,
        interactive
          ? 'cursor-pointer transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm'
          : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  )
})

export default Card
