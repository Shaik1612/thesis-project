import { Plus, Settings2 } from 'lucide-react'
import { Button, FoodImage, MoneyText, QtyStepper } from './ui'
import { displayPrice } from '../hooks/useMenu'

// Mobile customer-facing item card. Photo on the left (compact), name + desc
// + price on the right, action area pinned to the bottom right. Replaces
// the previous src/pages/menu/MenuItemCard.jsx and the inline duplicate in
// WebOrderPage.

export default function CustomerMenuItemCard({ item, qty, onAdd, onRemove }) {
  const unavailable = item.available === false
  const hasOptions = item.hasOptions === true
  const showFromPrice = (item.variants?.length ?? 0) > 0
  const price = displayPrice(item)

  return (
    <article
      className={[
        'group relative flex items-stretch gap-4 overflow-hidden rounded-3xl bg-surface-0 p-3 pr-4 ring-1 ring-inset ring-surface-line shadow-sm transition-all',
        unavailable ? 'opacity-60' : 'hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-400/60',
      ].join(' ')}
    >
      <div className="relative w-28 shrink-0 sm:w-32">
        <FoodImage
          src={item.photo_url}
          name={item.name}
          alt={item.name}
          aspect="square"
          rounded="2xl"
          imageClassName={unavailable ? 'grayscale' : ''}
          overlay={
            qty > 0 ? (
              <span className="absolute left-2 top-2 inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-brand-500 px-2 text-xs font-extrabold tabular-nums text-white shadow-brand">
                {qty}
              </span>
            ) : null
          }
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div>
          <h3 className="font-display text-base font-bold leading-tight tracking-tight text-ink-900 line-clamp-2">
            {item.name}
          </h3>
          {item.description && (
            <p className="mt-1 line-clamp-2 text-xs text-ink-600">{item.description}</p>
          )}
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="flex flex-col">
            {showFromPrice && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                From
              </span>
            )}
            <MoneyText
              amount={price}
              className="font-display text-lg font-extrabold tabular-nums text-ink-900"
            />
          </div>
          {unavailable ? (
            <span className="rounded-full bg-surface-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              Sold out
            </span>
          ) : hasOptions ? (
            <Button variant="primary" size="sm" onClick={onAdd} iconLeft={<Settings2 className="h-4 w-4" />}>
              {qty > 0 ? 'Add more' : 'Customise'}
            </Button>
          ) : qty > 0 ? (
            <QtyStepper size="sm" count={qty} min={0} trashAtMin onMinus={onRemove} onPlus={onAdd} />
          ) : (
            <Button variant="primary" size="sm" onClick={onAdd} iconLeft={<Plus className="h-4 w-4" />}>
              Add
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
