import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

const SIZES = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  '2xl':'max-w-6xl',
  full: 'max-w-[min(96vw,1400px)] h-[min(94vh,900px)]',
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  dirty = false,
  closeLabel = 'Close',
  // When true, drops the chrome (title bar + footer). Useful for full-screen
  // takeover dialogs where children render their own header.
  bare = false,
}) {
  const containerRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement

    // Lock body scroll. We use overflow rather than position:fixed to avoid
    // scroll-position loss on close.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const requestClose = () => {
      if (dirty) {
        const ok = window.confirm('Discard your changes?')
        if (!ok) return
      }
      onClose?.()
    }

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        requestClose()
        return
      }
      if (e.key !== 'Tab' || !containerRef.current) return
      const focusables = containerRef.current.querySelectorAll(FOCUSABLE)
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)

    // Initial focus: first focusable inside the dialog. Fallback to dialog root
    // so screen readers announce the title.
    requestAnimationFrame(() => {
      const focusables = containerRef.current?.querySelectorAll(FOCUSABLE)
      const target = focusables?.[0] ?? containerRef.current
      target?.focus?.()
    })

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [open, dirty, onClose])

  if (!open) return null

  const requestClose = () => {
    if (dirty && !window.confirm('Discard your changes?')) return
    onClose?.()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        className="absolute inset-0 bg-ink-900/55 backdrop-blur-[2px]"
        onClick={requestClose}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        tabIndex={-1}
        className={[
          'relative z-10 flex w-full flex-col overflow-hidden rounded-2xl bg-surface-0 shadow-lg ring-1 ring-surface-line/70 animate-modal-in',
          SIZES[size] ?? SIZES.md,
          size === 'full' ? '' : 'max-h-[90vh]',
        ].join(' ')}
      >
        {!bare && (title || subtitle) && (
          <header className="flex items-start justify-between gap-4 border-b border-surface-line px-6 py-4">
            <div className="min-w-0">
              {title && (
                <h3 id={titleId} className="text-lg font-display font-bold tracking-tight text-ink-900">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-0.5 text-sm text-ink-600">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label={closeLabel}
              className="-mr-2 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-600 transition hover:bg-surface-100 hover:text-ink-900"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
        )}
        <div className={[
          'flex-1 overflow-y-auto scrollbar-thin',
          bare ? '' : 'px-6 py-5',
        ].join(' ')}>
          {children}
        </div>
        {footer && !bare && (
          <footer className="flex items-center justify-end gap-2 border-t border-surface-line bg-surface-50 px-6 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
