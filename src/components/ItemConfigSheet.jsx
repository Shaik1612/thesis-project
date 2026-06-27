import { useEffect, useMemo, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { BottomSheet, MoneyText, QtyStepper } from './ui'

const BRAND_ORANGE = '#fc8019'

function optionLabelFor(item) {
  const text = `${item?.name ?? ''} ${item?.description ?? ''}`.toLowerCase()
  if (/(coffee|tea|chai|latte|shake|lassi|cola|iced|drink|beverage)/.test(text)) {
    return 'Choose drink option'
  }
  if (/(burger|sandwich|wrap)/.test(text)) return 'Choose style'
  if (/(combo|meal|box|bucket)/.test(text)) return 'Choose meal option'
  if (/(ice cream|sundae|dessert|cake|brownie)/.test(text)) return 'Choose dessert option'
  return 'Choose option'
}

// Shared sheet for picking variants and toggling removable ingredients.
// Notes are added from the active bill/cart surface instead of this sheet.
export default function ItemConfigSheet({ open, item, onClose, onAdd }) {
  const variants = item?.variants ?? []
  const removableIngredients = item?.removableIngredients ?? []

  const [variantId, setVariantId] = useState(null)
  const [removed, setRemoved] = useState(() => new Set())
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!open) return
    setVariantId(variants[0]?.id ?? null)
    setRemoved(new Set())
    setQuantity(1)
  }, [open, item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedVariant = useMemo(
    () => variants.find(v => v.id === variantId) ?? null,
    [variants, variantId]
  )

  const unitPrice = selectedVariant
    ? Number(selectedVariant.price)
    : Number(item?.price ?? 0)
  const optionLabel = optionLabelFor(item)

  function toggleRemoved(id) {
    setRemoved(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function submit() {
    if (!item) return
    onAdd({
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      unitPrice,
      quantity,
      customizations: {
        removed_ingredients: [...removed],
      },
    })
    onClose?.()
  }

  if (!item) return null

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={item.name}
      footer={
        <div className="flex min-w-0 items-center gap-3">
          <QtyStepper
            size="sm"
            count={quantity}
            onMinus={() => setQuantity(q => Math.max(1, q - 1))}
            onPlus={() => setQuantity(q => q + 1)}
            className="shrink-0"
          />
          <button
            type="button"
            onClick={submit}
            className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-extrabold text-white shadow-brand transition active:scale-[0.98]"
            style={{ backgroundColor: BRAND_ORANGE }}
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={3} />
            <span className="truncate">Add</span>
            <span className="shrink-0">·</span>
            <MoneyText amount={unitPrice * quantity} className="shrink-0 tabular-nums" />
          </button>
        </div>
      }
    >
      <section className="mb-4 border-b border-surface-line pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h4 className="text-xl font-semibold leading-tight text-ink-900">{item.name}</h4>
            {item.description && (
              <p className="mt-1 text-sm leading-snug text-ink-600">{item.description}</p>
            )}
          </div>
          <MoneyText amount={unitPrice} className="shrink-0 font-mono text-lg font-bold tabular-nums text-ink-900" />
        </div>
      </section>

      {variants.length > 0 && (
        <section className="mb-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-ink-700">
              {optionLabel}
            </h4>
            <span className="text-xs font-medium text-ink-500">Required</span>
          </div>
          <div className="grid gap-2">
            {variants.map(v => {
              const active = v.id === variantId
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariantId(v.id)}
                  className={[
                    'flex min-h-14 items-center justify-between rounded-lg px-3 py-3 text-left ring-1 ring-inset transition-colors',
                    active
                      ? 'bg-brand-500 text-white ring-brand-600'
                      : 'bg-surface-0 text-ink-900 ring-surface-line hover:bg-surface-100',
                  ].join(' ')}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={[
                        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
                        active ? 'bg-white text-brand-600 ring-white' : 'text-transparent ring-surface-line',
                      ].join(' ')}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate text-sm font-semibold">{v.name}</span>
                  </span>
                  <MoneyText
                    amount={Number(v.price)}
                    className={['shrink-0 font-mono text-sm font-bold tabular-nums', active ? 'text-white' : 'text-ink-900'].join(' ')}
                  />
                </button>
              )
            })}
          </div>
        </section>
      )}

      {removableIngredients.length > 0 && (
        <section className="mb-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-ink-700">
              Remove ingredients
            </h4>
            {removed.size > 0 && (
              <span className="font-mono text-xs font-bold tabular-nums text-ink-500">
                {removed.size} removed
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {removableIngredients.map(ing => {
              const checked = removed.has(ing.id)
              return (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => toggleRemoved(ing.id)}
                  className={[
                    'flex min-h-12 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left ring-1 ring-inset transition-colors',
                    checked
                      ? 'bg-status-cancelled/10 text-status-cancelled ring-status-cancelled/25'
                      : 'bg-surface-0 text-ink-900 ring-surface-line hover:bg-surface-100',
                  ].join(' ')}
                >
                  <span className="truncate text-sm font-semibold">No {ing.name.toLowerCase()}</span>
                  <span
                    className={[
                      'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
                      checked ? 'bg-status-cancelled text-white ring-status-cancelled' : 'text-transparent ring-surface-line',
                    ].join(' ')}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

    </BottomSheet>
  )
}
