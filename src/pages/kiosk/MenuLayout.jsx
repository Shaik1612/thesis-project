import { useMemo, useState } from 'react'
import { ChevronUp, ShoppingBag } from 'lucide-react'
import {
  BottomSheet,
  Button,
  EmptyState,
  MoneyText,
  Tabs,
} from '../../components/ui'
import OrderSummary from '../../components/OrderSummary'
import SkeletonGrid from '../../components/SkeletonGrid'
import YouMayAlsoLike from '../../components/YouMayAlsoLike'
import KioskItemCard from './KioskItemCard'

// Three-column kiosk menu layout: vertical category rail, item grid, live cart.
// Below 1180px the cart panel hides and a sticky bottom cart pill opens a
// review sheet — keeps the layout usable in iPad portrait or smaller kiosks.

export default function MenuLayout({
  categories,
  items,
  loading,
  activeCategory,
  onPickCategory,
  cart,
  gstRate,
  onPickItem,
  onCheckout,
  payCtaLabel = 'Checkout',
}) {
  const [reviewOpen, setReviewOpen] = useState(false)

  const visibleItems = useMemo(() => {
    if (!activeCategory) return items
    return items.filter((i) => i.category_id === activeCategory)
  }, [items, activeCategory])

  const tabsItems = useMemo(
    () =>
      categories.map((c) => ({
        value: c.id,
        label: c.name,
        count: items.filter((i) => i.category_id === c.id && i.available !== false).length,
      })),
    [categories, items],
  )

  const activeName = categories.find((c) => c.id === activeCategory)?.name ?? 'Menu'

  return (
    <div className="flex h-full w-full flex-col xl:flex-row">
      {/* Category rail. */}
      <aside className="shrink-0 border-b border-surface-line bg-surface-0 xl:w-64 xl:border-b-0 xl:border-r">
        <div className="hidden border-b border-surface-line/70 px-5 py-4 xl:block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">Menu</p>
          <p className="mt-0.5 font-display text-lg font-bold text-ink-900">Browse categories</p>
        </div>
        <nav className="overflow-x-auto xl:overflow-y-auto xl:px-3 xl:py-4">
          <div className="hidden xl:block">
            <Tabs
              orientation="vertical"
              items={tabsItems}
              value={activeCategory}
              onChange={onPickCategory}
              ariaLabel="Categories"
            />
          </div>
          <div className="xl:hidden">
            <Tabs
              variant="pill"
              items={tabsItems}
              value={activeCategory}
              onChange={onPickCategory}
              ariaLabel="Categories"
              className="px-4 py-3"
            />
          </div>
        </nav>
      </aside>

      {/* Item grid. */}
      <main className="flex-1 overflow-y-auto px-6 pb-32 pt-6 xl:pb-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              {visibleItems.length} item{visibleItems.length === 1 ? '' : 's'}
            </p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-900">
              {activeName}
            </h2>
          </div>
        </div>

        {loading ? (
          <SkeletonGrid count={9} layout="kiosk" />
        ) : visibleItems.length === 0 ? (
          <EmptyState title="Nothing here yet" message="Try another category." />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
            {visibleItems.map((item) => (
              <KioskItemCard
                key={item.id}
                item={item}
                qty={cart.quantityFor(item.id)}
                onTap={() => onPickItem(item)}
              />
            ))}
          </div>
        )}

        {cart.items.length > 0 && (
          <div className="mt-10">
            <YouMayAlsoLike cart={cart} menuItems={items} onPick={onPickItem} />
          </div>
        )}
      </main>

      {/* Persistent cart panel (xl+). */}
      <aside className="hidden shrink-0 flex-col border-l border-surface-line bg-surface-0 xl:flex xl:w-[360px]">
        <CartPanel
          cart={cart}
          gstRate={gstRate}
          items={items}
          onCheckout={onCheckout}
          payCtaLabel={payCtaLabel}
        />
      </aside>

      {/* Mobile / smaller kiosks: sticky cart bar that opens a review sheet. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4 safe-bottom xl:hidden">
        {cart.items.length > 0 && (
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className="pointer-events-auto group flex w-full items-center justify-between gap-4 rounded-3xl bg-brand-hot px-5 py-4 text-white shadow-brand ring-1 ring-brand-700/30 active:scale-[0.99]"
          >
            <span className="inline-flex items-center gap-3">
              <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                <ShoppingBag className="h-5 w-5" />
                <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1 text-xs font-extrabold tabular-nums text-brand-600">
                  {cart.totalItems}
                </span>
              </span>
              <span className="text-left">
                <span className="block text-xs font-semibold uppercase tracking-wider text-white/85">Review &amp; pay</span>
                <span className="block font-display text-lg font-extrabold tabular-nums">
                  <MoneyText amount={cart.subtotal} />
                </span>
              </span>
            </span>
            <ChevronUp className="h-6 w-6 transition-transform group-hover:-translate-y-0.5" />
          </button>
        )}
      </div>

      <BottomSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Your bag"
        subtitle={`${cart.totalItems} item${cart.totalItems === 1 ? '' : 's'}`}
        snap="full"
        footer={
          <Button
            variant="hero"
            size="xl"
            fullWidth
            disabled={cart.items.length === 0}
            onClick={() => { setReviewOpen(false); onCheckout() }}
          >
            {payCtaLabel} · <MoneyText amount={cart.subtotal} />
          </Button>
        }
      >
        <OrderSummary cart={cart} menuItems={items} gstRate={gstRate} stepperSize="md" hideTax />
      </BottomSheet>
    </div>
  )
}

function CartPanel({ cart, items, gstRate, onCheckout, payCtaLabel }) {
  return (
    <>
      <div className="border-b border-surface-line px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">Your bag</p>
            <p className="font-display text-xl font-extrabold tracking-tight text-ink-900">
              {cart.totalItems > 0 ? `${cart.totalItems} item${cart.totalItems === 1 ? '' : 's'}` : 'Empty'}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-600">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
        {cart.items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-12 text-center text-ink-500">
            <div className="text-3xl">🍽️</div>
            <p className="text-sm">Tap an item on the menu to add it to your bag.</p>
          </div>
        ) : (
          <OrderSummary cart={cart} menuItems={items} gstRate={gstRate} stepperSize="md" hideTax />
        )}
      </div>
      <div className="border-t border-surface-line bg-surface-0 px-5 py-5">
        <Button
          variant="hero"
          size="xl"
          fullWidth
          disabled={cart.items.length === 0}
          onClick={onCheckout}
        >
          {payCtaLabel} · <MoneyText amount={cart.subtotal} />
        </Button>
        <p className="mt-2 text-center text-xs text-ink-500">Pay before food is prepared</p>
      </div>
    </>
  )
}
