import { useState } from 'react'
import { LogIn } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { Button, Input } from '../../components/ui'

export default function AdminLogin({ subtitle = 'Admin sign-in' }) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-surface-line bg-surface-0 p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold">DineFlow</h1>
          <p className="text-sm text-ink-600">{subtitle}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@restaurant.com"
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {error && (
            <p className="rounded-lg bg-status-cancelled/10 px-3 py-2 text-sm text-status-cancelled">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" fullWidth busy={loading}>
            <LogIn className="h-5 w-5" />
            Sign in
          </Button>
        </form>
      </div>
    </div>
  )
}
