import { useMemo, useState } from 'react'
import {
  CookingPot, PackageCheck, XCircle, Search, ReceiptText, Eye, RotateCcw,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../lib/SettingsContext'
import { payableAmount, orderCode } from '../../lib/orderTotals'
import { useOrders } from '../../hooks/useOrders'
import {
  Button, DataTable, EmptyState, Input, Modal, MoneyText, StatusBadge, Tabs, useToast,
} from '../../components/ui'
import { timeAgo, humanizeError } from './shared'

const STATUS_TABS = [
  { value: 'all',        label: 'All' },
  { value: 'to_cook',    label: 'To cook' },
  { value: 'ready',      label: 'Ready' },
  { value: 'completed',  label: 'Completed' },
  { value: 'cancelled',  label: 'Cancelled' },
]
const TO_COOK = ['pending', 'accepted', 'preparing']

function statusGroup(status) {
  if (TO_COOK.includes(status)) return 'to_cook'
  return status
}

function statusLabel(status) {
  if (TO_COOK.includes(status)) return 'To cook'
  if (status === 'ready') return 'Ready'
  if (status === 'completed') return 'Completed'
  if (status === 'cancelled') return 'Cancelled'
  return status
}

function nextStatus(status) {
  if (status === 'pending' || status === 'accepted') return 'preparing'
  if (status === 'preparing') return 'ready'
  if (status === 'ready') return 'completed'
  return null
}

function refundedAmount(order) {
  return (order.refunds ?? [])
    .filter((r) => r.status === 'processed')
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0)
}

export default function OrdersPanel() {
  const settings = useSettings()
  const { orders } = useOrders({})
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const { push } = useToast()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter((o) => {
      if (status !== 'all' && statusGroup(o.status) !== status) return false
      if (!q) return true
      const haystack = [
        o.id,
        o.channel,
        o.order_type,
        o.payment_status,
        o.payment_method,
        ...(o.order_items ?? []).map((oi) => oi.menu_items?.name ?? ''),
      ].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [orders, query, status])

  const items = STATUS_TABS.map((t) => ({
    ...t,
    count: t.value === 'all' ? orders.length : orders.filter((o) => statusGroup(o.status) === t.value).length,
  }))

  async function updateStatus(order, nextStatus) {
    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', order.id)

    if (error) {
      const { message, details } = humanizeError(error, 'Couldn\'t update the order. Try again.')
      push({ type: 'error', title: 'Order update failed', message, details })
    } else {
      push({ type: 'success', title: `Order ${nextStatus}` })
    }
  }

  async function reprint(order) {
    const { error } = await supabase.rpc('reprint_order_invoice', { p_order_id: order.id })
    if (error) {
      const { message, details } = humanizeError(error, 'Reprint couldn\'t reach the printer.')
      push({ type: 'error', title: 'Reprint failed', message, details })
    } else {
      push({ type: 'success', title: 'Invoice queued' })
    }
  }

  function startCancel(order) {
    const payable = payableAmount(order, settings.gstInclusive)
    const remaining = Math.max(0, payable - refundedAmount(order))
    setCancelTarget(order)
    setCancelReason('')
    setRefundAmount(order.payment_status === 'paid' && order.payment_method === 'cash' ? String(remaining) : '')
  }

  async function confirmCancel() {
    if (!cancelTarget) return
    setBusy(true)
    try {
      let error
      if (cancelTarget.payment_status === 'paid' && cancelTarget.payment_method === 'cash') {
        ;({ error } = await supabase.rpc('refund_paid_cash_order', {
          p_order_id: cancelTarget.id,
          p_reason: cancelReason.trim(),
          p_refund_amount: refundAmount === '' ? null : Number(refundAmount),
        }))
      } else {
        ;({ error } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', cancelTarget.id))
      }
      if (error) throw error
      push({
        type: 'success',
        title: cancelTarget.payment_status === 'paid' && cancelTarget.payment_method === 'cash'
          ? 'Order refunded'
          : 'Order cancelled',
      })
      setCancelTarget(null)
    } catch (e) {
      const isRefund = cancelTarget.payment_status === 'paid' && cancelTarget.payment_method === 'cash'
      const { message, details } = humanizeError(
        e,
        isRefund
          ? 'The refund could not be processed. Refresh and try again.'
          : 'The order could not be cancelled. Refresh and try again.',
      )
      push({ type: 'error', title: isRefund ? 'Refund failed' : 'Cancel failed', message, details })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-surface-50 scrollbar-thin">
      <div className="mx-auto max-w-7xl space-y-4 px-6 py-5 text-[15px] font-medium">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink-700">Activity</p>
            <h2 className="text-xl font-bold text-ink-900">All orders</h2>
            <p className="mt-1 text-sm font-medium text-ink-600">Track KDS status, reprint invoices, and refund eligible cash orders.</p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search order, channel, item"
              prefix={<Search className="h-4 w-4" />}
              wrapperClassName="w-[320px]"
            />
            <span className="inline-flex items-center gap-2 rounded-md bg-surface-0 px-3 py-1.5 font-mono text-xs font-bold tabular-nums text-ink-700 ring-1 ring-inset ring-surface-line">
              <span className="relative h-1.5 w-1.5 rounded-full bg-status-ready text-status-ready heartbeat" />
              LIVE · {String(filtered.length).padStart(3, '0')}
            </span>
          </div>
        </header>

        <Tabs variant="pill" size="lg" items={items} value={status} onChange={setStatus} />

        <DataTable
          ariaLabel="All orders"
          headerClassName="border-b border-surface-line text-sm font-semibold text-ink-700"
          columns={[
            { key: 'id',      header: 'Order',   width: '110px', mono: true, sortable: true, cell: (v) => <span className="font-mono text-sm font-bold">{orderCode(v)}</span> },
            { key: 'channel', header: 'Channel', width: '110px', sortable: true, cell: (v) => <span className="channel-chip" data-channel={v}>{v}</span> },
            { key: 'status',  header: 'KDS status',  width: '140px', sortable: true, cell: (v) => <StatusBadge status={v} label={statusLabel(v)} className="font-bold" /> },
            { key: 'payment_status', header: 'Payment', width: '160px',
              cell: (_, o) => (
                <StatusBadge
                  status={o.payment_status === 'paid' ? 'paid' : 'unpaid'}
                  label={`${o.payment_status} · ${o.payment_method ?? '—'}`}
                  size="sm"
                  className="font-bold"
                />
              ) },
            { key: 'created_at', header: 'Age', width: '120px', sortable: true, cell: (v) => <span className="font-mono text-sm font-semibold text-ink-700">{timeAgo(v)}</span> },
            { key: 'amount', header: 'Amount', width: '140px', align: 'right', mono: true, sortable: true,
              accessor: (o) => payableAmount(o, settings.gstInclusive),
              cell: (v) => <MoneyText amount={v} className="font-mono text-sm tabular-nums font-bold" /> },
            { key: 'actions', header: 'Actions', width: '420px', align: 'right',
              cell: (_, o) => (
                <OrderActions
                  order={o}
                  gstInclusive={settings.gstInclusive}
                  onUpdate={updateStatus}
                  onDetail={setDetail}
                  onCancel={startCancel}
                  onReprint={reprint}
                />
              ) },
          ]}
          rows={filtered}
          rowKey={(o) => o.id}
          empty={<EmptyState title="No orders match" message="Try a different status or search." />}
        />
      </div>

      <OrderDetailModal
        order={detail}
        gstInclusive={settings.gstInclusive}
        onClose={() => setDetail(null)}
        onReprint={reprint}
        onRefund={startCancel}
      />

      <CancelModal
        order={cancelTarget}
        reason={cancelReason}
        setReason={setCancelReason}
        refundAmount={refundAmount}
        setRefundAmount={setRefundAmount}
        payable={cancelTarget ? Math.max(0, payableAmount(cancelTarget, settings.gstInclusive) - refundedAmount(cancelTarget)) : 0}
        busy={busy}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
      />
    </div>
  )
}

function OrderActions({ order, gstInclusive, onUpdate, onDetail, onCancel, onReprint }) {
  const closed = order.status === 'cancelled' || order.status === 'completed'
  const next = nextStatus(order.status)
  const canRefund = order.status !== 'cancelled'
    && order.payment_status === 'paid'
    && order.payment_method === 'cash'
    && refundedAmount(order) < payableAmount(order, gstInclusive)
  const canCancel = !closed && !canRefund

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="subtle" size="sm" onClick={() => onDetail(order)} iconLeft={<Eye className="h-4 w-4" />}>
        Details
      </Button>
      {order.payment_status === 'paid' && (
        <Button variant="subtle" size="sm" onClick={() => onReprint(order)} iconLeft={<ReceiptText className="h-4 w-4" />}>
          Reprint
        </Button>
      )}
      {next && (
        <Button
          variant={next === 'completed' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => onUpdate(order, next)}
          iconLeft={next === 'completed' ? <PackageCheck className="h-4 w-4" /> : <CookingPot className="h-4 w-4" />}
        >
          {next === 'preparing' ? 'Cooking' : next === 'ready' ? 'Ready' : 'Complete'}
        </Button>
      )}
      {(canRefund || canCancel) && (
        <>
          <span aria-hidden className="mx-1 h-5 w-px bg-surface-line" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCancel(order)}
            iconLeft={canRefund ? <RotateCcw className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            className="text-status-cancelled ring-status-cancelled/30 hover:bg-status-cancelled/5 hover:ring-status-cancelled/40"
          >
            {canRefund ? 'Refund' : 'Cancel'}
          </Button>
        </>
      )}
    </div>
  )
}

function OrderDetailModal({ order, gstInclusive, onClose, onReprint, onRefund }) {
  const canRefund = order
    && order.status !== 'cancelled'
    && order.payment_status === 'paid'
    && order.payment_method === 'cash'
    && refundedAmount(order) < payableAmount(order, gstInclusive)

  return (
    <Modal
      open={!!order}
      onClose={onClose}
      title={order ? `Order ${orderCode(order)}` : 'Order'}
      subtitle={order ? `${order.channel} · ${order.order_type?.replace('_', ' ')} · ${timeAgo(order.created_at)}` : undefined}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {order?.payment_status === 'paid' && (
            <Button variant="secondary" onClick={() => onReprint(order)} iconLeft={<ReceiptText className="h-4 w-4" />}>
              Reprint invoice
            </Button>
          )}
          {canRefund && (
            <Button
              variant="outline"
              onClick={() => {
                onClose()
                onRefund(order)
              }}
              iconLeft={<RotateCcw className="h-4 w-4" />}
              className="text-status-cancelled ring-status-cancelled/30 hover:bg-status-cancelled/5 hover:ring-status-cancelled/40"
            >
              Refund
            </Button>
          )}
        </>
      }
    >
      {order && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Info label="Status" value={<StatusBadge status={order.status} label={statusLabel(order.status)} className="font-bold" />} />
            <Info label="Payment" value={<StatusBadge status={order.payment_status === 'paid' ? 'paid' : 'unpaid'} label={`${order.payment_method ?? '—'} · ${order.payment_status}`} size="sm" className="font-bold" />} />
            <Info label="Total" value={<MoneyText amount={payableAmount(order, gstInclusive)} className="font-mono text-xl font-bold tabular-nums" />} />
          </div>
          {refundedAmount(order) > 0 && (
            <div className="rounded-lg bg-status-cancelled/10 p-3 text-sm font-semibold text-status-cancelled ring-1 ring-inset ring-status-cancelled/20">
              Refunded <MoneyText amount={refundedAmount(order)} className="font-mono font-bold tabular-nums" />
            </div>
          )}
          <section>
            <p className="mb-2 text-sm font-semibold text-ink-700">Items</p>
            <ul className="divide-y divide-surface-line rounded-lg bg-surface-100 px-4">
              {(order.order_items ?? []).map((oi) => (
                <li key={oi.id} className="flex items-start justify-between gap-4 py-3 text-sm font-medium">
                  <div className="min-w-0">
                    <p className="font-bold text-ink-900">
                      <span className="tabular-nums">{oi.quantity}×</span> {oi.menu_items?.name ?? 'Item'}
                      {oi.variant_name && <span className="text-ink-600"> · {oi.variant_name}</span>}
                    </p>
                    {oi.customizations?.special_instructions && (
                      <p className="mt-0.5 text-xs text-ink-600">{oi.customizations.special_instructions}</p>
                    )}
                    {oi.customizations?.removed_ingredients?.length > 0 && (
                      <p className="mt-0.5 text-xs text-ink-500">
                        Removed {oi.customizations.removed_ingredients.length} ingredient{oi.customizations.removed_ingredients.length === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>
                  <MoneyText amount={oi.subtotal} className="shrink-0 font-mono font-bold tabular-nums" />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Modal>
  )
}

function CancelModal({
  order,
  reason,
  setReason,
  refundAmount,
  setRefundAmount,
  payable,
  busy,
  onClose,
  onConfirm,
}) {
  const paidCash = order?.payment_status === 'paid' && order?.payment_method === 'cash'
  const needsReason = paidCash
  const invalidRefund = paidCash && (Number(refundAmount || 0) < 0 || Number(refundAmount || 0) > payable)
  const disabled = needsReason && (!reason.trim() || invalidRefund)

  return (
    <Modal
      open={!!order}
      onClose={onClose}
      title={order ? `${paidCash ? 'Refund' : 'Cancel'} ${orderCode(order)}` : 'Cancel order'}
      subtitle={paidCash ? 'Refunding a paid cash order also cancels the active kitchen ticket and writes an audit event.' : 'This will mark the order cancelled.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Keep order</Button>
          <Button variant="danger" busy={busy} disabled={disabled} onClick={onConfirm}>
            {paidCash ? 'Refund and cancel' : 'Cancel order'}
          </Button>
        </>
      }
    >
      {order && (
        <div className="space-y-4">
          <div className="rounded-lg bg-surface-100 p-4">
            <p className="text-sm font-semibold text-ink-700">Total</p>
            <MoneyText amount={payable} className="font-display text-2xl font-extrabold tabular-nums text-ink-900" />
          </div>
          {paidCash && (
            <>
              <Input
                label="Refund amount"
                type="number"
                min={0}
                max={payable}
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                error={invalidRefund ? 'Refund cannot exceed total.' : undefined}
              />
              <Input
                label="Reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Customer requested refund"
                required
              />
            </>
          )}
        </div>
      )}
    </Modal>
  )
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-surface-100 p-3">
      <p className="text-sm font-semibold text-ink-700">{label}</p>
      <div className="mt-1">{value}</div>
    </div>
  )
}
