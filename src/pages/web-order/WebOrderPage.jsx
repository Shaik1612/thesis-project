import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Heart,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react'
import { useSettings } from '../../lib/SettingsContext'
import { useMenu, displayPrice } from '../../hooks/useMenu'
import { useCart } from '../../hooks/useCart'
import ClosedPage from '../../components/ClosedPage'
import LoadingSpinner from '../../components/LoadingSpinner'
import PhoneField from '../../components/PhoneField'
import CheckoutAdjustments from '../../components/CheckoutAdjustments'
import OrderSummary from '../../components/OrderSummary'
import SkeletonGrid from '../../components/SkeletonGrid'
import UpiPaymentFlow from '../../components/UpiPaymentFlow'
import ItemConfigSheet from '../../components/ItemConfigSheet'
import YouMayAlsoLike from '../../components/YouMayAlsoLike'
import { FoodImage, Input, MoneyText } from '../../components/ui'

const RESTAURANT_NAME = 'POETRY CAFE'
const BRAND_ORANGE = '#fc8019'
const POINTS_PER_RUPEE = 1
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

function pointsForSpend(amount) {
  return Math.floor(Math.max(0, Number(amount) || 0) / 10)
}

function isNonVegItem(item) {
  const text = `${item.name} ${item.description ?? ''}`.toLowerCase()
  return NON_VEG_TERMS.some((term) => text.includes(term))
}

function itemMatchesDietaryFilter(item, filter) {
  if (filter === 'veg') return !isNonVegItem(item)
  if (filter === 'non-veg') return isNonVegItem(item)
  return true
}

function productTags(item) {
  const text = `${item.name} ${item.description ?? ''}`.toLowerCase()
  const tags = []
  if (item.discount_percent) tags.push('Today')
  if (text.includes('spicy') || text.includes('hot') || text.includes('masala')) tags.push('Spicy')
  if (text.includes('signature') || text.includes('classic') || text.includes('combo')) tags.push('Popular')
  return tags.slice(0, 1)
}

function DietaryBadge({ item }) {
  const nonVeg = isNonVegItem(item)

  return (
    <span
      className={[
        'inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide',
        nonVeg ? 'text-red-600' : 'text-emerald-700',
      ].join(' ')}
    >
      <DietaryIcon nonVeg={nonVeg} size="sm" />
      {nonVeg ? 'Non veg' : 'Veg'}
    </span>
  )
}

function DietaryIcon({ nonVeg, size = 'md' }) {
  const boxClass = size === 'sm'
    ? 'h-5 w-5 rounded-[5px] border-2'
    : 'h-[18px] w-[18px] rounded-[5px] border-2'
  const markClass = size === 'sm'
    ? nonVeg ? 'h-0 w-0 border-x-[5px] border-b-[9px]' : 'h-2.5 w-2.5'
    : nonVeg ? 'h-0 w-0 border-x-[4px] border-b-[8px]' : 'h-2 w-2'

  return (
    <span
      className={[
        'inline-flex shrink-0 items-center justify-center bg-white',
        boxClass,
        nonVeg ? 'border-red-500' : 'border-emerald-600',
      ].join(' ')}
      aria-hidden
    >
      <span
        className={[
          markClass,
          nonVeg
            ? 'border-x-transparent border-b-red-500'
            : 'rounded-full bg-emerald-600',
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
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 no-scrollbar sm:mx-0 sm:px-0">
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
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-extrabold shadow-sm transition active:scale-[0.98]',
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

function ProductCard({ item, qty, onAdd, onMinus, onOpen }) {
  const unavailable = item.available === false
  const hasOptions = item.hasOptions === true
  const price = displayPrice(item)
  const tags = productTags(item)

  return (
    <article className="group flex h-full min-w-0 flex-col">
      <button
        type="button"
        onClick={onOpen}
        disabled={unavailable}
        className="relative block w-full overflow-hidden rounded-[24px] bg-surface-100 text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FoodImage
          src={item.photo_url}
          name={item.name}
          alt={item.name}
          aspect="4/3"
          rounded="3xl"
          className="bg-[#f7f7f7]"
          imageClassName="object-cover"
          overlay={
            unavailable ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <span className="rounded-full bg-ink-900 px-4 py-2 text-sm font-extrabold text-white">
                  Sold out
                </span>
              </div>
            ) : item.discount_percent ? (
              <div className="absolute left-4 top-4 inline-flex items-center gap-2">
                <span className="rounded-sm bg-red-600 px-2 py-1 text-xs font-extrabold text-white">
                  -{item.discount_percent}%
                </span>
                <span className="rounded-sm bg-red-600 px-2 py-1 text-xs font-extrabold uppercase text-white">
                  Web only
                </span>
              </div>
            ) : null
          }
        />
      </button>
      <div className="flex flex-1 flex-col px-1 pt-3">
        <div className="mb-2 flex h-14 content-start items-start gap-2 overflow-hidden">
          <DietaryBadge item={item} />
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-surface-100 px-2 py-1 text-[11px] font-extrabold uppercase text-ink-600">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <h3 className="h-[3.4rem] text-[17px] font-extrabold leading-snug text-ink-900 line-clamp-2">
          {item.name}
        </h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <MoneyText amount={price} className="font-display text-xl font-extrabold leading-none text-ink-900 sm:text-2xl" />
          {qty > 0 ? (
            <div className="inline-flex h-10 items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-emerald-200">
              <button
                type="button"
                onClick={onMinus}
                className="flex h-10 w-9 items-center justify-center text-lg font-extrabold leading-none text-emerald-700 transition active:bg-emerald-50"
                aria-label={`Remove one ${item.name}`}
              >
                -
              </button>
              <span className="flex h-10 min-w-7 items-center justify-center text-sm font-extrabold tabular-nums text-ink-900">{qty}</span>
              <button
                type="button"
                onClick={onAdd}
                disabled={unavailable}
                className="flex h-10 w-9 items-center justify-center bg-emerald-600 text-white transition active:brightness-95 disabled:opacity-50"
                aria-label={hasOptions ? `Choose another ${item.name}` : `Add another ${item.name}`}
              >
                <Plus className="h-4 w-4" strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              disabled={unavailable}
              aria-label={hasOptions ? `Choose options for ${item.name}` : `Add ${item.name}`}
              className="inline-flex h-10 min-w-[72px] items-center justify-center rounded-xl bg-white px-3 text-xs font-extrabold uppercase tracking-wide text-emerald-700 shadow-sm ring-2 ring-emerald-100 transition active:scale-95 disabled:opacity-50 sm:h-11 sm:min-w-[86px]"
            >
              Add
            </button>
          )}
        </div>
        {item.weight_grams ? (
          <p className="mt-1 text-sm font-medium text-ink-400">{item.weight_grams} g</p>
        ) : null}
        {unavailable && (
          <p className="mt-1 text-xs font-extrabold uppercase tracking-wide text-ink-500">Sold out</p>
        )}
      </div>
    </article>
  )
}

function WebHeader({ cart, query, setQuery, onCartClick }) {
  return (
    <header className="sticky top-0 z-40 border-b border-surface-line bg-white/95 backdrop-blur safe-top">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-800 hover:bg-surface-100"
            aria-label="Back"
          >
            <ArrowLeft className="h-7 w-7" />
          </button>
          <div className="min-w-0 text-center">
            <h1 className="truncate font-serif text-2xl font-semibold italic tracking-tight text-ink-900">
              {RESTAURANT_NAME}
            </h1>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Pickup in 15-20 min</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="hidden h-11 w-11 items-center justify-center rounded-full text-ink-900 hover:bg-surface-100 sm:inline-flex"
              aria-label="Search"
            >
              <Search className="h-7 w-7" />
            </button>
            <button
              type="button"
              className="hidden h-11 w-11 items-center justify-center rounded-full text-ink-900 hover:bg-surface-100 sm:inline-flex"
              aria-label="Favorite"
            >
              <Heart className="h-7 w-7" />
            </button>
            <button
              type="button"
              onClick={onCartClick}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-900 hover:bg-surface-100"
              aria-label={`Open cart with ${cart.totalItems} items`}
            >
              <ShoppingBag className="h-7 w-7" />
              {cart.totalItems > 0 && (
                <span
                  className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-extrabold text-white"
                  style={{ backgroundColor: BRAND_ORANGE }}
                >
                  {cart.totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="pb-3 sm:hidden">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu"
            prefix={<Search className="h-4 w-4" />}
            aria-label="Search menu"
          />
        </div>
      </div>
    </header>
  )
}

function CategoryTabs({ categories, activeCategory, onSelect }) {
  useEffect(() => {
    if (!activeCategory) return
    document
      .querySelector(`[data-web-category-tab="${activeCategory}"]`)
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeCategory])

  return (
    <div className="sticky top-[65px] z-50 border-b border-surface-line bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-6xl overflow-x-auto px-4 no-scrollbar">
        <div className="flex min-w-max gap-8">
          {categories.map((category) => {
            const active = category.id === activeCategory
            return (
              <button
                key={category.id}
                data-web-category-tab={category.id}
                type="button"
                onClick={() => onSelect(category.id)}
                className={[
                  'relative py-4 text-xl font-semibold text-ink-400 transition hover:text-ink-900',
                  active ? 'text-ink-900' : '',
                ].join(' ')}
              >
                {category.name}
                {active && <span className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-ink-900" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CartBar({ cart, onClick }) {
  if (cart.totalItems === 0) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-3 safe-bottom">
      <div className="mx-auto flex max-w-6xl justify-center sm:justify-end">
        <button
          type="button"
          onClick={onClick}
          className="inline-flex min-h-14 w-full max-w-[320px] items-center justify-between gap-3 rounded-2xl px-5 text-white shadow-lg ring-1 transition active:scale-[0.98] sm:w-auto sm:min-w-[240px]"
          style={{ backgroundColor: BRAND_ORANGE, '--tw-ring-color': BRAND_ORANGE }}
        >
          <div className="min-w-0 text-left">
            <span className="block text-[11px] font-extrabold uppercase tracking-wide text-white/80">
              View cart
            </span>
            <MoneyText amount={cart.grandTotal} className="font-display text-2xl font-extrabold leading-none" />
          </div>
          <span className="relative inline-flex">
            <ShoppingBag className="h-7 w-7" />
            <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink-900 px-1 text-[11px] font-extrabold text-white">
              {cart.totalItems}
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}

function CartLine({ line, cart }) {
  return (
    <li className="grid grid-cols-[88px_minmax(0,1fr)_130px] items-center gap-x-3 py-5">
      <FoodImage
        src={line.photoUrl}
        name={line.name}
        alt=""
        aspect="square"
        rounded="2xl"
        className="shadow-sm"
        imageClassName="object-cover"
      />
      <div className="min-w-0">
        <h3 className="text-[19px] font-semibold leading-[1.1] text-ink-900 line-clamp-2">{line.name}</h3>
        {line.variantName && <p className="mt-1.5 text-[16px] font-semibold leading-none text-ink-400">{line.variantName}</p>}
        <p className="mt-3">
          <MoneyText amount={line.unitPrice} className="font-display text-[22px] font-extrabold leading-none text-ink-900" />
        </p>
      </div>
      <div className="flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={() => cart.remove(line.lineKey)}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-100 text-[27px] font-medium leading-none text-ink-800 active:scale-[0.96] active:bg-surface-150"
          aria-label="Remove item"
        >
          -
        </button>
        <span className="w-5 text-center font-display text-[22px] font-extrabold tabular-nums text-ink-900" aria-live="polite">
          {line.quantity}
        </span>
        <button
          type="button"
          onClick={() =>
            cart.add(
              { id: line.menuItemId, name: line.name, photo_url: line.photoUrl, price: line.unitPrice },
              {
                variantId: line.variantId,
                variantName: line.variantName,
                unitPrice: line.unitPrice,
                customizations: line.customizations,
              },
            )
          }
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm transition active:scale-[0.96]"
          style={{ backgroundColor: BRAND_ORANGE }}
          aria-label="Increase quantity"
        >
          <Plus className="h-6 w-6" strokeWidth={2.4} />
        </button>
      </div>
    </li>
  )
}

function CartView({ cart, menuItems, onBack, onPayment, onAdd }) {
  return (
    <main className="min-h-screen bg-surface-100 pb-36 safe-top">
      <div className="mx-auto max-w-[430px]">
        <header className="rounded-b-[28px] bg-white px-4 pb-5 pt-5 shadow-[0_2px_10px_rgb(28_25_23/0.08)]">
          <div className="grid grid-cols-[52px_1fr_52px] items-start gap-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full text-ink-900 hover:bg-surface-100"
              aria-label="Close cart"
            >
              <X className="h-8 w-8" />
            </button>
            <div className="min-w-0 text-center">
              <h1 className="truncate font-display text-[27px] font-extrabold leading-none tracking-normal text-ink-900">
                {RESTAURANT_NAME}
              </h1>
            </div>
            <button
              type="button"
              onClick={cart.clear}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full text-ink-900 hover:bg-surface-100"
              aria-label="Clear cart"
            >
              <Trash2 className="h-8 w-8" />
            </button>
          </div>

          {cart.items.length > 0 ? (
            <ul className="mt-7 divide-y divide-transparent">
              {cart.items.map((line) => (
                <CartLine key={line.lineKey} line={line} cart={cart} />
              ))}
            </ul>
          ) : (
            <div className="rounded-3xl bg-surface-100 p-8 text-center font-semibold text-ink-500">
              Your cart is empty.
            </div>
          )}
          {cart.totalItems > 0 && (
            <div className="mt-2 flex items-center justify-between rounded-2xl bg-surface-100 px-4 py-3">
              <span className="text-sm font-extrabold uppercase tracking-[0.12em] text-ink-500">
                Order total
              </span>
              <MoneyText amount={cart.grandTotal} className="font-display text-[22px] font-extrabold leading-none text-ink-900" />
            </div>
          )}
        </header>

        {cart.totalItems > 0 && (
          <section className="rounded-b-[28px] bg-white px-4 pb-8 pt-4">
            <h2 className="font-display text-[34px] font-extrabold leading-none tracking-normal text-ink-900">
              Anything else?
            </h2>
            <YouMayAlsoLike cart={cart} menuItems={menuItems} onPick={onAdd} />
          </section>
        )}
      </div>

      {cart.totalItems > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-white px-5 py-4 shadow-[0_-10px_30px_rgb(28_25_23/0.08)] safe-bottom">
          <div className="mx-auto flex max-w-[430px] items-center justify-center">
            <button
              type="button"
              onClick={onPayment}
              className="inline-flex min-h-[64px] w-full items-center justify-center gap-4 rounded-full px-6 text-[24px] font-extrabold text-white shadow-lg ring-1 transition active:scale-[0.98]"
              style={{ backgroundColor: BRAND_ORANGE, '--tw-ring-color': BRAND_ORANGE }}
            >
              <span className="whitespace-nowrap">Go to payment</span>
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ink-900">
                <ChevronRight className="h-7 w-7" />
              </span>
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function PaymentView({ cart, items, phone, setPhone, onBack, onConfirmed, settings }) {
  const phoneValid = !phone || /^\d{10}$/.test(phone)
  const [adjustments, setAdjustments] = useState({
    pointsToRedeem: 0,
    couponCode: null,
    couponDiscount: 0,
    pointsDiscount: 0,
    totalDiscount: 0,
    payable: cart.grandTotal,
  })
  const payableAmount = adjustments.payable > 0 || adjustments.totalDiscount > 0
    ? adjustments.payable
    : cart.grandTotal

  return (
    <main className="min-h-screen bg-surface-100 pb-8 safe-top">
      <header className="sticky top-0 z-30 rounded-b-[24px] bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-[430px] items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-900 hover:bg-surface-100"
            aria-label="Back to cart"
          >
            <ArrowLeft className="h-7 w-7" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[25px] font-extrabold leading-none text-ink-900">Payment</h1>
            <p className="mt-1 text-sm font-semibold text-ink-500">
              {cart.totalItems} item{cart.totalItems === 1 ? '' : 's'} · Takeaway
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-500">To pay</p>
            <MoneyText amount={payableAmount} className="font-display text-[24px] font-extrabold leading-none text-ink-900" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[430px] space-y-3 px-4 py-4">
        <section className="rounded-[24px] bg-white p-4 shadow-sm">
          <h2 className="font-display text-xl font-extrabold text-ink-900">Phone number</h2>
          <div className="mt-3">
            <PhoneField
              value={phone}
              onChange={setPhone}
              required={false}
              showHint={false}
              error={phone && !phoneValid ? 'Enter a 10-digit phone number.' : undefined}
            />
          </div>
        </section>

        <section className="rounded-[24px] bg-white p-4 shadow-sm">
          <h2 className="font-display text-xl font-extrabold text-ink-900">Offers</h2>
          <div className="mt-3">
            <CheckoutAdjustments
              phone={phone}
              onPhoneChange={setPhone}
              subtotal={cart.grandTotal}
              showPhoneField={false}
              showHints={false}
              onChange={setAdjustments}
            />
          </div>
        </section>

        <section className="rounded-[24px] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-ink-500" />
              <h2 className="font-display text-xl font-extrabold text-ink-900">Summary</h2>
            </div>
            <MoneyText amount={payableAmount} className="font-display text-xl font-extrabold leading-none text-ink-900" />
          </div>
          <OrderSummary cart={cart} menuItems={items} gstRate={settings.gstRate} stepperSize="sm" showClear={false} />
          {adjustments.couponDiscount > 0 && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
              <span>Coupon {adjustments.couponCode}</span>
              <span>−₹{adjustments.couponDiscount.toLocaleString('en-IN')}</span>
            </div>
          )}
          {adjustments.pointsDiscount > 0 && (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-900">
              <span>Points used</span>
              <span>−₹{adjustments.pointsDiscount.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="mt-4 border-t border-surface-200 pt-4">
            <UpiPaymentFlow
              cart={cart}
              channel="web"
              phone={phoneValid ? phone : ''}
              orderType="takeaway"
              amount={payableAmount}
              loyaltyPointsToRedeem={adjustments.pointsToRedeem}
              couponCode={adjustments.couponCode}
              onConfirmed={onConfirmed}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

export default function WebOrderPage() {
  const settings = useSettings()
  const { categories, items, loading } = useMenu()
  const cart = useCart(settings.gstRate, settings.gstInclusive)
  const [activeCategory, setActiveCategory] = useState(null)
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState('menu')
  const [configItem, setConfigItem] = useState(null)
  const [query, setQuery] = useState('')
  const [dietaryFilter, setDietaryFilter] = useState('all')

  const tabCategories = useMemo(
    () => categories.filter((c) => items.some((i) => i.category_id === c.id && itemMatchesDietaryFilter(i, dietaryFilter))),
    [categories, dietaryFilter, items],
  )
  const selectedCategory = tabCategories.some((category) => category.id === activeCategory)
    ? activeCategory
    : tabCategories[0]?.id ?? null
  const isSearching = query.trim().length > 0

  const groupedItems = useMemo(() => {
    const visibleItems = items.filter((item) => itemMatchesDietaryFilter(item, dietaryFilter))

    if (isSearching) {
      const q = query.toLowerCase()
      return [
        {
          id: 'search',
          name: 'Search results',
          items: visibleItems.filter(
            (item) =>
              item.name.toLowerCase().includes(q) ||
              (item.description ?? '').toLowerCase().includes(q),
          ),
        },
      ]
    }

    return tabCategories
      .map((category) => ({
        ...category,
        items: visibleItems.filter((item) => item.category_id === category.id),
      }))
      .filter((group) => group.items.length > 0)
  }, [dietaryFilter, isSearching, items, query, tabCategories])

  useEffect(() => {
    if (isSearching || tabCategories.length === 0) return undefined

    const updateActiveCategory = () => {
      const stickyOffset = 145
      const current = tabCategories.reduce((active, category) => {
        const section = document.getElementById(`web-category-${category.id}`)
        if (!section) return active
        return section.getBoundingClientRect().top <= stickyOffset ? category.id : active
      }, tabCategories[0]?.id)

      if (current) {
        setActiveCategory((previous) => (previous === current ? previous : current))
      }
    }

    updateActiveCategory()
    window.addEventListener('scroll', updateActiveCategory, { passive: true })
    window.addEventListener('resize', updateActiveCategory)

    return () => {
      window.removeEventListener('scroll', updateActiveCategory)
      window.removeEventListener('resize', updateActiveCategory)
    }
  }, [isSearching, tabCategories])

  const addItem = (item) => {
    if (item.available === false) return
    if (item.hasOptions) setConfigItem(item)
    else cart.add(item)
  }

  const scrollToCategory = (categoryId) => {
    setActiveCategory(categoryId)
    document.getElementById(`web-category-${categoryId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  if (!settings.loaded) return <LoadingSpinner fullscreen />
  if (!settings.webOrderingEnabled) {
    return <ClosedPage title="Online orders closed" message="We're not accepting online orders right now." />
  }

  if (step === 'done') {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
          <CheckCircle2 className="h-12 w-12" />
        </span>
        <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-ink-900">
          Order placed
        </h1>
        <p className="mt-2 max-w-sm text-lg font-medium text-ink-500">
          We&apos;ll contact <span className="font-bold text-ink-900">+91 {phone}</span> when your order is ready.
        </p>
        <button
          type="button"
          onClick={() => {
            setStep('menu')
            setPhone('')
          }}
          className="mt-8 rounded-full px-8 py-4 text-lg font-extrabold text-white"
          style={{ backgroundColor: BRAND_ORANGE }}
        >
          Place another order
        </button>
      </div>
    )
  }

  if (step === 'cart') {
    return (
      <>
        <CartView
          cart={cart}
          menuItems={items}
          onBack={() => setStep('menu')}
          onPayment={() => setStep('payment')}
          onAdd={addItem}
        />
        <ItemConfigSheet
          open={!!configItem}
          item={configItem}
          onClose={() => setConfigItem(null)}
          onAdd={(config) => cart.add(configItem, config)}
        />
      </>
    )
  }

  if (step === 'payment') {
    return (
      <PaymentView
        cart={cart}
        items={items}
        phone={phone}
        setPhone={setPhone}
        onBack={() => setStep('cart')}
        onConfirmed={() => {
          setStep('done')
          cart.clear()
        }}
        settings={settings}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      <WebHeader cart={cart} query={query} setQuery={setQuery} onCartClick={() => setStep('cart')} />

      {!isSearching && tabCategories.length > 0 && (
        <CategoryTabs
          categories={tabCategories}
          activeCategory={selectedCategory}
          onSelect={scrollToCategory}
        />
      )}

      <main className="mx-auto max-w-6xl px-4 py-7">
        <section className="mb-8 overflow-hidden rounded-[24px] border border-orange-100 bg-orange-50 text-ink-900">
          <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">
                Today&apos;s special
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Freshly brewed coffee and cafe bites
              </h2>
              <p className="mt-2 max-w-xl text-sm font-medium text-ink-600 sm:text-base">
                Try today&apos;s chef pick, add your favorites, and use your phone number at checkout for rewards.
              </p>
            </div>
            <div
              className="hidden rounded-2xl bg-white px-6 py-4 text-right text-orange-700 ring-1 ring-orange-100 sm:block"
            >
              <div className="text-sm font-extrabold uppercase tracking-wide">Today only</div>
              <div className="font-display text-4xl font-extrabold">Chef pick</div>
            </div>
          </div>
        </section>

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden max-w-xl flex-1 sm:block">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search menu"
              prefix={<Search className="h-4 w-4" />}
              aria-label="Search menu"
            />
          </div>
          <DietaryFilter value={dietaryFilter} onChange={setDietaryFilter} />
        </div>

        {loading ? (
          <SkeletonGrid count={8} layout="grid" />
        ) : groupedItems.length === 0 || groupedItems.every((group) => group.items.length === 0) ? (
          <div className="rounded-3xl bg-surface-100 px-6 py-12 text-center">
            <h2 className="font-display text-2xl font-extrabold text-ink-900">No matches</h2>
            <p className="mt-2 text-ink-500">Try another search or category.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {groupedItems.map((group) => (
              <section
                key={group.id}
                id={group.id === 'search' ? undefined : `web-category-${group.id}`}
                className="scroll-mt-36"
              >
                <h2 className="mb-5 font-display text-4xl font-extrabold tracking-tight text-ink-900">
                  {group.name}
                </h2>
                <div className="grid grid-cols-2 items-stretch gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                  {group.items.map((item) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      qty={cart.quantityFor(item.id)}
                      onAdd={() => addItem(item)}
                      onMinus={() => cart.removeOneForMenuItem(item.id)}
                      onOpen={() => setConfigItem(item)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <CartBar cart={cart} onClick={() => setStep('cart')} />

      <ItemConfigSheet
        open={!!configItem}
        item={configItem}
        onClose={() => setConfigItem(null)}
        onAdd={(config) => cart.add(configItem, config)}
      />
    </div>
  )
}
