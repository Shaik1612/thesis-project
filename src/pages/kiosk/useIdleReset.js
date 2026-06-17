import { useEffect } from 'react'

// Resets the kiosk to the attract screen after `idleMs` of no interaction.
// No-ops while the kiosk is on the attract screen (so it doesn't fight itself).

export default function useIdleReset({ active, onReset, idleMs = 90_000 }) {
  useEffect(() => {
    if (!active) return
    let timer
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(onReset, idleMs)
    }
    reset()
    const events = ['touchstart', 'pointerdown', 'keydown']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [active, onReset, idleMs])
}
