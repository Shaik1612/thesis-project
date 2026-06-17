import { useEffect, useMemo, useState } from 'react'
import { Receipt, IndianRupee, TrendingUp, ShoppingBag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useSettings } from '../../lib/SettingsContext'
import { paidRevenueOrder, payableAmount } from '../../lib/orderTotals'
import { MoneyText, Skeleton, Tabs } from '../../components/ui'
import { AdminPage, AdminCard, StatCard } from './_layout'

const PERIODS = [
  { value: '1',  label: 'Today',      days: 1 },
  { value: '7',  label: 'This week',  days: 7 },
  { value: '30', label: 'This month', days: 30 },
]

const CHANNEL_LABEL = { kiosk: 'Kiosk', web: 'Online', desk: 'Desk' }

export default function Dashboard() {
  const settings = useSettings()
  const [period, setPeriod] = useState('1')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    setLoading(true)
    const days = PERIODS.find((p) => p.value === period)?.days ?? 1
    const since = new Date(Date.now() - days * 86_400_000).toISOString()
    supabase
      .from('orders')
      .select('total_amount, gst_amount, discount_amount, status, payment_status, channel, created_at')
      .gte('created_at', since)
      .then(({ data }) => {
        const all = data ?? []
        const completed = all.filter((o) => o.status === 'completed')
        const revenueOrders = all.filter(paidRevenueOrder)
        setStats({
          totalOrders: all.length,
          completedOrders: completed.length,
          revenueOrders: revenueOrders.length,
          grossRevenue: revenueOrders.reduce((s, o) => s + payableAmount(o, settings.gstInclusive), 0),
          totalGst: revenueOrders.reduce((s, o) => s + (o.gst_amount ?? 0), 0),
          totalDiscounts: revenueOrders.reduce((s, o) => s + (o.discount_amount ?? 0), 0),
          avgTicket: revenueOrders.length
            ? revenueOrders.reduce((s, o) => s + payableAmount(o, settings.gstInclusive), 0) / revenueOrders.length
            : 0,
          byChannel: all.reduce((acc, o) => {
            acc[o.channel] = (acc[o.channel] ?? 0) + 1
            return acc
          }, {}),
          byHour: bucketByHour(all),
        })
        setLoading(false)
      })
  }, [period, refreshTick, settings.gstInclusive])

  // Lightweight live indicator — re-fetch every 60s.
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const net = stats ? stats.grossRevenue - stats.totalDiscounts : 0
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? ''

  return (
    <AdminPage
      title="Dashboard"
      subtitle={`Performance for ${periodLabel.toLowerCase()} · realtime`}
      action={
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-status-ready/12 px-3 py-1 text-xs font-semibold text-status-ready">
            <span className="h-1.5 w-1.5 rounded-full bg-status-ready live-dot text-status-ready" />
            Live
          </span>
          <Tabs
            variant="segmented"
            items={PERIODS}
            value={period}
            onChange={setPeriod}
            ariaLabel="Time period"
          />
        </div>
      }
    >
      {loading ? (
        <div className="grid grid-cols-12 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={120} className="!rounded-2xl col-span-12 md:col-span-6 xl:col-span-3" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <StatCard
                label="Total orders"
                value={stats.totalOrders}
                hint={`${stats.revenueOrders} paid · ${stats.completedOrders} completed`}
                icon={<Receipt className="h-5 w-5" />}
                trend={<Sparkline data={stats.byHour} />}
              />
            </div>
            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <StatCard
                label="Gross revenue"
                value={<MoneyText amount={stats.grossRevenue} />}
                tone="brand"
                icon={<IndianRupee className="h-5 w-5" />}
              />
            </div>
            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <StatCard
                label="Net revenue"
                value={<MoneyText amount={net} />}
                hint={`${formatRupees(stats.totalDiscounts)} in discounts`}
                icon={<TrendingUp className="h-5 w-5" />}
                tone="good"
              />
            </div>
            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <StatCard
                label="Avg ticket"
                value={<MoneyText amount={stats.avgTicket} />}
                hint={`from ${stats.revenueOrders} paid orders`}
                icon={<ShoppingBag className="h-5 w-5" />}
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 xl:col-span-8">
              <AdminCard title="Orders by channel" action={<span className="text-xs text-ink-500">{stats.totalOrders} total</span>}>
                {Object.keys(stats.byChannel).length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink-500">No orders yet in this period.</p>
                ) : (
                  <ul className="space-y-4">
                    {Object.entries(stats.byChannel)
                      .sort((a, b) => b[1] - a[1])
                      .map(([ch, n]) => {
                        const pct = stats.totalOrders ? (n / stats.totalOrders) * 100 : 0
                        return (
                          <li key={ch} className="space-y-1.5">
                            <div className="flex items-baseline justify-between text-sm">
                              <span className="font-medium text-ink-900">{CHANNEL_LABEL[ch] ?? ch}</span>
                              <span className="tabular-nums text-ink-600">
                                {n} <span className="text-ink-400">· {pct.toFixed(0)}%</span>
                              </span>
                            </div>
                            <div className="relative h-2 overflow-hidden rounded-full bg-surface-100">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full bg-brand-hot"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </li>
                        )
                      })}
                  </ul>
                )}
              </AdminCard>
            </div>
            <div className="col-span-12 xl:col-span-4">
              <AdminCard title="GST collected">
                <MoneyText amount={stats.totalGst} className="block font-display text-4xl font-extrabold leading-tight text-ink-900" />
                <p className="mt-1 text-sm text-ink-600">
                  across <span className="font-semibold tabular-nums text-ink-900">{stats.revenueOrders}</span> paid orders
                </p>
              </AdminCard>
              <div className="mt-4">
                <AdminCard title="Discounts">
                  <MoneyText amount={stats.totalDiscounts} className="block font-display text-3xl font-extrabold leading-tight text-status-cancelled" />
                  <p className="mt-1 text-sm text-ink-600">applied across the period</p>
                </AdminCard>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminPage>
  )
}

function bucketByHour(orders) {
  const buckets = Array(24).fill(0)
  for (const o of orders) {
    const h = new Date(o.created_at).getHours()
    if (!Number.isNaN(h)) buckets[h]++
  }
  return buckets
}

function Sparkline({ data = [], stroke = '#EA580C' }) {
  const pts = useMemo(() => {
    if (!data.length) return ''
    const max = Math.max(1, ...data)
    const w = 200, h = 36
    const step = w / Math.max(1, data.length - 1)
    return data.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(' ')
  }, [data])
  if (!pts) return null
  return (
    <svg viewBox="0 0 200 36" preserveAspectRatio="none" className="h-12 w-full">
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function formatRupees(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}
