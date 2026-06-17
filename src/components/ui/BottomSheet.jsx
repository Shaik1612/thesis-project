import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const HEIGHTS = {
  peek: 'h-[28vh]',
  half: 'h-[60vh]',
  full: 'h-[92vh]',
  auto: 'max-h-[88vh]',
}

// CSS-animated bottom sheet with focus trap, scroll lock, escape-to-close
// and native pointer-based drag-to-dismiss on the drag handle. Intentionally
// avoids framer-motion so it stays light on the customer bundle.

export default function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  snap = 'auto',
  showHandle = true,
  closeLabel = 'Close',
}) {
  const sheetRef = useRef(null)
  const titleId = useId()
  const [dragY, setDragY] = useState(0)
  const [closing, setClosing] = useState(false)
  const startY = useRef(0)
  const dragging = useRef(false)

  useEffect(() => {
    if (!open) {
      setDragY(0)
      setClosing(false)
      return
    }
    const previouslyFocused = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
        return
      }
      if (e.key !== 'Tab' || !sheetRef.current) return
      const focusables = sheetRef.current.querySelectorAll(FOCUSABLE)
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
      const focusables = sheetRef.current?.querySelectorAll(FOCUSABLE)
      const target = focusables?.[0] ?? sheetRef.current
      target?.focus?.()
    })

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragging.current = true
    startY.current = e.clientY
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!dragging.current) return
    const dy = Math.max(0, e.clientY - startY.current)
    setDragY(dy)
  }
  const onPointerUp = (e) => {
    if (!dragging.current) return
    dragging.current = false
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    if (dragY > 120) {
      setClosing(true)
      setTimeout(() => onClose?.(), 180)
    } else {
      setDragY(0)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        className={[
          'absolute inset-0 bg-ink-900/55 backdrop-blur-[2px] transition-opacity duration-200',
          closing ? 'opacity-0' : 'opacity-100 animate-fade-in',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        tabIndex={-1}
        className={[
          'relative z-10 flex w-full flex-col overflow-hidden rounded-t-3xl bg-surface-0 shadow-lg ring-1 ring-surface-line/70 safe-bottom',
          HEIGHTS[snap] ?? HEIGHTS.auto,
          closing ? '' : 'animate-sheet-up',
        ].join(' ')}
        style={{
          transform: `translateY(${closing ? '100%' : dragY}px)`,
          transition: dragging.current ? 'none' : 'transform 180ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {showHandle && (
          <div
            className="flex shrink-0 cursor-grab touch-none items-center justify-center pt-3 pb-1 active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="h-1.5 w-12 rounded-full bg-surface-line" />
          </div>
        )}
        {(title || subtitle) && (
          <header className="flex shrink-0 items-start justify-between gap-4 px-5 pb-3">
            <div className="min-w-0">
              {title && (
                <h3 id={titleId} className="text-lg font-display font-bold tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && <p className="mt-0.5 text-sm text-ink-600">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="-mr-1 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-600 transition hover:bg-surface-100 hover:text-ink-900"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
        )}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-4">{children}</div>
        {footer && (
          <footer className="shrink-0 border-t border-surface-line bg-surface-0 px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
