import { Skeleton } from './ui'

// Replaces the ad-hoc `Array.from({ length })` skeleton grids scattered across
// MenuPage / WebOrderPage / KioskPage. Renders a responsive grid of
// menu-item-shaped placeholders.

const PRESETS = {
  list:    'flex flex-col gap-3',
  grid:    'grid grid-cols-1 gap-3 sm:grid-cols-2',
  kiosk:   'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3',
  compact: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4',
}

function CardSkeleton({ layout }) {
  if (layout === 'list') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-surface-0 p-3 ring-1 ring-inset ring-surface-line">
        <Skeleton height="56px" width="56px" className="rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton height="14px" width="60%" />
          <Skeleton height="12px" width="40%" />
        </div>
        <Skeleton height="32px" width="64px" className="rounded-lg" />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-surface-0 ring-1 ring-inset ring-surface-line">
      <Skeleton height={layout === 'kiosk' ? '180px' : '128px'} className="!rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton height="14px" width="70%" />
        <Skeleton height="12px" width="45%" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton height="16px" width="32%" />
          <Skeleton height="32px" width="64px" className="rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export default function SkeletonGrid({
  count = 6,
  layout = 'grid',
  className = '',
}) {
  const wrap = PRESETS[layout] ?? PRESETS.grid
  return (
    <div className={[wrap, className].join(' ')} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} layout={layout} />
      ))}
    </div>
  )
}
