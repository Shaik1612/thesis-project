import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, Wallet, Search, Trash2, Receipt, StickyNote,
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
  Button, EmptyState, Input, KeyHint, Modal, MoneyText, QtyStepper, StatusBadge, useToast,
} from '../../components/ui'
import { orderCode } from '../../lib/orderTotals'
import { humanizeError } from './shared'
import CashModal from './CashModal'

const MAX_NOTE_LENGTH = 140

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
  const [showAdjustments, setShowAdjustments] = useState(false)
  const [customerPhone, setCustomerPhone] = useState('')
  const [editingNote, setEditingNote] = useState(null)
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
        p_customer_phone: customerPhone || null,
        p_coupon_code: adjustments.couponCode ?? null,
        p_points_to_redeem: adjustments.pointsToRedeem || 0,
      })
      if (error) throw error

      push({ type: 'success', title: 'Ticket placed', message: `${orderCode(order)} sent to kitchen.` })
      cart.clear()
      setCustomerPhone('')
      setEditingNote(null)
      setShowAdjustments(false)
      setPay(null)
    } catch (e) {
      const { message, details } = humanizeError(e, 'The ticket couldn\'t reach the kitchen. Try again.')
      push({ type: 'error', title: 'Failed to place order', message, details })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid h-full grid-cols-[180px_minmax(0,1fr)_480px] 2xl:grid-cols-[190px_minmax(0,1fr)_520px]">
      <aside className="flex min-h-0 flex-col border-r border-surface-line bg-surface-0">
        <div className="border-b border-surface-line px-4 py-3">
          <p className="text-sm font-semibold text-ink-900">Categories</p>
          <p className="text-xs text-ink-500">{categories.length} sections</p>
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
                      'group flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors',
                      active
                        ? 'bg-brand-500 text-white'
                        : 'text-ink-700 hover:bg-surface-100',
                    ].join(' ')}
                  >
                    <span className={[
                      'h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
                      active ? 'bg-white' : 'bg-ink-300 group-hover:bg-brand-400',
                    ].join(' ')} />
                    <span className="flex-1 truncate text-sm font-semibold">{c.name}</span>
                    <span className={[
                      'font-mono text-[11px] font-bold tabular-nums',
                      active ? 'text-white/80' : 'text-ink-400',
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
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-600">
            <KeyHint keys="/" /> Search
          </p>
        </div>
      </aside>

      <section className="flex min-w-0 flex-col overflow-hidden">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-surface-line bg-surface-0 px-4">
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-ink-900">
              {query.trim()
                ? `${list.length} search result${list.length === 1 ? '' : 's'}`
                : `${list.length} item${list.length === 1 ? '' : 's'} available`}
            </p>
            <p className="text-xs font-medium text-ink-500">
              {categories.find((c) => c.id === displayCat)?.name ?? 'all menu'}
            </p>
          </div>
          <Input
            ref={searchRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items"
            prefix={<Search className="h-4 w-4" />}
            suffix={<KeyHint keys="/" />}
            wrapperClassName="w-[300px]"
          />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin bg-surface-50 px-4 py-4">
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

      <aside className="flex min-h-0 min-w-0 flex-col border-l border-surface-line bg-surface-0">
        <div className="shrink-0 border-b border-surface-line px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          {cart.items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-ink-500">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-100 text-ink-400">
                <Receipt className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-ink-700">No items yet</p>
              <p className="max-w-[200px] text-xs">
                Tap an item from the menu, or press <KeyHint keys="/" /> to search.
              </p>
            </div>
          ) : (
            <>
              <ul className="flex flex-col gap-4">
                {cart.items.map((i, idx) => {
                  const note = i.customizations?.special_instructions ?? ''
                  const editorId = noteEditorId(i)
                  const noteOpen = editingNote === editorId
                  return (
                    <li key={i.lineKey} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-500 font-mono text-[11px] font-bold tabular-nums text-white">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold leading-snug text-ink-900">
                            {i.name}
                            {i.variantName && <span className="font-normal text-ink-600"> · {i.variantName}</span>}
                          </p>
                          <span className="font-mono text-sm font-bold tabular-nums text-ink-900">
                            ₹{(i.unitPrice * i.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-500">
                            {i.quantity} × ₹{i.unitPrice.toLocaleString('en-IN')}
                          </span>
                          <QtyStepper
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
                        {(i.customizations?.removed_ingredients?.length > 0 || note) && (
                          <p className="mt-1 truncate text-[11px] text-ink-500">
                            {i.customizations?.removed_ingredients?.length > 0 &&
                              `${i.customizations.removed_ingredients.length} mod`}
                            {note && <span className="font-medium text-ink-700"> {note}</span>}
                          </p>
                        )}
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setEditingNote(noteOpen ? null : editorId)}
                            className={[
                              'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ring-1 ring-inset transition-colors',
                              noteOpen || note
                                ? 'bg-brand-50 text-brand-700 ring-brand-100'
                                : 'bg-surface-100 text-ink-600 ring-surface-line hover:bg-surface-150',
                            ].join(' ')}
                          >
                            <StickyNote className="h-3.5 w-3.5" />
                            {note ? 'Edit note' : 'Add note'}
                          </button>

                          {noteOpen && (
                            <div className="mt-2 rounded-lg bg-surface-50 p-2 ring-1 ring-inset ring-surface-line">
                              <textarea
                                value={note}
                                readOnly
                                rows={2}
                                placeholder="Tap keys below"
                                className="w-full resize-none rounded-md bg-surface-0 px-2.5 py-2 text-sm text-ink-900 ring-1 ring-inset ring-surface-line placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                              />
                              <NoteTouchKeypad
                                value={note}
                                onChange={(next) => cart.updateLineNote(i.lineKey, next)}
                                onDone={() => setEditingNote(null)}
                              />
                              <div className="mt-1 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => cart.updateLineNote(i.lineKey, '')}
                                  className="text-[11px] font-semibold text-ink-500 hover:text-status-cancelled"
                                >
                                  Clear note
                                </button>
                                <span className="font-mono text-[10px] text-ink-400">
                                  {note.length}/{MAX_NOTE_LENGTH}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-surface-line px-5 py-5">
          <dl className="space-y-1.5 text-sm">
            <LedgerRow label="Items">
              <span className="font-mono tabular-nums">{cart.totalItems}</span>
            </LedgerRow>
            <LedgerRow label="Subtotal">
              <span className="font-mono tabular-nums">
                ₹{cart.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </LedgerRow>
            <LedgerRow label={`GST ${settings.gstRate}%${settings.gstInclusive ? ' (incl.)' : ''}`}>
              <span className="font-mono tabular-nums">
                ₹{cart.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </LedgerRow>
          </dl>

          <div className="mt-3 flex items-end justify-between gap-3 border-t border-surface-line pt-3">
            <div>
              <p className="text-xs font-semibold text-ink-500">Grand total</p>
              <p className="font-mono text-3xl font-bold tabular-nums text-ink-900">
                ₹{payable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            {cart.items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  cart.clear()
                  setCustomerPhone('')
                  setEditingNote(null)
                  setShowAdjustments(false)
                }}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-ink-500 ring-1 ring-inset ring-surface-line hover:text-status-cancelled hover:ring-status-cancelled/30"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>

          <div className="mt-3">
            {cart.items.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAdjustments(true)}
                className="mb-2 w-full rounded-md px-3 py-2 text-sm font-semibold text-ink-700 ring-1 ring-inset ring-surface-line hover:bg-surface-100"
              >
                {adjustments.totalDiscount > 0
                  ? `Customer / coupon · −₹${adjustments.totalDiscount.toLocaleString('en-IN')}`
                  : customerPhone
                    ? `Customer · ${customerPhone}`
                    : 'Customer / coupon'}
              </button>
            )}
            {settings.cashEnabled ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canPlaceOrder || submitting}
                onClick={() => setPay('cash')}
                iconLeft={<Wallet className="h-5 w-5" />}
              >
                {canPlaceOrder
                  ? `Take cash · ₹${payable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                  : 'Add items to start'}
              </Button>
            ) : (
              <Button variant="secondary" size="lg" fullWidth disabled iconLeft={<Wallet className="h-5 w-5" />}>
                Cash disabled in settings
              </Button>
            )}
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

      <Modal
        open={showAdjustments}
        onClose={() => setShowAdjustments(false)}
        title="Customer / coupon"
        subtitle={`Current total ₹${cart.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        size="md"
        footer={<Button variant="primary" onClick={() => setShowAdjustments(false)}>Done</Button>}
      >
        <CheckoutAdjustments
          phone={customerPhone}
          onPhoneChange={setCustomerPhone}
          subtotal={cart.grandTotal}
          onChange={setAdjustments}
          showHints={false}
          compact
        />
      </Modal>

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
        'group flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold transition-colors',
        active
          ? 'bg-brand-500 text-white ring-1 ring-inset ring-brand-600'
          : 'bg-surface-100 text-ink-600 ring-1 ring-inset ring-surface-line hover:bg-surface-150',
      ].join(' ')}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function noteEditorId(item) {
  const removed = [...(item.customizations?.removed_ingredients ?? [])].sort().join(',')
  return `${item.menuItemId}::${item.variantId ?? ''}::${removed}`
}

function NoteTouchKeypad({ value, onChange, onDone }) {
  const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

  const append = (token) => {
    if (value.length >= MAX_NOTE_LENGTH) return
    onChange(`${value}${token}`.slice(0, MAX_NOTE_LENGTH))
  }

  return (
    <div className="mt-2 space-y-1.5" aria-label="Note keypad">
      {rows.map((row) => (
        <div key={row} className="grid grid-cols-10 gap-1">
          {[...row].map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => append(value.length === 0 || value.endsWith(' ') ? letter : letter.toLowerCase())}
              className="flex h-8 items-center justify-center rounded-md bg-surface-0 text-xs font-bold text-ink-800 ring-1 ring-inset ring-surface-line transition-colors hover:bg-brand-50 hover:text-brand-700"
            >
              {letter}
            </button>
          ))}
        </div>
      ))}
      <div className="grid grid-cols-[1fr_2fr_1fr] gap-1">
        <button
          type="button"
          onClick={() => onChange(value.slice(0, -1))}
          className="h-9 rounded-md bg-surface-0 text-xs font-bold text-ink-700 ring-1 ring-inset ring-surface-line hover:bg-surface-100"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => append(' ')}
          className="h-9 rounded-md bg-surface-0 text-xs font-bold text-ink-700 ring-1 ring-inset ring-surface-line hover:bg-surface-100"
        >
          Space
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-9 rounded-md bg-brand-500 text-xs font-bold text-white shadow-brand hover:bg-brand-600"
        >
          Done
        </button>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {['-', '/', '&', '.', ',', '#'].map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => append(token)}
            className="h-8 rounded-md bg-surface-0 text-sm font-bold text-ink-700 ring-1 ring-inset ring-surface-line hover:bg-surface-100"
          >
            {token}
          </button>
        ))}
      </div>
    </div>
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
        'group relative flex h-[96px] flex-col justify-between rounded-md bg-surface-0 p-3 text-left ring-1 ring-inset ring-surface-line transition-colors',
        unavailable
          ? 'cursor-not-allowed opacity-50'
          : 'hover:bg-surface-100 hover:ring-ink-300',
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
          <span className="mt-1 inline-block font-mono text-[9px] font-bold uppercase tracking-wider text-ink-400">
            From
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <MoneyText amount={displayPrice(item)} className="font-mono text-base font-bold tabular-nums text-ink-900" />
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
