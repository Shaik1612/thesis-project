import { useEffect, useMemo, useState } from 'react'
import { RefreshCcw, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button, DataTable, EmptyState, Input } from '../../components/ui'
import { orderCode } from '../../lib/orderTotals'
import { timeAgo } from './shared'

const EVENT_LABEL = {
  desk_cash_order_created: 'Cash order',
  cash_order_settled: 'Cash settled',
  paid_cash_order_cancelled: 'Paid cash cancelled',
  invoice_reprint_requested: 'Invoice reprint',
}

export default function AuditPanel() {
  const [events, setEvents] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('desk_audit_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    setEvents(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('desk_audit_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'desk_audit_events' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return events
    return events.filter((e) =>
      [e.event_type, e.order_id, JSON.stringify(e.payload ?? {})]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [events, query])

  return (
    <div className="h-full overflow-y-auto scrollbar-thin console-canvas">
      <div className="mx-auto max-w-7xl space-y-5 px-6 py-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-700">Audit</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-900">Desk events</h2>
            <p className="mt-1 text-sm text-ink-600">
              Last 200 events. Cash settlements, refunds, and reprints — all timestamped and immutable.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search event, order, reason"
              prefix={<Search className="h-4 w-4" />}
              wrapperClassName="w-[320px]"
            />
            <Button variant="secondary" onClick={load} iconLeft={<RefreshCcw className="h-4 w-4" />}>
              Refresh
            </Button>
          </div>
        </header>

        <DataTable
          loading={loading}
          ariaLabel="Desk audit events"
          rows={filtered}
          rowKey={(e) => e.id}
          columns={[
            { key: 'created_at', header: 'Age', width: '110px', sortable: true, cell: (v) => <span className="font-mono text-xs text-ink-600">{timeAgo(v)}</span> },
            { key: 'event_type', header: 'Event', width: '190px', sortable: true,
              cell: (v) => (
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  <span className="font-semibold text-ink-900">{EVENT_LABEL[v] ?? v}</span>
                </span>
              ) },
            { key: 'order_id', header: 'Order', width: '120px', cell: (v) => v ? <span className="font-mono text-xs font-semibold">{orderCode(v)}</span> : <span className="text-ink-400">—</span> },
            { key: 'payload', header: 'Details',
              cell: (v) => <Payload payload={v} /> },
          ]}
          empty={<EmptyState title="No audit events" message="Cash and reprint events will appear here." />}
        />
      </div>
    </div>
  )
}

function Payload({ payload }) {
  const entries = Object.entries(payload ?? {})
  if (entries.length === 0) return <span className="text-ink-400">—</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.slice(0, 5).map(([k, v]) => (
        <span key={k} className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-ink-700">
          <span className="font-semibold">{k.replace(/_/g, ' ')}</span>: {String(v)}
        </span>
      ))}
    </div>
  )
}
