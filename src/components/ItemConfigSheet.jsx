import { useEffect, useMemo, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { BottomSheet, Button, FoodImage, MoneyText, QtyStepper } from './ui'

const MAX_INSTRUCTIONS = 140
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

// Shared sheet for picking variants, toggling removable ingredients, and
// adding a short note. Used by every customer channel (QR/web/kiosk/desk).
// When the item has no variants and no removable ingredients we still
// surface an inline "Add a note" affordance, but the parent component is
// responsible for choosing whether to open the sheet at all — items with
// truly zero options should skip the sheet for the fastest add path.
export default function ItemConfigSheet({ open, item, onClose, onAdd }) {
  const variants = item?.variants ?? []
  const removableIngredients = item?.removableIngredients ?? []

  const [variantId, setVariantId] = useState(null)
  const [removed, setRemoved] = useState(() => new Set())
  const [instructions, setInstructions] = useState('')
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!open) return
    setVariantId(variants[0]?.id ?? null)
    setRemoved(new Set())
    setInstructions('')
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
        special_instructions: instructions.trim(),
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
        <div className="flex items-center justify-between gap-3">
          <QtyStepper
            count={quantity}
            onMinus={() => setQuantity(q => Math.max(1, q - 1))}
            onPlus={() => setQuantity(q => q + 1)}
          />
          <Button
            variant="primary"
            size="lg"
            onClick={submit}
            className="flex-1 text-white hover:brightness-95"
            style={{ backgroundColor: BRAND_ORANGE }}
          >
            <Plus className="h-5 w-5" />
            {variants.length > 0 ? 'Choose options' : 'Add'} · <MoneyText amount={unitPrice * quantity} />
          </Button>
        </div>
      }
    >
      <div className="mb-5 overflow-hidden rounded-3xl bg-surface-100">
        <FoodImage
          src={item.photo_url}
          name={item.name}
          alt={item.name}
          aspect="square"
          rounded="3xl"
          imageClassName="object-contain p-8"
          priority
        />
      </div>

      <section className="mb-5 rounded-2xl bg-surface-0">
        <h4 className="font-display text-2xl font-extrabold leading-tight text-ink-900">{item.name}</h4>
        {item.description && (
          <p className="mt-2 text-base font-medium leading-snug text-ink-600">{item.description}</p>
        )}
      </section>

      {variants.length > 0 && (
        <section className="mb-5">
          <h4 className="mb-3 text-sm font-semibold text-ink-500">
            {optionLabel}
          </h4>
          <div className="flex flex-col gap-2">
            {variants.map(v => {
              const active = v.id === variantId
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariantId(v.id)}
                  className={[
                    'flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors',
                    active
                      ? 'border-ink-900 bg-surface-100 text-ink-900'
                      : 'border-surface-line bg-surface-0 text-ink-900 active:bg-surface-100',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-3 font-semibold">
                    <span
                      className={[
                        'inline-flex h-7 w-7 items-center justify-center rounded-full border',
                        active ? 'border-ink-900 bg-ink-900 text-white' : 'border-surface-line text-transparent',
                      ].join(' ')}
                    >
                      <Check className="h-4 w-4" />
                    </span>
                    {v.name}
                  </span>
                  <MoneyText amount={Number(v.price)} className="font-display text-lg font-extrabold" />
                </button>
              )
            })}
          </div>
        </section>
      )}

      {removableIngredients.length > 0 && (
        <section className="mb-5">
          <h4 className="mb-2 text-sm font-semibold text-ink-500">
            Modifications
          </h4>
          <div className="flex flex-col gap-1">
            {removableIngredients.map(ing => {
              const checked = removed.has(ing.id)
              return (
                <label
                  key={ing.id}
                  className="flex cursor-pointer items-center justify-between rounded-2xl px-3 py-3 active:bg-surface-100"
                >
                  <span className="text-base font-medium text-ink-900">No {ing.name.toLowerCase()}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRemoved(ing.id)}
                    className="h-5 w-5 accent-brand-500"
                  />
                </label>
              )
            })}
          </div>
        </section>
      )}

      <section className="mb-2">
        <h4 className="mb-2 text-sm font-semibold text-ink-500">
          Special instructions
        </h4>
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value.slice(0, MAX_INSTRUCTIONS))}
          rows={2}
          placeholder="Milk preference, sugar level, allergies, etc."
          className="w-full resize-none rounded-lg border border-surface-line bg-surface-0 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
        />
        <div className="mt-1 text-right text-xs text-ink-400">
          {instructions.length}/{MAX_INSTRUCTIONS}
        </div>
      </section>
    </BottomSheet>
  )
}
