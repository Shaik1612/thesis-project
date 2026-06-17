import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Heart,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Smartphone,
  Trash2,
  Utensils,
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
import { Alert, FoodImage, Input, MoneyText, QtyStepper } from '../../components/ui'

const RESTAURANT_NAME = 'POETRY CAFE'
const BRAND_ORANGE = '#fc8019'
const POINTS_PER_RUPEE = 1

function pointsForSpend(amount) {
  return Math.floor(Math.max(0, Number(amount) || 0) / 10)
}

function productTags(item) {
  const text = `${item.name} ${item.description ?? ''}`.toLowerCase()
  const tags = []
  if (item.discount_percent) tags.push('Today')
  if (text.includes('veg')) tags.push('Veg')
  if (text.includes('spicy') || text.includes('hot') || text.includes('masala')) tags.push('Spicy')
  if (text.includes('signature') || text.includes('classic') || text.includes('combo')) tags.push('Popular')
  return tags.slice(0, 2)
}

function ProductCard({ item, qty, onAdd, onMinus, onOpen }) {
  const unavailable = item.available === false
  const hasOptions = item.hasOptions === true
  const price = displayPrice(item)
  const tags = productTags(item)

  return (
    <article className="group min-w-0">
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
          aspect="square"
          rounded="3xl"
          className="bg-[#f7f7f7]"
          imageClassName="object-contain p-4"
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
      <div className="relative px-3 pt-3">
        {qty > 0 ? (
          <div className="absolute -top-11 right-3 inline-flex h-12 items-center overflow-hidden rounded-full bg-white shadow-lg ring-1 ring-black/5">
            <button
              type="button"
              onClick={onMinus}
              className="flex h-12 w-12 items-center justify-center text-2xl font-bold text-ink-800 transition active:bg-surface-100"
              aria-label={`Remove one ${item.name}`}
            >
              -
            </button>
            <span className="min-w-8 text-center font-display text-lg font-extrabold text-ink-900">{qty}</span>
            <button
              type="button"
              onClick={onAdd}
              disabled={unavailable}
              className="flex h-12 w-12 items-center justify-center text-white transition active:brightness-95 disabled:opacity-50"
              style={{ backgroundColor: BRAND_ORANGE }}
              aria-label={hasOptions ? `Choose another ${item.name}` : `Add another ${item.name}`}
            >
              <Plus className="h-6 w-6" strokeWidth={2.8} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            disabled={unavailable}
            aria-label={hasOptions ? `Choose options for ${item.name}` : `Add ${item.name}`}
            className="absolute -top-12 right-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-ink-900 shadow-lg ring-1 ring-black/5 transition active:scale-95 disabled:opacity-50"
          >
            <Plus className="h-8 w-8" strokeWidth={2.6} />
          </button>
        )}
        {tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-surface-100 px-2 py-1 text-[11px] font-extrabold uppercase text-ink-600">
                {tag}
              </span>
            ))}
          </div>
        )}
        <MoneyText amount={price} className="block font-display text-2xl font-extrabold text-ink-900" />
        <h3 className="mt-1 min-h-[3rem] text-[15px] font-semibold leading-snug text-ink-800 line-clamp-2">
          {item.name}
        </h3>
        {item.weight_grams ? (
          <p className="text-sm font-medium text-ink-400">{item.weight_grams} g</p>
        ) : item.description ? (
          <p className="text-sm font-medium text-ink-400 line-clamp-1">{item.description}</p>
        ) : (
          <p className="text-sm font-medium text-ink-400">Web special</p>
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
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 safe-bottom">
      <div className="mx-auto flex max-w-6xl justify-end">
        <button
          type="button"
          onClick={onClick}
          className="inline-flex min-h-[72px] min-w-[260px] items-center justify-between gap-4 rounded-full px-7 text-white shadow-lg ring-1 transition active:scale-[0.98]"
          style={{ backgroundColor: BRAND_ORANGE, '--tw-ring-color': BRAND_ORANGE }}
        >
          <MoneyText amount={cart.grandTotal} className="font-display text-3xl font-extrabold" />
          <span className="relative inline-flex">
            <ShoppingBag className="h-8 w-8" />
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
    <li className="grid grid-cols-[88px_1fr_auto] gap-4 border-b border-surface-line py-5 last:border-b-0">
      <FoodImage
        src={line.photoUrl}
        name={line.name}
        alt=""
        aspect="square"
        rounded="2xl"
        imageClassName="object-contain p-2"
      />
      <div className="min-w-0">
        <h3 className="text-lg font-semibold leading-tight text-ink-900 line-clamp-2">{line.name}</h3>
        {line.variantName && <p className="mt-1 text-sm font-medium text-ink-400">{line.variantName}</p>}
        <p className="mt-2">
          <MoneyText amount={line.unitPrice} className="font-display text-lg font-extrabold text-ink-900" />
        </p>
      </div>
      <QtyStepper
        size="md"
        count={line.quantity}
        min={0}
        trashAtMin
        onMinus={() => cart.remove(line.lineKey)}
        onPlus={() =>
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
      />
    </li>
  )
}

function CartView({ cart, menuItems, onBack, onPayment, onAdd, phone, setPhone }) {
  const [utensils, setUtensils] = useState(false)

  return (
    <main className="min-h-screen bg-surface-100 pb-36 safe-top">
      <div className="mx-auto max-w-5xl">
        <header className="sticky top-0 z-30 rounded-b-[32px] bg-white px-4 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full text-ink-800 hover:bg-surface-100"
              aria-label="Close cart"
            >
              <X className="h-8 w-8" />
            </button>
            <div className="text-center">
              <h1 className="font-display text-2xl font-extrabold tracking-tight">{RESTAURANT_NAME}</h1>
              <p className="text-lg font-semibold text-ink-400">
                Pickup in 15-20 min · <MoneyText amount={cart.grandTotal} />
              </p>
            </div>
            <button
              type="button"
              onClick={cart.clear}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full text-ink-800 hover:bg-surface-100"
              aria-label="Clear cart"
            >
              <Trash2 className="h-7 w-7" />
            </button>
          </div>

          {cart.items.length > 0 ? (
            <ul className="mt-4">
              {cart.items.map((line) => (
                <CartLine key={line.lineKey} line={line} cart={cart} />
              ))}
            </ul>
          ) : (
            <div className="rounded-3xl bg-surface-100 p-8 text-center font-semibold text-ink-500">
              Your cart is empty.
            </div>
          )}
        </header>

        <section className="mt-3 rounded-[28px] bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Utensils className="h-8 w-8 text-ink-900" />
              <span className="text-2xl font-semibold text-ink-900">Utensils</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={utensils}
              onClick={() => setUtensils((v) => !v)}
              className={[
                'flex h-12 w-20 items-center rounded-full p-1 transition',
                utensils ? 'justify-end bg-ink-900' : 'justify-start bg-surface-150',
              ].join(' ')}
            >
              <span className="h-10 w-10 rounded-full bg-white shadow-sm" />
            </button>
          </div>
        </section>

        <section className="mt-3 rounded-[28px] bg-white px-4 py-5">
          <h2 className="font-display text-2xl font-extrabold">Rewards</h2>
          <p className="mt-1 text-sm font-medium text-ink-500">
            Points are linked to your phone number. Add it now or skip and continue.
          </p>
          <div className="mt-4">
            <PhoneField value={phone} onChange={setPhone} label="Phone for points" />
          </div>
          <div className="mt-3 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-900">
            This order earns about {pointsForSpend(cart.grandTotal)} point{pointsForSpend(cart.grandTotal) === 1 ? '' : 's'} after payment.
          </div>
        </section>

        {cart.totalItems > 0 && (
          <section className="mt-3 rounded-[28px] bg-white px-4 py-5">
            <h2 className="font-display text-3xl font-extrabold">Anything else?</h2>
            <YouMayAlsoLike cart={cart} menuItems={menuItems} onPick={onAdd} />
          </section>
        )}
      </div>

      {cart.totalItems > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-white/90 px-4 py-4 backdrop-blur safe-bottom">
          <div className="mx-auto flex max-w-5xl items-center justify-end">
            <button
              type="button"
              onClick={onPayment}
              className="inline-flex min-h-[72px] min-w-[320px] items-center justify-center gap-4 rounded-full px-8 text-2xl font-extrabold text-white shadow-lg ring-1 transition active:scale-[0.98]"
              style={{ backgroundColor: BRAND_ORANGE, '--tw-ring-color': BRAND_ORANGE }}
            >
              Go to payment
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink-900">
                <ChevronRight className="h-7 w-7" />
              </span>
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function PaymentView({ cart, items, phone, setPhone, name, setName, onBack, onConfirmed, settings }) {
  const phoneValid = /^\d{10}$/.test(phone)
  const nameValid = name.trim().length > 0
  const canPay = phoneValid && nameValid && cart.totalItems > 0
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
  const earnedPoints = pointsForSpend(payableAmount)

  return (
    <main className="min-h-screen bg-surface-100 pb-10 safe-top">
      <header className="sticky top-0 z-30 border-b border-surface-line bg-white px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-500 hover:bg-surface-100"
            aria-label="Back to cart"
          >
            <ArrowLeft className="h-8 w-8" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-extrabold">Payment</h1>
            <p className="text-sm font-semibold text-ink-500">
              Takeaway · {cart.totalItems} item{cart.totalItems === 1 ? '' : 's'} · Ready in 15-20 min
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-surface-line">
          <h2 className="font-display text-xl font-extrabold">Contact details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
            <PhoneField
              value={phone}
              onChange={setPhone}
              required
              error={phone && !phoneValid ? 'Enter a 10-digit phone number.' : undefined}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-surface-line">
          <h2 className="font-display text-xl font-extrabold">Rewards & coupon</h2>
          <p className="mt-1 text-sm font-medium text-ink-500">
            Apply points or a coupon code before paying. You&apos;ll earn {earnedPoints} pt{earnedPoints === 1 ? '' : 's'} on this order.
          </p>
          <div className="mt-4">
            <CheckoutAdjustments
              phone={phone}
              onPhoneChange={setPhone}
              subtotal={cart.grandTotal}
              showPhoneField={false}
              onChange={setAdjustments}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 ring-1 ring-surface-line">
          <h2 className="mb-4 font-display text-xl font-extrabold text-ink-900">Pay with UPI</h2>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white">
                  <Smartphone className="h-7 w-7 text-emerald-600" />
                </span>
                <div>
                  <span className="block text-lg font-bold text-ink-900">UPI</span>
                  <span className="text-sm font-medium text-ink-500">PhonePe, GPay, Paytm, BHIM</span>
                </div>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-5">
              {!canPay ? (
                <Alert tone="warning" title="Add contact details">
                  Enter your name and phone number before opening payment.
                </Alert>
              ) : (
                <UpiPaymentFlow
                  cart={cart}
                  channel="web"
                  phone={phone}
                  orderType="takeaway"
                  amount={payableAmount}
                  loyaltyPointsToRedeem={adjustments.pointsToRedeem}
                  couponCode={adjustments.couponCode}
                  onConfirmed={onConfirmed}
                />
              )}
            </div>
          </div>
        </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-surface-line">
            <div className="mb-3 flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-ink-500" />
              <h2 className="font-display text-xl font-extrabold text-ink-900">Summary</h2>
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
            <div className="mt-4 flex items-end justify-between border-t border-surface-line pt-4">
              <span className="font-display text-base font-extrabold text-ink-900">Payable</span>
              <MoneyText amount={payableAmount} className="font-display text-3xl font-extrabold text-ink-900" />
            </div>
          </div>
        </aside>
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
  const [name, setName] = useState('')
  const [step, setStep] = useState('menu')
  const [configItem, setConfigItem] = useState(null)
  const [query, setQuery] = useState('')

  const tabCategories = useMemo(
    () => categories.filter((c) => items.some((i) => i.category_id === c.id)),
    [categories, items],
  )
  const selectedCategory = activeCategory ?? tabCategories[0]?.id ?? null
  const isSearching = query.trim().length > 0

  const groupedItems = useMemo(() => {
    if (isSearching) {
      const q = query.toLowerCase()
      return [
        {
          id: 'search',
          name: 'Search results',
          items: items.filter(
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
        items: items.filter((item) => item.category_id === category.id),
      }))
      .filter((group) => group.items.length > 0)
  }, [isSearching, items, query, tabCategories])

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
            setName('')
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
          phone={phone}
          setPhone={setPhone}
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
        name={name}
        setName={setName}
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
        <section className="mb-8 overflow-hidden rounded-[28px] bg-ink-900 text-white">
          <div className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.18em]" style={{ color: BRAND_ORANGE }}>
                Today&apos;s special
              </p>
              <h2 className="mt-2 font-display text-4xl font-extrabold tracking-tight">
                Freshly brewed coffee and cafe bites
              </h2>
              <p className="mt-2 max-w-xl text-base font-medium text-white/70">
                Try today&apos;s chef pick, add your favorites, and use your phone number at checkout for rewards.
              </p>
            </div>
            <div
              className="hidden rounded-3xl px-6 py-4 text-right text-white sm:block"
              style={{ backgroundColor: BRAND_ORANGE }}
            >
              <div className="text-sm font-extrabold uppercase tracking-wide">Today only</div>
              <div className="font-display text-4xl font-extrabold">Chef pick</div>
            </div>
          </div>
        </section>

        <div className="mb-7 hidden max-w-xl sm:block">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu"
            prefix={<Search className="h-4 w-4" />}
            aria-label="Search menu"
          />
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
                <div className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
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
