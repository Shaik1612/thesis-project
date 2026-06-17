import { useMemo, useState } from 'react'
import { Filter, AlertTriangle, Clock, ShoppingBag, Utensils, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useOrders } from '../../hooks/useOrders'
import { useSettings } from '../../lib/SettingsContext'
import { payableAmount, orderCode } from '../../lib/orderTotals'
import {
  Alert, Button, EmptyState, formatMoney, useToast,
} from '../../components/ui'
import { timeAgo, humanizeError, CHANNEL_HUE } from './shared'
import CashModal from './CashModal'

const CHANNEL_ORDER = ['desk', 'kiosk', 'web']
const FILTERS = [
  { id: 'all',   label: 'All channels' },
  { id: 'desk',  label: 'Desk' },
  { id: 'kiosk', label: 'Kiosk' },
  { id: 'web',   label: 'Web' },
]

export default function PendingPayments() {
  const settings = useSettings()
  const { push } = useToast()
  const { orders } = useOrders({ paymentMethod: 'cash', paymentStatus: 'unpaid' })
  const [filter, setFilter] = useState('all')
  const [settling, setSettling] = useState(null)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const list = filter === 'all' ? orders : orders.filter((o) => o.channel === filter)
    return [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }, [orders, filter])

  const totalDue = filtered.reduce((s, o) => s + payableAmount(o, settings.gstInclusive), 0)
  const oldest = filtered[0] ?? null

  const byChannel = useMemo(() => {
    const counts = {}
    for (const o of orders) counts[o.channel] = (counts[o.channel] ?? 0) + 1
    return counts
  }, [orders])

  async function confirm(tenderedAmount) {
    if (!settling) return
    setBusy(true)
    const { error } = await supabase.rpc('settle_cash_order', {
      p_order_id: settling.id,
      p_tendered_amount: tenderedAmount,
    })
    setBusy(false)
    if (error) {
      const { message, details } = humanizeError(error, 'Cash settlement failed — try again in a moment.')
      push({ type: 'error', title: 'Settlement failed', message, details })
      return
    }
    push({ type: 'success', title: 'Cash settled', message: `${orderCode(settling)} marked paid.` })
    setSettling(null)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin console-canvas">
      <div className="mx-auto max-w-7xl space-y-5 px-6 py-6">
        {/* Header strip with marquee stats. */}
        <header className="grid grid-cols-12 gap-3">
          <div className="col-span-12 lg:col-span-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-700">Cash settlement</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-900">Pending cash rail</h2>
            <p className="mt-1 text-sm text-ink-600">
              Every unpaid cash order lands here. The desk is the single physical cash point.
            </p>
          </div>
          <PendingStat
            className="col-span-6 lg:col-span-2"
            label="Tickets waiting"
            value={String(filtered.length).padStart(2, '0')}
            tone={filtered.length ? 'hot' : 'mute'}
          />
          <PendingStat
            className="col-span-6 lg:col-span-2"
            label="Total due"
            value={formatMoney(totalDue)}
            tone={filtered.length ? 'hot' : 'mute'}
          />
          <PendingStat
            className="col-span-12 lg:col-span-2"
            label="Oldest wait"
            value={oldest ? timeAgo(oldest.created_at) : '—'}
            tone={oldest && isUrgent(oldest.created_at) ? 'urgent' : 'mute'}
          />
        </header>

        {oldest && isUrgent(oldest.created_at) && (
          <Alert tone="warning">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>
                <strong>{orderCode(oldest)}</strong> has been waiting for {timeAgo(oldest.created_at)}.
                Settle it now or check with the guest at <strong>{whereLabel(oldest)}</strong>.
              </span>
            </span>
          </Alert>
        )}

        {/* Channel filter pills. */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="h-4 w-4 shrink-0 text-ink-400" />
          {FILTERS.map((f) => {
            const count = f.id === 'all' ? orders.length : byChannel[f.id] ?? 0
            const active = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={[
                  'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-ink-900 text-white'
                    : 'bg-surface-0 text-ink-700 ring-1 ring-inset ring-surface-line hover:bg-surface-100',
                ].join(' ')}
              >
                {f.label}
                <span className={[
                  'rounded font-mono text-[10px] tabular-nums',
                  active ? 'bg-white/20 px-1.5 py-0.5 text-white' : 'text-ink-500',
                ].join(' ')}>
                  {String(count).padStart(2, '0')}
                </span>
              </button>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-surface-0 p-6 ring-1 ring-inset ring-surface-line">
            <EmptyState
              title="All clear"
              message="Nothing waiting on cash settlement. New tickets will appear here in real time."
            />
          </div>
        ) : (
          <ChannelGroups
            orders={filtered}
            gstInclusive={settings.gstInclusive}
            onSettle={setSettling}
            grouped={filter === 'all'}
          />
        )}
      </div>

      <CashModal
        open={!!settling}
        subject={settling ? {
          code: orderCode(settling),
          channel: settling.channel ?? 'desk',
          where: whereLabel(settling),
        } : null}
        amount={settling ? payableAmount(settling, settings.gstInclusive) : 0}
        onClose={() => setSettling(null)}
        onConfirm={confirm}
        busy={busy}
      />
    </div>
  )
}

function ChannelGroups({ orders, gstInclusive, onSettle, grouped }) {
  if (!grouped) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((o) => (
          <TicketCard key={o.id} order={o} gstInclusive={gstInclusive} onSettle={onSettle} />
        ))}
      </div>
    )
  }

  const groups = {}
  for (const o of orders) {
    const ch = o.channel ?? 'desk'
    if (!groups[ch]) groups[ch] = []
    groups[ch].push(o)
  }

  return (
    <div className="space-y-5">
      {CHANNEL_ORDER.filter((c) => groups[c]?.length).map((ch) => (
        <section key={ch}>
          <div className="mb-2 flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <span className="channel-chip" data-channel={ch}>{ch}</span>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink-500">
                {groups[ch].length} ticket{groups[ch].length === 1 ? '' : 's'}
              </p>
            </div>
            <p className="font-mono text-xs font-bold tabular-nums text-ink-700">
              ₹{groups[ch].reduce((s, o) => s + payableAmount(o, gstInclusive), 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groups[ch].map((o) => (
              <TicketCard key={o.id} order={o} gstInclusive={gstInclusive} onSettle={onSettle} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function TicketCard({ order, gstInclusive, onSettle }) {
  const amount = payableAmount(order, gstInclusive)
  const urgent = isUrgent(order.created_at)
  const dineIn = order.order_type === 'dine_in'
  const items = (order.order_items ?? []).length

  return (
    <div
      className={[
        'group relative flex flex-col overflow-hidden rounded-xl bg-surface-0 ring-1 ring-inset transition-all',
        urgent
          ? 'ring-amber-500/50 shadow-[0_0_0_3px_rgba(245,158,11,0.08)]'
          : 'ring-surface-line hover:shadow-md',
      ].join(' ')}
    >
      {/* Channel stripe — full color at rest; thinned on urgent so the amber
          ring reads as the dominant urgency cue (one chromatic, one motion). */}
      <div
        className={[urgent ? 'h-0.5' : 'h-1.5', 'w-full'].join(' ')}
        style={stripeStyle(order.channel)}
      />

      <div className="flex items-start justify-between gap-2 px-4 pb-2 pt-3">
        <div>
          <p className="font-mono text-base font-bold tabular-nums text-ink-900">{orderCode(order)}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-ink-500">
            {dineIn ? <Utensils className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3" />}
            <span>{whereLabel(order)}</span>
            <span>·</span>
            <span>{items} line{items === 1 ? '' : 's'}</span>
          </div>
        </div>
        <span className="channel-chip" data-channel={order.channel ?? 'desk'}>
          {order.channel}
        </span>
      </div>

      <div className="border-t border-dashed border-surface-line px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-500">Due</p>
        <p className="readout font-display text-3xl font-extrabold text-ink-900">
          ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-surface-line bg-surface-50 px-4 py-2.5">
        <span
          className={[
            'inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider',
            urgent ? 'text-amber-700' : 'text-ink-500',
          ].join(' ')}
        >
          {urgent && <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-amber-500 text-amber-500 heartbeat" />}
          <Clock className="h-3 w-3" />
          {timeAgo(order.created_at)}
        </span>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onSettle(order)}
          iconRight={<ArrowRight className="h-3.5 w-3.5" />}
        >
          Settle
        </Button>
      </div>
    </div>
  )
}

function PendingStat({ label, value, tone = 'mute', className = '' }) {
  const slabClass =
    tone === 'hot'
      ? 'amount-slab amount-slab-hot'
      : tone === 'urgent'
        ? 'amount-slab bg-status-cancelled/10 text-status-cancelled ring-1 ring-inset ring-status-cancelled/20'
        : 'amount-slab bg-surface-0 ring-1 ring-inset ring-surface-line'

  return (
    <div className={[slabClass, 'flex flex-col justify-center rounded-xl px-4 py-3', className].join(' ')}>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-500">{label}</p>
      <p className={[
        'font-display text-2xl font-extrabold leading-tight',
        tone === 'hot' ? 'text-amber-800' : tone === 'urgent' ? 'text-status-cancelled' : 'text-ink-900',
      ].join(' ')}>
        {value}
      </p>
    </div>
  )
}

function isUrgent(createdAt) {
  if (!createdAt) return false
  const minutes = (Date.now() - new Date(createdAt).getTime()) / 60000
  return minutes >= 10
}

function whereLabel(order) {
  return order.order_type === 'dine_in' ? 'Dine in' : 'Takeaway'
}

function stripeStyle(channel) {
  return { background: CHANNEL_HUE[channel] ?? CHANNEL_HUE.desk }
}

