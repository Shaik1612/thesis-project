import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    }).catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = async () => {
    setSession(null)
    return supabase.auth.signOut()
  }

  const user = session?.user ?? null
  // RLS reads app_metadata.role (see migration 013). user_metadata is editable
  // by the user and must NOT be trusted for authorization.
  const role = user?.app_metadata?.role ?? null
  const isAdmin    = role === 'admin'
  const isEmployee = role === 'employee'
  const isKitchen  = role === 'kitchen'
  const isStaff    = isAdmin || isEmployee || isKitchen

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        isAdmin,
        isEmployee,
        isKitchen,
        isStaff,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
