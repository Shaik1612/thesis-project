import { useEffect, useMemo, useState } from 'react'
import { RefreshCcw, Search, ArrowDownRight, ArrowUpRight, Banknote, Coins } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button, DataTable, EmptyState, Input, MoneyText, StatusBadge, useToast } from '../../components/ui'
import { orderCode } from '../../lib/orderTotals'
import { timeAgo } from './shared'

export default function CashDrawer() {
  const { push } = useToast()
  const [payments, setPayments] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    const { data, error } = await supabase
      .from('payments')
      .select('*, orders(id, channel, order_type, status)')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
    setLoading(false)
    if (error) {
      push({ type: 'error', title: 'Cash drawer failed', message: error.message })
      return
    }
    setPayments(data ?? [])
  }

  useEffect(() => {
    load()
    const channel = supabase
      .channel('desk_cash_drawer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return payments
    return payments.filter((p) =>
      [p.id, p.order_id, p.method, p.status, p.orders?.channel, p.orders?.order_type]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [payments, query])

  const cashPaid = filtered.filter((p) => p.status === 'paid' && p.method === 'cash')
  const refunded = filtered.filter((p) => p.status === 'refunded')
  const totalCash    = cashPaid.reduce((s, p) => s + Number(p.amount          ?? 0), 0)
  const totalTendered = cashPaid.reduce((s, p) => s + Number(p.tendered_amount ?? 0), 0)
  const totalChange   = cashPaid.reduce((s, p) => s + Number(p.change_amount   ?? 0), 0)
  const totalRefunded = refunded.reduce((s, p) => s + Number(p.amount          ?? 0), 0)
  const netDrawer = totalTendered - totalChange - totalRefunded

  return (
    <div className="h-full overflow-y-auto scrollbar-thin console-canvas">
      <div className="mx-auto max-w-7xl space-y-5 px-6 py-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-700">Cash</p>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-900">Drawer · today</h2>
            <p className="mt-1 text-sm text-ink-600">Every cash settlement processed at the desk since 00:00.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search payment"
              prefix={<Search className="h-4 w-4" />}
              wrapperClassName="w-[280px]"
            />
            <Button variant="secondary" onClick={load} iconLeft={<RefreshCcw className="h-4 w-4" />}>
              Refresh
            </Button>
          </div>
        </header>

        {/* Headline net drawer — the single most important number. */}
        <section className="grid grid-cols-12 gap-3">
          <div className="amount-slab amount-slab-hot col-span-12 flex flex-col gap-1 rounded-xl px-6 py-5 md:col-span-6">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-800">Net in drawer</p>
              <Banknote className="h-5 w-5 text-amber-700" />
            </div>
            <p className="readout font-display text-5xl font-extrabold tracking-tight text-ink-900">
              ₹{netDrawer.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-ink-600">
              tendered − change − refunds
            </p>
          </div>

          <DrawerStat
            className="col-span-6 md:col-span-2"
            label="Paid cash"
            value={totalCash}
            icon={Coins}
            tone="ink"
            sub={`${cashPaid.length} txn`}
          />
          <DrawerStat
            className="col-span-6 md:col-span-2"
            label="Tendered"
            value={totalTendered}
            icon={ArrowDownRight}
            tone="positive"
          />
          <DrawerStat
            className="col-span-6 md:col-span-2"
            label="Change out"
            value={totalChange}
            icon={ArrowUpRight}
            tone="neutral"
          />
        </section>

        <div className="rounded-2xl bg-surface-0 ring-1 ring-inset ring-surface-line shadow-sm">
          <div className="border-b border-surface-line px-5 py-3">
            <p className="font-display text-sm font-extrabold text-ink-900">Today's settlements</p>
            <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-ink-500">
              {filtered.length} payment{filtered.length === 1 ? '' : 's'} · most recent first
            </p>
          </div>
          <DataTable
            loading={loading}
            ariaLabel="Cash drawer payments"
            rows={filtered}
            rowKey={(p) => p.id}
            columns={[
              { key: 'order_id',        header: 'Order',    width: '110px', sortable: true,
                cell: (v) => <span className="font-mono text-xs font-semibold">{orderCode(v)}</span> },
              { key: 'created_at',      header: 'Time',     width: '110px', sortable: true,
                cell: (v) => <span className="font-mono text-xs text-ink-600">{timeAgo(v)}</span> },
              { key: 'channel',         header: 'Channel',  width: '110px',
                accessor: (p) => p.orders?.channel,
                cell: (v) => v ? <span className="channel-chip" data-channel={v}>{v}</span> : <span className="text-ink-400">—</span> },
              { key: 'method',          header: 'Method',   width: '110px',
                cell: (v) => <span className="font-mono text-[11px] font-bold uppercase text-ink-700">{v}</span> },
              { key: 'status',          header: 'Status',   width: '110px', sortable: true,
                cell: (v) => <StatusBadge status={v === 'paid' ? 'paid' : v === 'refunded' ? 'cancelled' : 'pending'} label={v} size="sm" /> },
              { key: 'amount',          header: 'Amount',   width: '120px', align: 'right', sortable: true,
                cell: (v) => <MoneyText amount={v} className="font-mono font-bold tabular-nums" /> },
              { key: 'tendered_amount', header: 'Tendered', width: '120px', align: 'right', sortable: true,
                cell: (v) => <MoneyText amount={v} className="font-mono tabular-nums text-ink-700" /> },
              { key: 'change_amount',   header: 'Change',   width: '120px', align: 'right', sortable: true,
                cell: (v) => <MoneyText amount={v} className="font-mono tabular-nums text-ink-700" /> },
            ]}
            empty={<EmptyState title="No cash payments yet" message="Cash settlements for today will appear here in real time." />}
          />
        </div>

        {refunded.length > 0 && (
          <p className="text-xs font-medium text-ink-500">
            {refunded.length} refunded payment{refunded.length === 1 ? '' : 's'} totalling
            <span className="ml-1 font-mono font-bold text-ink-700">₹{totalRefunded.toLocaleString('en-IN')}</span>
            {' '}deducted from net drawer.
          </p>
        )}
      </div>
    </div>
  )
}

function DrawerStat({ label, value, icon: Icon, tone = 'ink', sub, className = '' }) {
  return (
    <div className={['rounded-xl bg-surface-0 p-4 ring-1 ring-inset ring-surface-line', className].join(' ')}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-500">{label}</p>
        {Icon && (
          <Icon className={[
            'h-4 w-4',
            tone === 'positive' ? 'text-emerald-600'
              : tone === 'neutral'  ? 'text-ink-400'
              : 'text-ink-500',
          ].join(' ')} />
        )}
      </div>
      <p className="readout mt-1 font-display text-2xl font-extrabold tabular-nums text-ink-900">
        <MoneyText amount={value} />
      </p>
      {sub && <p className="mt-1 font-mono text-[10px] font-medium uppercase tracking-wider text-ink-400">{sub}</p>}
    </div>
  )
}
