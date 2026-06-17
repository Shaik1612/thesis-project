import { Trash2 } from 'lucide-react'
import { MoneyText, QtyStepper } from './ui'

// Canonical renderer for cart contents + totals. Replaces the duplicated
// summary blocks in CartDrawer, WebOrderPage and KioskPage.
//
// Two modes:
//   - editable (default): each line shows a QtyStepper bound to the cart
//   - readonly:           lines are static text (used on the status page)
//
// `menuItems` is optional — it's used to resolve removable-ingredient ids
// back to names for the customization summary. If absent, the customization
// block just shows the raw "X removed" count.

function CustomizationSummary({ customizations, menuItem, className = '' }) {
  if (!customizations) return null
  const removedIds = customizations.removed_ingredients ?? []
  const instr = customizations.special_instructions
  if (removedIds.length === 0 && !instr) return null

  const removedNames = removedIds
    .map((id) => menuItem?.removableIngredients?.find((ing) => ing.id === id)?.name)
    .filter(Boolean)

  const removedLine = removedNames.length > 0
    ? removedNames.map((n) => `No ${n.toLowerCase()}`).join(' · ')
    : removedIds.length > 0 ? `${removedIds.length} customisations` : null

  return (
    <div className={['mt-1 space-y-0.5 text-xs text-ink-600', className].join(' ')}>
      {removedLine && <div>{removedLine}</div>}
      {instr && <div className="italic">&ldquo;{instr}&rdquo;</div>}
    </div>
  )
}

function CartLine({ item, menuItem, editable, stepperSize, cart }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-medium text-ink-900">{item.name}</span>
          {item.variantName && (
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-ink-500">
              {item.variantName}
            </span>
          )}
        </div>
        <CustomizationSummary customizations={item.customizations} menuItem={menuItem} />
        <div className="mt-1 flex items-baseline gap-1.5">
          <MoneyText amount={item.unitPrice} className="text-sm text-ink-500" />
          <span className="text-xs text-ink-400">×</span>
          <span className="text-sm font-medium text-ink-700 tabular-nums">{item.quantity}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <MoneyText
          amount={item.unitPrice * item.quantity}
          className="font-display text-base font-semibold tabular-nums"
        />
        {editable && cart && (
          <QtyStepper
            size={stepperSize}
            count={item.quantity}
            trashAtMin
            min={0}
            onMinus={() => cart.remove(item.lineKey)}
            onPlus={() =>
              cart.add(
                { id: item.menuItemId, name: item.name, photo_url: item.photoUrl, price: item.unitPrice },
                {
                  variantId: item.variantId,
                  variantName: item.variantName,
                  unitPrice: item.unitPrice,
                  customizations: item.customizations,
                },
              )
            }
          />
        )}
      </div>
    </li>
  )
}

export default function OrderSummary({
  cart,
  // When `cart` is not supplied (e.g. for the status page), pass `items` /
  // `subtotal` / `gstAmount` / `grandTotal` directly.
  items,
  subtotal,
  gstAmount,
  grandTotal,
  gstRate = 5,
  // Resolves removable-ingredient ids → names. Optional.
  menuItems = [],
  editable = true,
  showClear = true,
  stepperSize = 'sm',
  totalsLabel = 'Total',
  // Hide the GST row and show subtotal as the grand total. Used by cart
  // previews (kiosk side rail, QR cart drawer) where GST is reserved for
  // the actual checkout / payment step.
  hideTax = false,
  hint,
  className = '',
}) {
  const lineItems = cart?.items ?? items ?? []
  const sub      = cart ? cart.subtotal    : (subtotal ?? 0)
  const gst      = cart ? cart.gstAmount   : (gstAmount ?? 0)
  const grand    = hideTax ? sub : (cart ? cart.grandTotal : (grandTotal ?? sub + gst))

  if (lineItems.length === 0) {
    return (
      <div className={['rounded-2xl bg-surface-100 px-5 py-6 text-center text-sm text-ink-500', className].join(' ')}>
        Your cart is empty.
      </div>
    )
  }

  return (
    <div className={className}>
      <ul className="flex flex-col divide-y divide-surface-line">
        {lineItems.map((item) => {
          const menuItem = menuItems.find((m) => m.id === item.menuItemId)
          return (
            <CartLine
              key={item.lineKey ?? item.menuItemId}
              item={item}
              menuItem={menuItem}
              editable={editable}
              stepperSize={stepperSize}
              cart={cart}
            />
          )
        })}
      </ul>

      {editable && cart && showClear && lineItems.length > 0 && (
        <button
          type="button"
          onClick={cart.clear}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-status-cancelled"
        >
          <Trash2 className="h-4 w-4" />
          Clear cart
        </button>
      )}

      <dl className="mt-5 space-y-2.5 border-t border-dashed border-surface-line pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-ink-600">Subtotal</dt>
          <dd><MoneyText amount={sub} className="tabular-nums" /></dd>
        </div>
        {!hideTax && (
          <div className="flex items-center justify-between">
            <dt className="text-ink-600">GST ({gstRate}%)</dt>
            <dd><MoneyText amount={gst} className="tabular-nums" /></dd>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-surface-line pt-3">
          <dt className="font-display text-base font-semibold text-ink-900">{totalsLabel}</dt>
          <dd>
            <MoneyText
              amount={grand}
              className="font-display text-2xl font-extrabold tabular-nums text-ink-900"
            />
          </dd>
        </div>
      </dl>

      {hint && <p className="mt-2 text-center text-xs text-ink-500">{hint}</p>}
    </div>
  )
}
