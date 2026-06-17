import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

// Right- (or left-) anchored full-height drawer. Same chrome contract as Modal
// (title, subtitle, footer, dirty) so admin pages can swap one for the other
// without rewriting handlers. Used for tall multi-section forms where a
// centered modal would feel cramped — e.g. MenuAdmin item editor, future
// FloorMap SessionDrawer.

const WIDTHS = {
  sm: 'max-w-sm',     // 384
  md: 'max-w-md',     // 448
  lg: 'max-w-xl',     // 576
  xl: 'max-w-2xl',    // 672
  '2xl': 'max-w-4xl', // 896
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function SideDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  side = 'right',
  width = 'lg',
  dirty = false,
  closeLabel = 'Close',
}) {
  const containerRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const requestClose = () => {
      if (dirty && !window.confirm('Discard your changes?')) return
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

  const sideCls = side === 'left' ? 'left-0' : 'right-0'
  const slideCls = side === 'left' ? 'animate-drawer-in-left' : 'animate-drawer-in-right'

  return (
    <div
      className="fixed inset-0 z-50 animate-fade-in"
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
          'absolute inset-y-0 flex w-full flex-col bg-surface-0 shadow-lg ring-1 ring-surface-line/70',
          sideCls,
          slideCls,
          WIDTHS[width] ?? WIDTHS.lg,
        ].join(' ')}
      >
        {(title || subtitle) && (
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
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
          {children}
        </div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-surface-line bg-surface-50 px-6 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
