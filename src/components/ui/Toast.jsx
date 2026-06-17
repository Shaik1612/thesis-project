import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const TONE = {
  success: {
    Icon: CheckCircle2,
    iconColor: 'text-status-ready',
    bar:       'bg-status-ready',
  },
  error:   {
    Icon: AlertCircle,
    iconColor: 'text-status-cancelled',
    bar:       'bg-status-cancelled',
  },
  info:    {
    Icon: Info,
    iconColor: 'text-status-pending',
    bar:       'bg-status-pending',
  },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (opts) => {
      const id = Math.random().toString(36).slice(2)
      const toast = { id, type: 'info', duration: 3000, ...opts }
      setToasts((prev) => [...prev, toast])
      if (toast.duration > 0) {
        setTimeout(() => remove(id), toast.duration)
      }
      return id
    },
    [remove],
  )

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 safe-top"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const tone = TONE[t.type] ?? TONE.info
          const { Icon } = tone
          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              className={[
                'pointer-events-auto relative flex w-full max-w-md items-start gap-3 overflow-hidden',
                'rounded-2xl bg-surface-0 shadow-lg ring-1 ring-surface-line/80 animate-toast-in',
              ].join(' ')}
            >
              <span className={['absolute inset-y-0 left-0 w-1', tone.bar].join(' ')} aria-hidden />
              <div className="pl-5 pt-3.5">
                <Icon className={['h-5 w-5', tone.iconColor].join(' ')} aria-hidden />
              </div>
              <div className="flex-1 py-3 pr-2">
                {t.title && <div className="text-sm font-semibold text-ink-900">{t.title}</div>}
                {t.message && <div className="text-sm text-ink-600">{t.message}</div>}
              </div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label="Dismiss"
                className="m-1 flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition hover:bg-surface-100 hover:text-ink-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
