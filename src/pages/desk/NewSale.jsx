import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, Wallet, Search, Trash2, Utensils, Receipt, Hash,
  ShoppingBag, Armchair,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useMenu } from '../../hooks/useMenu'
import { useCart } from '../../hooks/useCart'
import { displayPrice } from '../../hooks/useMenu'
import { useOrders } from '../../hooks/useOrders'
import ItemConfigSheet from '../../components/ItemConfigSheet'
import CheckoutAdjustments from '../../components/CheckoutAdjustments'
import {
  Button, EmptyState, Input, KeyHint, MoneyText, QtyStepper, StatusBadge, Tooltip, useToast,
} from '../../components/ui'
import { orderCode } from '../../lib/orderTotals'
import { humanizeError } from './shared'
import CashModal from './CashModal'

export default function NewSale({ settings }) {
  const { categories, items, loading } = useMenu()
  const { orders: activeDeskOrders } = useOrders({ channel: 'desk', status: ['pending', 'accepted', 'preparing', 'ready'] })
  const cart = useCart(settings.gstRate, settings.gstInclusive)
  const { push } = useToast()
  const [activeCategory, setActiveCategory] = useState(null)
  const [query, setQuery] = useState('')
  const [orderType, setOrderType] = useState('dine_in')
  const [pay, setPay] = useState(null) // null | 'cash'
  const [submitting, setSubmitting] = useState(false)
  const [configItem, setConfigItem] = useState(null)
  const [customerPhone, setCustomerPhone] = useState('')
  const [adjustments, setAdjustments] = useState({
    pointsToRedeem: 0,
    couponCode: null,
    couponDiscount: 0,
    pointsDiscount: 0,
    totalDiscount: 0,
    payable: 0,
  })
  const searchRef = useRef(null)

  const displayCat = activeCategory ?? categories[0]?.id ?? null
  const canPlaceOrder = cart.items.length > 0
  const payable = adjustments.payable > 0 || adjustments.totalDiscount > 0
    ? adjustments.payable
    : cart.grandTotal

  // `/` focuses search. F1 opens cash settlement.
  useEffect(() => {
    function onKey(e) {
      const target = e.target
      const isInput = target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      if (e.key === '/' && !isInput) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'F1' && settings.cashEnabled && cart.items.length > 0 && !submitting && canPlaceOrder) {
        e.preventDefault()
        setPay('cash')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [settings.cashEnabled, cart.items.length, submitting, canPlaceOrder])

  const list = useMemo(() => {
    return items.filter((i) => {
      if (displayCat && i.category_id !== displayCat) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        if (!i.name.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [items, displayCat, query])

  function addItem(item) {
    if (item.hasOptions) setConfigItem(item)
    else cart.add(item)
  }

  async function placeCashOrder(tenderedAmount) {
    if (submitting || !canPlaceOrder) return
    setSubmitting(true)
    try {
      const { data: order, error } = await supabase.rpc('create_desk_cash_order', {
        p_order_type: orderType,
        p_items: cart.items.map((i) => ({
          menu_item_id: i.menuItemId,
          variant_id: i.variantId ?? null,
          quantity: i.quantity,
          customizations: i.customizations ?? {},
        })),
        p_tendered_amount: tenderedAmount,
        p_customer_phone: adjustments.phone || null,
        p_coupon_code: adjustments.couponCode ?? null,
        p_points_to_redeem: adjustments.pointsToRedeem || 0,
      })
      if (error) throw error

      push({ type: 'success', title: 'Ticket placed', message: `${orderCode(order)} sent to kitchen.` })
      cart.clear()
      setCustomerPhone('')
      setPay(null)
    } catch (e) {
      const { message, details } = humanizeError(e, 'The ticket couldn\'t reach the kitchen. Try again.')
      push({ type: 'error', title: 'Failed to place order', message, details })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid h-full grid-cols-[200px_minmax(0,1fr)_440px] 2xl:grid-cols-[220px_minmax(0,1fr)_480px]">
      {/* Category rail — vertical, dense. Keyboard-driven feel. */}
      <aside className="flex min-h-0 flex-col border-r border-surface-line bg-surface-0">
        <div className="border-b border-surface-line px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-400">Categories</p>
          <p className="font-display text-base font-extrabold text-ink-900">{categories.length} sections</p>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <ul className="py-1.5">
            {categories.map((c) => {
              const active = displayCat === c.id
              const count = items.filter((i) => i.category_id === c.id).length
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiveCategory(c.id)}
                    className={[
                      'group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      active
                        ? 'bg-ink-900 text-white'
                        : 'text-ink-700 hover:bg-surface-100',
                    ].join(' ')}
                  >
                    <span className={[
                      'h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
                      active ? 'bg-brand-400' : 'bg-ink-300 group-hover:bg-brand-400',
                    ].join(' ')} />
                    <span className="flex-1 truncate text-sm font-semibold">{c.name}</span>
                    <span className={[
                      'font-mono text-[11px] font-bold tabular-nums',
                      active ? 'text-white/60' : 'text-ink-400',
                    ].join(' ')}>
                      {String(count).padStart(2, '0')}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="border-t border-surface-line bg-surface-50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">Shortcut</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-ink-600">
            <KeyHint keys="/" /> search · <KeyHint keys="F1" /> cash
          </p>
        </div>
      </aside>

      {/* Menu picker. */}
      <section className="flex min-w-0 flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-surface-line bg-surface-0 px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
            <Utensils className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-extrabold text-ink-900">
              {query.trim()
                ? `${list.length} search result${list.length === 1 ? '' : 's'}`
                : `${list.length} item${list.length === 1 ? '' : 's'} available`}
            </p>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">
              {categories.find((c) => c.id === displayCat)?.name ?? 'all menu'}
            </p>
          </div>
          <Input
            ref={searchRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items…"
            prefix={<Search className="h-4 w-4" />}
            suffix={<KeyHint keys="/" />}
            wrapperClassName="w-[300px]"
          />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 console-canvas">
          {loading ? (
            <p className="py-12 text-center text-sm text-ink-500">Loading menu…</p>
          ) : list.length === 0 ? (
            <EmptyState title="No items match" message="Try a different category or clear the search." />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {list.map((item) => (
                <MenuTile
                  key={item.id}
                  item={item}
                  qty={cart.quantityFor(item.id)}
                  onAdd={() => addItem(item)}
                />
              ))}
            </div>
          )}
        </div>

        {activeDeskOrders.length > 0 && (
          <ActiveTicketsRail orders={activeDeskOrders} />
        )}
      </section>

      {/* Docket / ticket panel. */}
      <aside className="flex min-w-0 flex-col bg-surface-50 px-4 pt-4">
        <div className="docket flex-1 overflow-hidden rounded-t-lg">
          <div className="docket-perf-top" />
          <div className="flex flex-col" style={{ height: 'calc(100% - 10px)' }}>
            {/* Ticket header. */}
            <header className="flex items-start justify-between gap-3 border-b border-dashed border-ink-300/40 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-400">Current ticket</p>
                <p className="mt-0.5 flex items-center gap-1.5 font-mono text-lg font-bold tabular-nums text-ink-900">
                  <Hash className="h-4 w-4 text-ink-400" />
                  KOT-PENDING
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="channel-chip" data-channel="desk">Desk</span>
                <span className="font-mono text-[11px] font-semibold text-ink-500">
                  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
              </div>
            </header>

            {/* Order type. Counter mode does not require a table number. */}
            <div className="space-y-3 border-b border-dashed border-ink-300/40 px-5 py-4">
              <div className="grid grid-cols-2 gap-2">
                <TypePill
                  active={orderType === 'dine_in'}
                  onClick={() => setOrderType('dine_in')}
                  icon={Armchair}
                  label="Dine in"
                />
                <TypePill
                  active={orderType === 'takeaway'}
                  onClick={() => setOrderType('takeaway')}
                  icon={ShoppingBag}
                  label="Takeaway"
                />
              </div>
              <p className="rounded-md bg-surface-100 px-3 py-2 text-xs font-semibold text-ink-600 ring-1 ring-inset ring-surface-line">
                {orderType === 'dine_in'
                  ? 'Counter dine-in: no table number needed.'
                  : 'Packed as takeaway from the counter.'}
              </p>
            </div>

            {/* Items list. */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-3">
              {cart.items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-ink-500">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-100 text-ink-400">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <p className="font-display text-sm font-bold text-ink-700">No items yet</p>
                  <p className="max-w-[200px] text-xs">
                    Tap an item, or press <KeyHint keys="/" /> to search.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {cart.items.map((i, idx) => (
                    <li key={i.lineKey} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink-900 font-mono text-[11px] font-bold tabular-nums text-white">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-semibold leading-snug text-ink-900">
                            {i.name}
                            {i.variantName && <span className="font-normal text-ink-600"> · {i.variantName}</span>}
                          </p>
                          <span className="font-mono text-sm font-bold tabular-nums text-ink-900">
                            ₹{(i.unitPrice * i.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
                            {i.quantity} × ₹{i.unitPrice.toLocaleString('en-IN')}
                          </span>
                          <QtyStepper
                            size="sm"
                            count={i.quantity}
                            min={0}
                            trashAtMin
                            onMinus={() => cart.remove(i.lineKey)}
                            onPlus={() =>
                              cart.add(
                                { id: i.menuItemId, name: i.name, photo_url: i.photoUrl, price: i.unitPrice },
                                {
                                  variantId: i.variantId,
                                  variantName: i.variantName,
                                  unitPrice: i.unitPrice,
                                  customizations: i.customizations,
                                },
                              )
                            }
                          />
                        </div>
                        {(i.customizations?.removed_ingredients?.length > 0 || i.customizations?.special_instructions) && (
                          <p className="mt-1 truncate font-mono text-[10px] text-ink-500">
                            {i.customizations?.removed_ingredients?.length > 0 &&
                              `– ${i.customizations.removed_ingredients.length} mod`}
                            {i.customizations?.special_instructions &&
                              ` · "${i.customizations.special_instructions}"`}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Adjustments — phone, loyalty, coupon. */}
            {cart.items.length > 0 && (
              <div className="border-t border-dashed border-ink-300/40 px-5 py-4">
                <CheckoutAdjustments
                  phone={customerPhone}
                  onPhoneChange={setCustomerPhone}
                  subtotal={cart.grandTotal}
                  onChange={setAdjustments}
                />
              </div>
            )}

            {/* Totals + action. */}
            <div className="border-t border-dashed border-ink-300/40 px-5 py-4">
              <dl className="space-y-1 text-sm">
                <LedgerRow label="Items">
                  <span className="font-mono tabular-nums">{cart.totalItems}</span>
                </LedgerRow>
                <LedgerRow label="Subtotal">
                  <span className="font-mono tabular-nums">₹{cart.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </LedgerRow>
                <LedgerRow label={`GST ${settings.gstRate}%${settings.gstInclusive ? ' (incl.)' : ''}`}>
                  <span className="font-mono tabular-nums">₹{cart.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </LedgerRow>
                {adjustments.totalDiscount > 0 && (
                  <LedgerRow label={adjustments.couponCode ? `Coupon ${adjustments.couponCode}` : 'Discount'}>
                    <span className="font-mono tabular-nums text-emerald-700">−₹{adjustments.totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </LedgerRow>
                )}
              </dl>

              <div className="mt-3 flex items-end justify-between gap-3 border-t-2 border-ink-900 pt-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-500">Grand total</p>
                  <p className="readout font-display text-3xl font-extrabold text-ink-900">
                    ₹{payable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                {cart.items.length > 0 && (
                  <button
                    type="button"
                    onClick={cart.clear}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-ink-500 ring-1 ring-inset ring-surface-line hover:text-status-cancelled hover:ring-status-cancelled/30"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2">
                {settings.cashEnabled ? (
                  <Tooltip content={canPlaceOrder ? 'Press F1' : 'Add at least one item'} side="top">
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      disabled={!canPlaceOrder}
                      onClick={() => setPay('cash')}
                      iconLeft={<Wallet className="h-4 w-4" />}
                    >
                      Settle in cash · ₹{payable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Button>
                  </Tooltip>
                ) : (
                  <Button variant="secondary" size="lg" fullWidth disabled iconLeft={<Wallet className="h-4 w-4" />}>
                    Cash disabled in settings
                  </Button>
                )}
                <p className="text-center font-mono text-[10px] uppercase tracking-wider text-ink-400">
                  UPI orders flow via kiosk / web channel
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <CashModal
        open={pay === 'cash'}
        subject={{
          code: 'NEW',
          channel: 'desk',
          where: orderType === 'dine_in' ? 'Dine in' : 'Takeaway',
          isNew: true,
        }}
        amount={payable}
        onClose={() => setPay(null)}
        onConfirm={placeCashOrder}
        busy={submitting}
      />

      <ItemConfigSheet
        open={!!configItem}
        item={configItem}
        onClose={() => setConfigItem(null)}
        onAdd={(config) => cart.add(configItem, config)}
      />
    </div>
  )
}

function TypePill({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold transition-all',
        active
          ? 'bg-ink-900 text-white shadow-sm ring-1 ring-inset ring-ink-900'
          : 'bg-surface-100 text-ink-600 ring-1 ring-inset ring-surface-line hover:bg-surface-150',
      ].join(' ')}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function ActiveTicketsRail({ orders }) {
  return (
    <div className="border-t border-surface-line bg-surface-0 px-4 py-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
          Active desk tickets in kitchen
        </p>
        <span className="font-mono text-[10px] font-bold tabular-nums text-ink-500">
          {orders.length}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
        {orders.slice(0, 8).map((o) => (
          <div
            key={o.id}
            className="flex shrink-0 items-center gap-2 rounded-md bg-surface-100 px-2.5 py-1.5 ring-1 ring-inset ring-surface-line"
          >
            <span className="font-mono text-[11px] font-bold text-ink-900">{orderCode(o)}</span>
            <span className="text-[10px] text-ink-500">·</span>
            <span className="text-[10px] font-medium text-ink-600">
              {o.order_type === 'dine_in' ? 'Dine in' : 'Takeaway'}
            </span>
            <StatusBadge status={o.status} size="sm" />
          </div>
        ))}
      </div>
    </div>
  )
}

function MenuTile({ item, qty, onAdd }) {
  const unavailable = item.available === false
  const hasVariants = (item.variants?.length ?? 0) > 0

  return (
    <button
      type="button"
      disabled={unavailable}
      onClick={onAdd}
      className={[
        'group relative flex h-[96px] flex-col justify-between rounded-lg bg-surface-0 p-3 text-left ring-1 ring-inset ring-surface-line transition-all',
        unavailable
          ? 'cursor-not-allowed opacity-50'
          : 'hover:-translate-y-px hover:shadow-md hover:ring-brand-400 active:translate-y-0',
      ].join(' ')}
    >
      {qty > 0 && (
        <span className="absolute -right-1.5 -top-1.5 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-brand-500 px-1.5 font-mono text-[11px] font-bold tabular-nums text-white ring-2 ring-surface-0">
          ×{qty}
        </span>
      )}
      <div className="flex-1">
        <span className="block pr-4 text-[13px] font-semibold leading-snug text-ink-900 line-clamp-2">
          {item.name}
        </span>
        {hasVariants && (
          <span className="mt-0.5 inline-block font-mono text-[9px] font-bold uppercase tracking-wider text-ink-400">
            From
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <MoneyText amount={displayPrice(item)} className="readout font-display text-base font-extrabold text-brand-700" />
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-100 text-ink-700 transition-colors group-hover:bg-brand-500 group-hover:text-white">
          <Plus className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  )
}

function LedgerRow({ label, children }) {
  return (
    <div className="ledger-row text-[13px]">
      <dt className="text-ink-600">{label}</dt>
      <span className="ledger-leader" />
      <dd className="font-medium text-ink-900">{children}</dd>
    </div>
  )
}
