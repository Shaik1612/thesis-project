import { useEffect, useMemo, useState } from 'react'
import { Copy, RefreshCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  DataTable, EmptyState, MoneyText, StatusBadge, Tabs, useToast,
} from '../../components/ui'
import { AdminPage } from './_layout'

const FILTERS = [
  { value: 'all',       label: 'All' },
  { value: 'pending',   label: 'Pending' },
  { value: 'processed', label: 'Processed' },
  { value: 'failed',    label: 'Failed' },
]

// Razorpay refund status → StatusBadge token mapping. `processed` maps to
// `ready` (green) and `failed` to `cancelled` (red); `pending` is shared.
const STATUS_TOKEN = {
  pending:   { status: 'pending',   label: 'Pending' },
  processed: { status: 'ready',     label: 'Processed' },
  failed:    { status: 'cancelled', label: 'Failed' },
}

export default function RefundsAdmin() {
  const { push } = useToast()
  const [refunds, setRefunds] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let alive = true
    const fetchRows = async () => {
      const { data } = await supabase
        .from('refunds')
        .select(
          'id, order_id, razorpay_refund_id, amount, reason, status, created_at,' +
          ' orders(id, total_amount, customer_phone, channel)',
        )
        .order('created_at', { ascending: false })
        .limit(200)
      if (!alive) return
      setRefunds(data ?? [])
      setLoading(false)
    }
    fetchRows()

    const channel = supabase
      .channel('refunds_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'refunds' }, () => fetchRows())
      .subscribe()

    return () => {
      alive = false
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = filter === 'all' ? refunds : refunds.filter((r) => r.status === filter)

  const tabItems = useMemo(
    () => FILTERS.map((t) => ({
      ...t,
      count: t.value === 'all' ? refunds.length : refunds.filter((r) => r.status === t.value).length,
    })),
    [refunds],
  )

  async function copy(text, label) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      push({ type: 'success', title: 'Copied', message: label })
    } catch (e) {
      push({ type: 'error', title: 'Copy failed', message: e.message })
    }
  }

  return (
    <AdminPage
      title="Refunds"
      subtitle="Read-only feed of Razorpay refund attempts."
      action={
        <span className="inline-flex items-center gap-2 rounded-md border border-surface-line bg-surface-0 px-2.5 py-1 text-xs font-medium text-ink-600">
          <span className="h-1.5 w-1.5 rounded-full bg-status-ready" />
          {filtered.length} shown
        </span>
      }
    >
      <Tabs variant="pill" items={tabItems} value={filter} onChange={setFilter} />

      <DataTable
        loading={loading}
        ariaLabel="Refunds"
        rows={filtered}
        rowKey={(r) => r.id}
        columns={[
          { key: 'created_at', header: 'When', width: '160px', sortable: true,
            cell: (v) => (
              <span className="tabular-nums text-ink-700">
                {new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            ) },
          { key: 'order_id', header: 'Order', width: '110px', mono: true,
            cell: (v) => (
              <span className="font-mono text-xs text-ink-700">
                #{(v ?? '').toString().slice(-6).toUpperCase() || '—'}
              </span>
            ) },
          { key: 'channel', header: 'Channel', width: '100px',
            accessor: (r) => r.orders?.channel,
            cell: (v) => v
              ? <span className="rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-ink-600">{v}</span>
              : <span className="text-ink-400">—</span> },
          { key: 'amount', header: 'Amount', width: '120px', align: 'right', mono: true, sortable: true,
            cell: (v) => <MoneyText amount={v ?? 0} className="font-semibold tabular-nums" /> },
          { key: 'reason', header: 'Reason',
            cell: (v) => v ? <span className="text-ink-700">{v}</span> : <span className="text-ink-400">—</span> },
          { key: 'razorpay_refund_id', header: 'Razorpay ID', width: '200px',
            cell: (v) => v ? (
              <button
                type="button"
                onClick={() => copy(v, v)}
                className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] text-ink-600 hover:bg-surface-100 hover:text-ink-900"
                aria-label={`Copy ${v}`}
              >
                <span className="truncate max-w-[140px]">{v}</span>
                <Copy className="h-3 w-3 shrink-0" />
              </button>
            ) : <span className="text-ink-400">—</span> },
          { key: 'status', header: 'Status', width: '120px', sortable: true,
            cell: (v) => {
              const m = STATUS_TOKEN[v] ?? STATUS_TOKEN.pending
              return <StatusBadge status={m.status} label={m.label} />
            } },
        ]}
        empty={
          <EmptyState
            icon={RefreshCcw}
            title="No refunds yet"
            message="When Razorpay processes a refund, it will appear here in realtime."
          />
        }
      />
    </AdminPage>
  )
}
