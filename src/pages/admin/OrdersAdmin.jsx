import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useOrders } from '../../hooks/useOrders'
import { useSettings } from '../../lib/SettingsContext'
import { payableAmount } from '../../lib/orderTotals'
import {
  Button, DataTable, EmptyState, MoneyText, StatusBadge, Tabs, useToast,
} from '../../components/ui'
import { AdminPage } from './_layout'

const REFUND_STATUS_TOKEN = {
  pending:   { status: 'pending',   label: 'Pending' },
  processed: { status: 'ready',     label: 'Processed' },
  failed:    { status: 'cancelled', label: 'Failed' },
}

const STATUS_TABS = [
  { value: 'all',        label: 'All' },
  { value: 'pending',    label: 'Pending' },
  { value: 'preparing',  label: 'Preparing' },
  { value: 'ready',      label: 'Ready' },
  { value: 'completed',  label: 'Completed' },
  { value: 'cancelled',  label: 'Cancelled' },
]

export default function OrdersAdmin() {
  const { push } = useToast()
  const settings = useSettings()
  const { orders, loading } = useOrders({
    status: ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'],
  })
  const [status, setStatus] = useState('all')

  async function cancel(id) {
    if (!confirm('Cancel this order?')) return
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', id)
    push(error
      ? { type: 'error', title: 'Cancel failed', message: error.message }
      : { type: 'success', title: 'Order cancelled' })
  }

  const filtered = status === 'all' ? orders : orders.filter((o) => o.status === status)

  const tabItems = useMemo(
    () =>
      STATUS_TABS.map((t) => ({
        ...t,
        count: t.value === 'all' ? orders.length : orders.filter((o) => o.status === t.value).length,
      })),
    [orders],
  )

  return (
    <AdminPage
      title="Orders"
      subtitle="Every order across every channel."
      action={
        <span className="inline-flex items-center gap-2 rounded-md border border-surface-line bg-surface-0 px-2.5 py-1 text-xs font-medium text-ink-600">
          <span className="h-1.5 w-1.5 rounded-full bg-status-ready" />
          {filtered.length} shown
        </span>
      }
    >
      <Tabs variant="underline" items={tabItems} value={status} onChange={setStatus} />

      <DataTable
        loading={loading}
        ariaLabel="All orders"
        rows={filtered}
        rowKey={(o) => o.id}
        renderExpanded={(o) => (
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
                Items in #{o.id.slice(-6).toUpperCase()}
              </p>
              <ul className="space-y-1.5 text-sm">
                {o.order_items?.map((oi) => (
                  <li key={oi.id} className="flex items-center justify-between gap-3">
                    <span className="text-ink-900">
                      <span className="font-semibold tabular-nums">{oi.quantity}×</span> {oi.menu_items?.name ?? 'Item'}
                      {oi.variant_name && <span className="text-ink-600"> · {oi.variant_name}</span>}
                    </span>
                    <MoneyText amount={oi.subtotal} className="tabular-nums text-ink-700" />
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-surface-line bg-surface-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Channel</p>
                <p className="font-semibold uppercase text-ink-900">{o.channel}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Type</p>
                <p className="font-semibold text-ink-900">{o.order_type === 'dine_in' ? 'Dine in' : 'Takeaway'}</p>
              </div>
              <RefundsForOrder orderId={o.id} />
            </div>
          </div>
        )}
        columns={[
          { key: 'id', header: 'Order', width: '110px', mono: true, sortable: true,
            cell: (v) => <span className="font-mono text-xs">#{v.slice(-6).toUpperCase()}</span> },
          { key: 'channel', header: 'Channel', width: '110px', sortable: true,
            cell: (v) => <span className="rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-ink-600">{v}</span> },
          { key: 'status', header: 'Status', width: '130px', sortable: true,
            cell: (v) => <StatusBadge status={v} /> },
          { key: 'payment_status', header: 'Payment', width: '170px',
            cell: (_, o) => (
              <StatusBadge
                status={o.payment_status === 'paid' ? 'paid' : 'unpaid'}
                label={`${o.payment_method ?? '—'} · ${o.payment_status}`}
                size="sm"
              />
            ) },
          { key: 'created_at', header: 'Time', width: '90px', sortable: true,
            cell: (v) => (
              <span className="tabular-nums text-ink-600">
                {new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) },
          { key: 'amount', header: 'Total', width: '120px', align: 'right', mono: true, sortable: true,
            accessor: (o) => payableAmount(o, settings.gstInclusive),
            cell: (v) => <MoneyText amount={v} className="font-semibold tabular-nums" /> },
          { key: 'action', header: '', width: '120px', align: 'right',
            cell: (_, o) => !['completed', 'cancelled'].includes(o.status)
              ? <Button variant="danger" size="sm" onClick={() => cancel(o.id)}>Cancel</Button>
              : null },
        ]}
        empty={<EmptyState title="No orders here" message="When orders land, they'll show up immediately." />}
      />
    </AdminPage>
  )
}

// Lazily fetches refunds for one order when its row is expanded. Read-only —
// the dedicated /admin/refunds page owns the full list & realtime stream.
function RefundsForOrder({ orderId }) {
  const [refunds, setRefunds] = useState(null)

  useEffect(() => {
    let alive = true
    supabase
      .from('refunds')
      .select('id, razorpay_refund_id, amount, reason, status, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (alive) setRefunds(data ?? []) })
    return () => { alive = false }
  }, [orderId])

  if (refunds == null) return null
  if (refunds.length === 0) return null

  return (
    <div className="rounded-lg border border-surface-line bg-surface-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Refunds</p>
      <ul className="mt-2 space-y-2">
        {refunds.map((r) => {
          const m = REFUND_STATUS_TOKEN[r.status] ?? REFUND_STATUS_TOKEN.pending
          return (
            <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <MoneyText amount={r.amount} className="font-semibold tabular-nums text-ink-900" />
                {r.reason && <div className="truncate text-xs text-ink-600">{r.reason}</div>}
              </div>
              <StatusBadge status={m.status} label={m.label} size="sm" />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
