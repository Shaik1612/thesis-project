import { ShoppingBag } from 'lucide-react'
import OrderSummary from '../../components/OrderSummary'
import YouMayAlsoLike from '../../components/YouMayAlsoLike'
import { EmptyState } from '../../components/ui'

export default function CartPage({
  cart,
  items,
  gstRate,
  onAddItem,
  onCheckout,
}) {
  return (
    <main className="flex h-full min-h-0 flex-col bg-surface-50">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl">
          <section className="min-w-0 rounded-[24px] bg-surface-0 p-5 ring-1 ring-inset ring-surface-line">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-900">
                  Your cart
                </h2>
              </div>
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-600">
                <ShoppingBag className="h-5 w-5" />
                {cart.totalItems > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-extrabold text-white">
                    {cart.totalItems}
                  </span>
                )}
              </div>
            </div>

            {cart.items.length === 0 ? (
              <EmptyState title="Your cart is empty" message="Go back to the menu and add a dish." />
            ) : (
              <>
                <OrderSummary cart={cart} menuItems={items} gstRate={gstRate} stepperSize="md" hideTax />
                <button
                  type="button"
                  disabled={cart.items.length === 0}
                  onClick={onCheckout}
                  className="mt-5 inline-flex h-16 w-full items-center justify-center rounded-2xl bg-emerald-600 px-8 text-xl font-extrabold text-white shadow-sm ring-1 ring-emerald-700/25 transition active:scale-[0.98] active:bg-emerald-800 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-ink-400 disabled:shadow-none disabled:ring-0"
                >
                  Pay with UPI
                </button>
              </>
            )}
          </section>
        </div>

        {cart.items.length > 0 && (
          <div className="mx-auto mt-8 max-w-5xl">
            <YouMayAlsoLike cart={cart} menuItems={items} onPick={onAddItem} showAll layout="grid" />
          </div>
        )}
      </div>
    </main>
  )
}
