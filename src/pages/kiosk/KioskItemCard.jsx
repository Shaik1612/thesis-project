import { FoodImage, MoneyText } from '../../components/ui'
import { displayPrice } from '../../hooks/useMenu'

// Kiosk menu item card follows the web order card flow, with slightly larger
// touch targets for kiosk use.

export default function KioskItemCard({ item, qty = 0, onTap }) {
  const unavailable = item.available === false
  const hasOptions = item.hasOptions || (item.variants?.length ?? 0) > 0
  const fromPrice = (item.variants?.length ?? 0) > 0

  return (
    <article className="group flex h-full min-w-0 flex-col">
      <button
        type="button"
        onClick={onTap}
        disabled={unavailable}
        aria-label={`${item.name}, ${unavailable ? 'unavailable' : 'add to bag'}`}
        className={[
          'relative block w-full overflow-hidden rounded-[20px] bg-surface-100 text-left transition',
          unavailable
            ? 'cursor-not-allowed opacity-60'
            : 'active:scale-[0.985] hover:-translate-y-0.5 hover:shadow-md',
        ].join(' ')}
      >
        <FoodImage
          src={item.photo_url}
          name={item.name}
          alt={item.name}
          aspect="4/3"
          rounded="2xl"
          className="bg-[#f7f7f7]"
          imageClassName={unavailable ? 'grayscale object-cover' : 'object-cover'}
          overlay={
            <>
              {qty > 0 && (
                <span className="absolute right-2 top-2 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-brand-500 px-2 font-display text-sm font-extrabold tabular-nums text-white shadow-brand">
                  {qty}
                </span>
              )}
              {unavailable && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <span className="rounded-full bg-ink-900 px-4 py-2 text-sm font-extrabold text-white">
                    Sold out
                  </span>
                </div>
              )}
              {hasOptions && !unavailable && (
                <span className="absolute left-3 top-3 rounded-sm bg-brand-500 px-2 py-1 text-[11px] font-extrabold uppercase text-white">
                  Customise
                </span>
              )}
            </>
          }
        />
      </button>

      <div className="flex flex-1 flex-col px-1 pt-2">
        <h3 className="h-[2.85rem] text-base font-extrabold leading-snug text-ink-900 line-clamp-2">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-0.5 line-clamp-1 text-xs font-medium text-ink-500">{item.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
          <div className="flex flex-col">
            {fromPrice && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">From</span>
            )}
            <MoneyText
              amount={displayPrice(item)}
              className="font-display text-lg font-extrabold leading-none tabular-nums text-ink-900"
            />
          </div>
          {!unavailable && (
            <button
              type="button"
              onClick={onTap}
              className="inline-flex h-9 min-w-[68px] items-center justify-center rounded-xl bg-white px-3 text-xs font-extrabold uppercase tracking-wide text-emerald-700 shadow-sm ring-2 ring-emerald-100 transition active:scale-95"
              aria-label={hasOptions ? `Choose options for ${item.name}` : `Add ${item.name}`}
            >
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
