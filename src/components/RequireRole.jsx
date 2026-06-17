import { useAuth } from '../lib/AuthContext'
import LoadingSpinner from './LoadingSpinner'
import AdminLogin from '../pages/admin/AdminLogin'

// Wrap any staff-only page. Accepts a list of roles that may pass.
// Examples:
//   <RequireRole roles={['admin', 'employee']}> ...desk... </RequireRole>
//   <RequireRole roles={['admin', 'kitchen']}>  ...kds...  </RequireRole>
export default function RequireRole({ roles, subtitle, children }) {
  const { user, role, loading, signOut } = useAuth()

  if (loading) return <LoadingSpinner fullscreen />
  if (!user)   return <AdminLogin subtitle={subtitle} />

  if (!roles.includes(role)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-surface-50 px-6 text-center">
        <h1 className="font-display text-2xl font-bold text-ink-900">Access denied</h1>
        <p className="max-w-sm text-sm text-ink-600">
          This account ({role ?? 'no role'}) doesn't have access to this area.
          Required role: <span className="font-medium">{roles.join(' or ')}</span>.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white"
        >
          Sign out
        </button>
      </div>
    )
  }

  return children
}
