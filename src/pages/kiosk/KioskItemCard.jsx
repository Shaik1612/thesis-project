import { Plus } from 'lucide-react'
import { FoodImage, MoneyText } from '../../components/ui'
import { displayPrice } from '../../hooks/useMenu'

// Kiosk menu item card. Big hero photo (3:2), bold title, price prominent,
// dedicated Add button >=64px touch target.

export default function KioskItemCard({ item, qty = 0, onTap }) {
  const unavailable = item.available === false
  const hasOptions = item.hasOptions || (item.variants?.length ?? 0) > 0
  const fromPrice = (item.variants?.length ?? 0) > 0

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={unavailable}
      aria-label={`${item.name}, ${unavailable ? 'unavailable' : 'add to bag'}`}
      className={[
        'group relative flex h-full flex-col overflow-hidden rounded-3xl bg-surface-0 text-left',
        'ring-1 ring-inset ring-surface-line shadow-sm transition-all',
        unavailable
          ? 'cursor-not-allowed opacity-60'
          : 'active:scale-[0.985] hover:-translate-y-1 hover:shadow-md hover:ring-brand-400',
      ].join(' ')}
    >
      <FoodImage
        src={item.photo_url}
        name={item.name}
        alt={item.name}
        aspect="3/4"
        rounded="none"
        className="!rounded-none"
        imageClassName={unavailable ? 'grayscale' : ''}
        overlay={
          <>
            {qty > 0 && (
              <span className="absolute right-3 top-3 inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-full bg-brand-500 px-2 font-display text-lg font-extrabold tabular-nums text-white shadow-brand">
                {qty}
              </span>
            )}
            {unavailable && (
              <span className="absolute left-3 top-3 rounded-full bg-ink-900/85 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                Sold out
              </span>
            )}
            {hasOptions && !unavailable && (
              <span className="absolute left-3 bottom-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-700 shadow-sm">
                Customise
              </span>
            )}
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-display text-xl font-bold leading-tight tracking-tight text-ink-900 line-clamp-2">
          {item.name}
        </h3>
        {item.description && (
          <p className="line-clamp-2 text-sm text-ink-600">{item.description}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div className="flex flex-col">
            {fromPrice && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">From</span>
            )}
            <MoneyText
              amount={displayPrice(item)}
              className="font-display text-2xl font-extrabold tabular-nums text-ink-900"
            />
          </div>
          {!unavailable && (
            <span className="touch-target-xl inline-flex items-center gap-2 rounded-2xl bg-brand-hot px-5 font-display text-base font-extrabold text-white shadow-brand transition-transform group-hover:scale-105 group-active:scale-95">
              <Plus className="h-5 w-5" />
              Add
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
