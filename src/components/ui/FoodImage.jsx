import { useState } from 'react'
import { Utensils } from 'lucide-react'

// Renders a menu-item photo with a graceful fallback when `photo_url` is
// null or fails to load. Fallback is a soft brand gradient with the item's
// monogram, which still looks intentional in screenshots / marketing.
//
// `aspect` accepts standard Tailwind aspect-ratio classes ('square', 'video',
// '4/3', '3/4', '16/9') or a custom string.

const ASPECT = {
  square: 'aspect-square',
  video:  'aspect-video',
  '4/3':  'aspect-[4/3]',
  '3/4':  'aspect-[3/4]',
  '16/9': 'aspect-[16/9]',
  '21/9': 'aspect-[21/9]',
}

// A small set of deterministic gradients so adjacent menu items in a grid get
// different fallbacks (visually richer than the same color repeated).
const GRADIENTS = [
  'from-brand-300 via-brand-400 to-brand-500',
  'from-amber-300 via-brand-400 to-brand-600',
  'from-rose-300 via-brand-400 to-brand-600',
  'from-orange-300 via-brand-500 to-rose-500',
  'from-yellow-300 via-brand-400 to-brand-700',
]

function gradientFor(seed = '') {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]
}

function monogram(name = '') {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]).filter(Boolean).join('').toUpperCase() || '·'
}

export default function FoodImage({
  src,
  alt,
  name = '',
  aspect = 'video',
  rounded = '2xl',
  className = '',
  imageClassName = '',
  // Optional badge slot — e.g. category chip or unavailable marker.
  overlay = null,
  priority = false,
}) {
  const [errored, setErrored] = useState(false)
  const hasImage = !!src && !errored
  const aspectCls = ASPECT[aspect] ?? aspect
  const roundedCls = `rounded-${rounded}`
  const gradient = gradientFor(name)

  return (
    <div
      className={[
        'relative overflow-hidden bg-surface-100',
        aspectCls,
        roundedCls,
        className,
      ].join(' ')}
    >
      {hasImage ? (
        <img
          src={src}
          alt={alt ?? name}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setErrored(true)}
          className={[
            'h-full w-full object-cover transition-transform duration-500',
            'group-hover:scale-[1.04]',
            imageClassName,
          ].join(' ')}
        />
      ) : (
        <div
          aria-hidden
          className={[
            'flex h-full w-full items-center justify-center bg-gradient-to-br text-white',
            gradient,
          ].join(' ')}
        >
          <div className="flex flex-col items-center gap-2">
            <Utensils className="h-8 w-8 opacity-70" />
            <span className="font-display text-3xl font-extrabold tracking-tight drop-shadow-sm">
              {monogram(name)}
            </span>
          </div>
        </div>
      )}
      {!hasImage && <span className="sr-only">{alt ?? name}</span>}
      {overlay && <div className="pointer-events-none absolute inset-0">{overlay}</div>}
    </div>
  )
}
