import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Carrot, ScrollText, BarChart3, Lock,
  Settings, LogOut, TicketPercent, ChevronsLeft, ChevronsRight, Sparkles, RefreshCcw,
} from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Tooltip } from '../../components/ui'
import AdminLogin from './AdminLogin'

const Dashboard           = lazy(() => import('./Dashboard'))
const MenuAdmin           = lazy(() => import('./MenuAdmin'))
const IngredientsAdmin    = lazy(() => import('./IngredientsAdmin'))
const CouponsAdmin        = lazy(() => import('./CouponsAdmin'))
const SettingsAdmin       = lazy(() => import('./SettingsAdmin'))
const OrdersAdmin         = lazy(() => import('./OrdersAdmin'))
const RefundsAdmin        = lazy(() => import('./RefundsAdmin'))
const ReportsAdmin        = lazy(() => import('./ReportsAdmin'))
const DesignSystemGallery = lazy(() => import('./_designsystem'))

const NAV = [
  { to: '/admin',              label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/admin/menu',         label: 'Menu',       icon: BookOpen },
  { to: '/admin/ingredients',  label: 'Inventory',  icon: Carrot },
  { to: '/admin/orders',       label: 'Orders',     icon: ScrollText },
  { to: '/admin/refunds',      label: 'Refunds',    icon: RefreshCcw },
  { to: '/admin/coupons',      label: 'Coupons',    icon: TicketPercent },
  { to: '/admin/reports',      label: 'Reports',    icon: BarChart3 },
  { to: '/admin/settings',     label: 'Settings',   icon: Settings },
]

const COLLAPSE_KEY = 'dineflow:admin:sidebar-collapsed'

export default function AdminRoutes() {
  const { user, isAdmin, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0') } catch {}
  }, [collapsed])

  if (loading) return <LoadingSpinner fullscreen />
  if (!user) return <AdminLogin />
  if (!isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-surface-50 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-status-cancelled/12 text-status-cancelled">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">Access denied</h1>
        <p className="max-w-sm text-sm text-ink-600">
          This account isn&apos;t an admin. Sign in with an admin account to access the dashboard.
        </p>
        <button
          type="button"
          onClick={() => { signOut(); navigate('/admin') }}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Sign out
        </button>
      </div>
    )
  }

  // Breadcrumb: derive from current path.
  const crumbs = (() => {
    const seg = location.pathname.replace(/^\/admin/, '').split('/').filter(Boolean)
    return ['Admin', ...seg.map((s) => s[0].toUpperCase() + s.slice(1))]
  })()

  return (
    <div className="flex h-screen w-screen bg-surface-50 pos-surface">
      <aside
        className={[
          'flex shrink-0 flex-col border-r border-surface-line bg-surface-0 transition-[width] duration-200',
          collapsed ? 'w-[68px]' : 'w-60',
        ].join(' ')}
      >
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-hot text-white shadow-brand">
            <span className="font-display text-lg font-extrabold leading-none">D</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-display text-sm font-extrabold leading-none">DineFlow</div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">Admin</div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2" aria-label="Admin navigation">
          <ul className="space-y-0.5">
            {NAV.map((n) => {
              const item = (
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    [
                      'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                      collapsed ? 'justify-center' : '',
                      isActive
                        ? 'bg-brand-soft text-brand-700'
                        : 'text-ink-700 hover:bg-surface-100',
                    ].join(' ')
                  }
                >
                  <n.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{n.label}</span>}
                </NavLink>
              )
              return (
                <li key={n.to}>
                  {collapsed ? (
                    <Tooltip content={n.label} side="right">{item}</Tooltip>
                  ) : item}
                </li>
              )
            })}
          </ul>

          {!collapsed && (
            <div className="mt-6 px-3">
              <NavLink
                to="/admin/_components"
                className={({ isActive }) =>
                  [
                    'inline-flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors',
                    isActive ? 'text-brand-700' : 'text-ink-400 hover:text-ink-700',
                  ].join(' ')
                }
              >
                <Sparkles className="h-3 w-3" />
                Design system
              </NavLink>
            </div>
          )}
        </nav>

        <div className="border-t border-surface-line p-2">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={[
              'mb-2 inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-ink-500 hover:bg-surface-100',
              collapsed ? 'justify-center' : 'justify-between',
            ].join(' ')}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {!collapsed && <span>Collapse</span>}
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
          <div className="rounded-xl bg-surface-100 px-3 py-2">
            {!collapsed && (
              <div className="truncate text-xs font-medium text-ink-700">{user.email}</div>
            )}
            <button
              type="button"
              onClick={() => { signOut(); navigate('/admin') }}
              className={[
                'mt-1 inline-flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-700 hover:bg-surface-150',
                collapsed ? 'justify-center' : '',
              ].join(' ')}
            >
              <LogOut className="h-3.5 w-3.5" />
              {!collapsed && 'Sign out'}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="border-b border-surface-line bg-surface-0/70 px-8 py-2 backdrop-blur">
          <nav aria-label="Breadcrumb" className="text-xs">
            {crumbs.map((c, i) => (
              <span key={i}>
                <span className={i === crumbs.length - 1 ? 'font-semibold text-ink-700' : 'text-ink-500'}>{c}</span>
                {i < crumbs.length - 1 && <span className="px-2 text-ink-300">/</span>}
              </span>
            ))}
          </nav>
        </div>
        <Suspense fallback={<LoadingSpinner fullscreen />}>
          <Routes>
            <Route index              element={<Dashboard />} />
            <Route path="menu"        element={<MenuAdmin />} />
            <Route path="ingredients" element={<IngredientsAdmin />} />
            <Route path="coupons"     element={<CouponsAdmin />} />
            <Route path="settings"    element={<SettingsAdmin />} />
            <Route path="orders"      element={<OrdersAdmin />} />
            <Route path="refunds"     element={<RefundsAdmin />} />
            <Route path="reports"     element={<ReportsAdmin />} />
            <Route path="_components" element={<DesignSystemGallery />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
