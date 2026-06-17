import { Plus } from 'lucide-react'
import { BottomSheet, Button, FoodImage, MoneyText, QtyStepper } from '../../components/ui'

// Full-screen takeover sheet for items without variants/customisation.
// Shows the photo, name, description, and a kiosk-size stepper.

export default function ItemQuickAdd({ item, qty, onAdd, onRemove, onClose }) {
  return (
    <BottomSheet
      open
      onClose={onClose}
      snap="auto"
      footer={
        <Button variant="hero" size="xl" fullWidth onClick={onClose}>
          Done · <MoneyText amount={item.price * Math.max(qty, 1)} />
        </Button>
      }
    >
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <FoodImage src={item.photo_url} name={item.name} aspect="square" rounded="3xl" />
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-balance font-display text-3xl font-extrabold tracking-tight text-ink-900">
              {item.name}
            </h3>
            {item.description && (
              <p className="mt-2 text-base text-ink-600">{item.description}</p>
            )}
          </div>
          <MoneyText
            amount={item.price}
            className="font-display text-3xl font-extrabold tabular-nums text-brand-700"
          />
          <div className="mt-2 flex items-center justify-between gap-4 rounded-2xl bg-surface-100 p-4">
            <span className="font-display text-lg font-semibold text-ink-900">Quantity</span>
            <QtyStepper
              size="kiosk"
              count={qty}
              trashAtMin
              min={0}
              onMinus={onRemove}
              onPlus={onAdd}
            />
          </div>
          {qty === 0 && (
            <Button variant="hero" size="xl" fullWidth onClick={onAdd} iconLeft={<Plus className="h-6 w-6" />}>
              Add to bag
            </Button>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
