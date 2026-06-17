import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsProvider } from './lib/SettingsContext'
import { AuthProvider } from './lib/AuthContext'
import { ToastProvider } from './components/ui'
import LoadingSpinner from './components/LoadingSpinner'
import RequireRole from './components/RequireRole'

const WebOrderPage = lazy(() => import('./pages/web-order/WebOrderPage'))
const KioskPage    = lazy(() => import('./pages/kiosk/KioskPage'))
const KitchenPage  = lazy(() => import('./pages/kitchen/KitchenPage'))
const DeskPage     = lazy(() => import('./pages/desk/DeskPage'))
const AdminRoutes  = lazy(() => import('./pages/admin/AdminRoutes'))
const Offline      = lazy(() => import('./pages/Offline'))

const ZONE_MAP = {
  '/order':   'customer',
  '/kiosk':   'customer',
  '/kitchen': 'kitchen',
  '/desk':    'staff',
  '/admin':   'staff',
}

function getZone(pathname) {
  for (const [prefix, zone] of Object.entries(ZONE_MAP)) {
    if (pathname.startsWith(prefix)) return zone
  }
  return 'customer'
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function ZoneApplier() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.body.setAttribute('data-zone', getZone(pathname))
  }, [pathname])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AuthProvider>
          <ToastProvider>
            <ZoneApplier />
            <Suspense fallback={<LoadingSpinner fullscreen />}>
              <Routes>
                <Route path="/"                element={<Navigate to="/order" replace />} />
                <Route path="/order"           element={<WebOrderPage />} />
                <Route path="/kiosk"           element={<KioskPage />} />
                <Route
                  path="/kitchen"
                  element={
                    <RequireRole roles={['kitchen', 'admin']} subtitle="Kitchen sign-in">
                      <KitchenPage />
                    </RequireRole>
                  }
                />
                <Route
                  path="/desk"
                  element={
                    <RequireRole roles={['employee', 'admin']} subtitle="Staff sign-in">
                      <DeskPage />
                    </RequireRole>
                  }
                />
                <Route path="/admin/*"         element={<AdminRoutes />} />
                <Route path="/offline"         element={<Offline />} />
                <Route path="*"                element={<Offline />} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </SettingsProvider>
    </QueryClientProvider>
  )
}
