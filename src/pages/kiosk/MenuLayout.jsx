import { useMemo, useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import {
  EmptyState,
  MoneyText,
  Tabs,
} from '../../components/ui'
import SkeletonGrid from '../../components/SkeletonGrid'
import YouMayAlsoLike from '../../components/YouMayAlsoLike'
import KioskItemCard from './KioskItemCard'

const NON_VEG_TERMS = [
  'chicken',
  'mutton',
  'fish',
  'prawn',
  'egg',
  'meat',
  'lamb',
  'bacon',
  'ham',
  'pepperoni',
  'sausage',
  'beef',
  'pork',
  'turkey',
  'seafood',
  'nugget',
  'strip',
]

function isNonVegItem(item) {
  const text = `${item.name} ${item.description ?? ''}`.toLowerCase()
  return NON_VEG_TERMS.some((term) => text.includes(term))
}

function itemMatchesDietaryFilter(item, filter) {
  if (filter === 'veg') return !isNonVegItem(item)
  if (filter === 'non-veg') return isNonVegItem(item)
  return true
}

function DietaryIcon({ nonVeg }) {
  return (
    <span
      className={[
        'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 bg-white',
        nonVeg ? 'border-red-500' : 'border-emerald-600',
      ].join(' ')}
      aria-hidden
    >
      <span
        className={[
          nonVeg
            ? 'h-0 w-0 border-x-[4px] border-b-[8px] border-x-transparent border-b-red-500'
            : 'h-2 w-2 rounded-full bg-emerald-600',
        ].join(' ')}
      />
    </span>
  )
}

function DietaryFilter({ value, onChange }) {
  const options = [
    { value: 'all', label: 'All', nonVeg: null, activeClass: 'border-ink-900 bg-ink-900 text-white' },
    { value: 'veg', label: 'Veg', nonVeg: false, activeClass: 'border-emerald-600 bg-emerald-50 text-emerald-800' },
    { value: 'non-veg', label: 'Non veg', nonVeg: true, activeClass: 'border-red-500 bg-red-50 text-red-700' },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            aria-label={`Show ${option.label} items`}
            className={[
              'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-extrabold shadow-sm transition active:scale-[0.98]',
              active ? option.activeClass : 'border-surface-line bg-white text-ink-600 hover:border-ink-300',
            ].join(' ')}
          >
            {option.nonVeg !== null && <DietaryIcon nonVeg={option.nonVeg} />}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// Kiosk menu layout: vertical category rail plus a compact three-column item grid.
// Cart review lives on its own kiosk step, so the menu has no cart column.

export default function MenuLayout({
  categories,
  items,
  loading,
  activeCategory,
  onPickCategory,
  cart,
  onPickItem,
  onReviewCart,
}) {
  const [dietaryFilter, setDietaryFilter] = useState('all')

  const visibleItems = useMemo(() => {
    const categoryItems = activeCategory
      ? items.filter((i) => i.category_id === activeCategory)
      : items
    return categoryItems.filter((i) => itemMatchesDietaryFilter(i, dietaryFilter))
  }, [items, activeCategory, dietaryFilter])

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
    <div className="flex h-full w-full flex-col lg:flex-row">
      {/* Category rail. */}
      <aside className="shrink-0 border-b border-surface-line bg-surface-0 lg:w-56 lg:border-b-0 lg:border-r xl:w-64">
        <div className="hidden border-b border-surface-line/70 px-5 py-4 lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Menu</p>
          <p className="mt-0.5 font-display text-lg font-bold text-ink-900">Categories</p>
        </div>
        <nav className="overflow-x-auto lg:overflow-y-auto lg:px-3 lg:py-4">
          <div className="hidden lg:block">
            <Tabs
              orientation="vertical"
              items={tabsItems}
              value={activeCategory}
              onChange={onPickCategory}
              ariaLabel="Categories"
            />
          </div>
          <div className="lg:hidden">
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
      <main className="flex-1 overflow-y-auto px-6 pb-32 pt-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-900">
                {activeName}
              </h2>
            </div>
            <DietaryFilter value={dietaryFilter} onChange={setDietaryFilter} />
          </div>

          {loading ? (
            <SkeletonGrid count={8} layout="kiosk" />
          ) : visibleItems.length === 0 ? (
            <EmptyState title="Nothing here yet" message="Try another category or filter." />
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-6 pb-5 safe-bottom">
        {cart.items.length > 0 && (
          <button
            type="button"
            onClick={onReviewCart}
            className="pointer-events-auto ml-auto flex min-h-16 w-full max-w-[360px] items-center justify-between gap-3 rounded-2xl bg-brand-500 px-5 text-white shadow-lg ring-1 ring-brand-600 transition active:scale-[0.98]"
          >
            <span className="min-w-0 text-left">
              <span className="block text-[11px] font-extrabold uppercase tracking-wide text-white/80">View cart</span>
              <span className="block font-display text-2xl font-extrabold leading-none tabular-nums">
                <MoneyText amount={cart.subtotal} />
              </span>
            </span>
            <span className="relative inline-flex shrink-0">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                <ShoppingBag className="h-5 w-5" />
              </span>
              <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink-900 px-1 text-[11px] font-extrabold text-white">
                {cart.totalItems}
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
