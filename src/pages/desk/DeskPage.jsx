import { useEffect, useState } from 'react'
import {
  Plus, ListOrdered, Banknote, History,
} from 'lucide-react'
import { useSettings } from '../../lib/SettingsContext'
import { useAuth } from '../../lib/AuthContext'
import ClosedPage from '../../components/ClosedPage'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatMoney } from '../../components/ui'
import NewSale         from './NewSale'
import OrdersPanel     from './OrdersPanel'
import CashDrawer      from './CashDrawer'
import AuditPanel      from './AuditPanel'
import { useDeskDrawerToday } from './hooks'

const TABS = [
  { id: 'new_sale',     label: 'Sale',    title: 'New sale',    icon: Plus,        shortcut: '1' },
  { id: 'orders',       label: 'Orders',  title: 'Orders',       icon: ListOrdered, shortcut: '2' },
  { id: 'drawer',       label: 'Drawer',  title: 'Cash drawer',  icon: Banknote,    shortcut: '3' },
  { id: 'audit',        label: 'Audit',   title: 'Audit trail',  icon: History,     shortcut: '4' },
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

  const drawer = useDeskDrawerToday()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (!e.metaKey && !e.ctrlKey) return
      const idx = ['1','2','3','4'].indexOf(e.key)
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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-50 text-ink-900">
      <div className="flex h-14 shrink-0 items-center gap-4 border-b border-surface-line bg-surface-0 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 font-display text-sm font-extrabold text-white shadow-brand">
            DF
          </div>
          <div className="leading-tight">
            <p className="font-display text-base font-extrabold text-ink-900">Desk</p>
            <p className="text-xs font-medium text-ink-500">Cash counter</p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="hidden items-center gap-4 md:flex">
          <HeaderStat label="Time" value={now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })} />
          <HeaderStat label="Drawer" value={formatMoney(drawer.net)} />
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-surface-100 px-2.5 py-1.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-0 font-display text-xs font-extrabold uppercase text-ink-700 ring-1 ring-inset ring-surface-line">
            {operatorInitial}
          </span>
          <p className="max-w-[120px] truncate text-xs font-semibold text-ink-700">{operatorName}</p>
        </div>
      </div>

      <div className="flex h-16 shrink-0 items-center justify-between border-b border-surface-line bg-surface-0 px-3">
        <nav className="flex items-center gap-1" aria-label="Desk sections">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = t.id === tab
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  'relative flex h-12 items-center gap-2.5 rounded-xl px-5 text-base font-semibold transition-colors',
                  active
                    ? 'bg-brand-500 text-white shadow-brand'
                    : 'text-ink-600 hover:bg-surface-100 hover:text-ink-900',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" />
                <span>{t.label}</span>
                <span className={[
                  'hidden rounded font-mono text-[10px] tracking-tight tabular-nums lg:inline',
                  active ? 'bg-white/15 px-1.5 py-0.5 text-white/80' : 'bg-surface-100 px-1.5 py-0.5 text-ink-500',
                ].join(' ')}>
                  {MOD_GLYPH}{IS_MAC ? '' : '+'}{t.shortcut}
                </span>
              </button>
            )
          })}
        </nav>

        <p className="pr-1 font-display text-sm font-extrabold text-ink-900">{activeTab.title}</p>
      </div>

      <main className="min-h-0 flex-1 overflow-hidden">
        {tab === 'new_sale'     && <NewSale settings={settings} />}
        {tab === 'orders'       && <OrdersPanel />}
        {tab === 'drawer'       && <CashDrawer />}
        {tab === 'audit'        && <AuditPanel />}
      </main>
    </div>
  )
}

function HeaderStat({ label, value, alert = false }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-400">{label}</span>
      <span className={[
        'font-mono text-sm font-bold tabular-nums',
        alert ? 'text-amber-700' : 'text-ink-900',
      ].join(' ')}>
        {value}
      </span>
    </div>
  )
}
