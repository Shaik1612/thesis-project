import { useEffect, useState } from 'react'
import {
  Plus, Wallet, ListOrdered, Banknote, History, Activity,
} from 'lucide-react'
import { useSettings } from '../../lib/SettingsContext'
import { useAuth } from '../../lib/AuthContext'
import { useOrders } from '../../hooks/useOrders'
import ClosedPage from '../../components/ClosedPage'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatMoney } from '../../components/ui'
import NewSale         from './NewSale'
import PendingPayments from './PendingPayments'
import OrdersPanel     from './OrdersPanel'
import CashDrawer      from './CashDrawer'
import AuditPanel      from './AuditPanel'
import { useDeskDrawerToday } from './hooks'

const TABS = [
  { id: 'new_sale',     label: 'Sale',     title: 'New sale',     detail: 'Counter order entry · cash or UPI',                          icon: Plus,        shortcut: '1' },
  { id: 'pending_cash', label: 'Cash',     title: 'Pending cash', detail: 'Settle unpaid cash tickets across all channels',             icon: Wallet,      shortcut: '2' },
  { id: 'orders',       label: 'Orders',   title: 'All orders',   detail: 'Live activity, accept · ready · complete · cancel · refund', icon: ListOrdered, shortcut: '3' },
  { id: 'drawer',       label: 'Drawer',   title: 'Cash drawer',  detail: 'Today\'s cash settlement, change, net',                      icon: Banknote,    shortcut: '4' },
  { id: 'audit',        label: 'Audit',    title: 'Audit trail',  detail: 'Desk cash, refund, and print events',                        icon: History,     shortcut: '5' },
]

// True on macOS, where the actual keypress uses Cmd; false on Windows/Linux,
// where it's Ctrl. Read once to drive the visible shortcut chip — the keydown
// handler accepts both modifiers regardless.
const IS_MAC = typeof navigator !== 'undefined'
  && /Mac|iPad|iPhone|iPod/.test(navigator.platform || navigator.userAgent || '')
const MOD_GLYPH = IS_MAC ? '⌘' : 'Ctrl'

export default function DeskPage() {
  const settings = useSettings()
  const { user, loading: authLoading } = useAuth()
  const [tab, setTab] = useState('new_sale')
  const [now, setNow] = useState(() => new Date())

  const { orders: pendingCash } = useOrders({ paymentMethod: 'cash', paymentStatus: 'unpaid' })
  const drawer = useDeskDrawerToday()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (!e.metaKey && !e.ctrlKey) return
      const idx = ['1','2','3','4','5'].indexOf(e.key)
      if (idx === -1) return
      e.preventDefault()
      setTab(TABS[idx].id)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (!settings.loaded || authLoading) return <LoadingSpinner fullscreen />
  if (!settings.deskEnabled) return <ClosedPage title="Desk unavailable" />

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0]
  const operatorInitial = (user?.email?.[0] ?? 'S').toUpperCase()
  const operatorName    = user?.email?.split('@')[0] ?? 'staff'

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden console-canvas text-ink-900">
      {/* Operator strip — always visible. Dark ink slab, live data. */}
      <div className="console-strip flex h-16 shrink-0 items-center gap-6 px-4">
        <div className="flex items-center gap-3 pr-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 font-display text-base font-extrabold text-white shadow-brand">
            D
          </div>
          <div className="leading-tight">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">DineFlow Desk</p>
            <p className="font-display text-sm font-extrabold text-white">Service Floor Console</p>
          </div>
        </div>

        <div className="h-7 w-px bg-white/10" />

        <ConsoleStat
          label="Time"
          value={
            <span className="readout">
              {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
              <span className="ml-1 text-white/40">:{String(now.getSeconds()).padStart(2,'0')}</span>
            </span>
          }
        />

        <ConsoleStat
          label="Drawer (today)"
          value={
            <span className="readout text-emerald-300">
              {formatMoney(drawer.net)}
            </span>
          }
          sub={`${drawer.count} cash tickets`}
        />

        <ConsoleStat
          label="Pending cash"
          tone={pendingCash.length ? 'alert' : 'mute'}
          value={
            <span className={['readout', pendingCash.length ? 'text-amber-300' : 'text-white/60'].join(' ')}>
              {pendingCash.length.toString().padStart(2, '0')}
            </span>
          }
          sub={pendingCash.length ? 'Awaiting settlement' : 'All clear'}
        />

        <div className="flex-1" />

        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 ring-1 ring-inset ring-white/10">
          <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-400 text-emerald-400 heartbeat" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">Live</span>
        </div>

        <div className="flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-1.5 ring-1 ring-inset ring-white/10">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-500/20 font-display text-xs font-extrabold uppercase text-amber-100 ring-1 ring-inset ring-brand-500/30">
            {operatorInitial}
          </span>
          <div className="leading-tight">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/50">Operator</p>
            <p className="max-w-[120px] truncate text-xs font-semibold text-white">{operatorName}</p>
          </div>
        </div>
      </div>

      {/* Tab rail — horizontal, monospace shortcuts, full width. */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-surface-line bg-surface-0 px-3">
        <nav className="flex items-center gap-1" aria-label="Desk sections">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = t.id === tab
            const badge = t.id === 'pending_cash' ? pendingCash.length : 0
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  'relative flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition-colors',
                  active
                    ? 'bg-ink-900 text-white'
                    : 'text-ink-600 hover:bg-surface-100 hover:text-ink-900',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
                <span className={[
                  'rounded font-mono text-[10px] tracking-tight tabular-nums',
                  active ? 'bg-white/15 px-1.5 py-0.5 text-white/80' : 'bg-surface-100 px-1.5 py-0.5 text-ink-500',
                ].join(' ')}>
                  {MOD_GLYPH}{IS_MAC ? '' : '+'}{t.shortcut}
                </span>
                {badge > 0 && (
                  <span className={[
                    'ml-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 font-mono text-[10px] font-bold tabular-nums',
                    active ? 'bg-amber-300 text-ink-900' : 'bg-status-cancelled text-white',
                  ].join(' ')}>
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="flex items-center gap-3 pr-1">
          <div className="leading-tight text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-ink-400">Now viewing</p>
            <p className="font-display text-sm font-extrabold text-ink-900">{activeTab.title}</p>
          </div>
          <Activity className="h-4 w-4 text-ink-300" />
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-hidden">
        {tab === 'new_sale'     && <NewSale settings={settings} />}
        {tab === 'pending_cash' && <PendingPayments />}
        {tab === 'orders'       && <OrdersPanel />}
        {tab === 'drawer'       && <CashDrawer />}
        {tab === 'audit'        && <AuditPanel />}
      </main>
    </div>
  )
}

function ConsoleStat({ label, value, sub, tone = 'normal' }) {
  return (
    <div className="leading-tight">
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/45">{label}</p>
      <div className={[
        'font-display text-base font-extrabold',
        tone === 'alert' ? 'text-amber-300' : 'text-white',
      ].join(' ')}>
        {value}
      </div>
      {sub && <p className="mt-0.5 text-[10px] font-medium text-white/45">{sub}</p>}
    </div>
  )
}

