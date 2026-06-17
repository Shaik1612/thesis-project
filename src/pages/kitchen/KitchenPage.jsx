import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Flame, Clock as ClockIcon, Volume2, VolumeX } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useOrders } from '../../hooks/useOrders'
import { EmptyState, KeyHint, Tooltip } from '../../components/ui'

const ACTIVE = ['pending', 'accepted', 'preparing']
const STATUS_NEXT = {
  pending:   'accepted',
  accepted:  'preparing',
  preparing: 'ready',
  ready:     'completed',
}
const NEXT_LABEL = {
  pending:   'Accept',
  accepted:  'Start',
  preparing: 'Mark ready',
  ready:     'Complete',
}
const CHANNEL_LABEL = { kiosk: 'KIOSK', web: 'WEB', desk: 'DESK' }
const CHIME_KEY = 'dineflow:kds:chime'

function readChimePref() {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(CHIME_KEY) === '1' } catch { return false }
}

// Lazy WebAudio bleep — no asset to ship.
function playChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
    setTimeout(() => ctx.close(), 600)
  } catch {}
}

export default function KitchenPage() {
  const { orders } = useOrders({ status: [...ACTIVE, 'ready'] })
  const [ingredientNames, setIngredientNames] = useState({})
  const [chime, setChime] = useState(readChimePref)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const seenIds = useRef(new Set())

  useEffect(() => {
    supabase.from('ingredients').select('id, name').then(({ data }) => {
      if (!data) return
      const map = {}
      for (const ing of data) map[ing.id] = ing.name
      setIngredientNames(map)
    })
  }, [])

  // Audible chime on new orders (when enabled).
  useEffect(() => {
    if (!chime) {
      seenIds.current = new Set(orders.map((o) => o.id))
      return
    }
    let fresh = 0
    for (const o of orders) {
      if (!seenIds.current.has(o.id)) {
        seenIds.current.add(o.id)
        fresh++
      }
    }
    if (fresh > 0 && seenIds.current.size > fresh) playChime()
  }, [orders, chime])

  const sorted = useMemo(() => {
    return [...orders].sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority
      return new Date(a.created_at) - new Date(b.created_at)
    })
  }, [orders])

  // Keep selected card in range.
  useEffect(() => {
    if (selectedIdx >= sorted.length) setSelectedIdx(Math.max(0, sorted.length - 1))
  }, [sorted.length, selectedIdx])

  const advance = useCallback(async (orderId, status) => {
    const next = STATUS_NEXT[status]
    if (!next) return
    await supabase.from('orders').update({ status: next }).eq('id', orderId)
  }, [])

  const bump = useCallback(async (orderId) => {
    await supabase.from('orders').update({ priority: 2 }).eq('id', orderId)
  }, [])

  // Keyboard navigation: ← → between cards, Space advance state, B bump priority.
  useEffect(() => {
    function onKey(e) {
      const target = e.target
      const isInput = target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      if (isInput) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSelectedIdx((i) => Math.min(sorted.length - 1, i + 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSelectedIdx((i) => Math.max(0, i - 1))
      } else if (e.key === ' ') {
        const card = sorted[selectedIdx]
        if (card) {
          e.preventDefault()
          advance(card.id, card.status)
        }
      } else if (e.key.toLowerCase() === 'b') {
        const card = sorted[selectedIdx]
        if (card) {
          e.preventDefault()
          bump(card.id)
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sorted, selectedIdx, advance, bump])

  function toggleChime() {
    setChime((c) => {
      const next = !c
      try { localStorage.setItem(CHIME_KEY, next ? '1' : '0') } catch {}
      return next
    })
  }

  const activeCount = sorted.filter((o) => ACTIVE.includes(o.status)).length
  const readyCount  = sorted.filter((o) => o.status === 'ready').length

  return (
    <div className="flex h-screen w-screen flex-col bg-kds-bg text-kds-text">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-kds-line bg-kds-card px-6 py-3">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-hot text-white shadow-brand">
              <span className="font-display text-lg font-extrabold leading-none">D</span>
            </div>
            <div>
              <h1 className="font-display text-base font-extrabold tracking-tight leading-none">DineFlow</h1>
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-kds-dim">Kitchen display</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-status-preparing/12 px-3 py-1 font-semibold text-status-preparing">
              <span className="h-1.5 w-1.5 rounded-full bg-status-preparing" />
              {activeCount} active
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-status-ready/12 px-3 py-1 font-semibold text-status-ready">
              <span className="h-1.5 w-1.5 rounded-full bg-status-ready" />
              {readyCount} ready
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content={chime ? 'Disable order chime' : 'Enable order chime'} side="bottom">
            <button
              type="button"
              onClick={toggleChime}
              aria-label="Toggle order chime"
              className={[
                'inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                chime ? 'bg-brand-500 text-white' : 'bg-kds-line text-kds-dim hover:text-kds-text',
              ].join(' ')}
            >
              {chime ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </Tooltip>
          <Clock />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto scrollbar-thin p-5">
          {sorted.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title="All caught up"
                message="No active orders right now."
                className="text-kds-dim"
              />
            </div>
          ) : (
            <>
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
              >
                {sorted.map((order, idx) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    ingredientNames={ingredientNames}
                    selected={idx === selectedIdx}
                    onAdvance={() => advance(order.id, order.status)}
                    onBump={() => bump(order.id)}
                    onFocus={() => setSelectedIdx(idx)}
                  />
                ))}
              </div>
              <KbdLegend />
            </>
          )}
        </main>

      </div>
    </div>
  )
}

function OrderCard({ order, ingredientNames = {}, selected, onAdvance, onBump, onFocus }) {
  const elapsed = Math.floor((Date.now() - new Date(order.created_at)) / 60_000)
  const isUrgent = order.priority === 2
  const isHigh   = order.priority === 1

  // Aging border keys off semantic status tokens, not raw hex.
  let agingClass = 'border-status-ready'
  if      (elapsed >= 15) agingClass = 'border-status-cancelled'
  else if (elapsed >= 8)  agingClass = 'border-status-preparing'

  return (
    <article
      tabIndex={0}
      onFocus={onFocus}
      onClick={onFocus}
      className={[
        'group flex flex-col gap-3 rounded-2xl bg-kds-card p-4 shadow-md outline-none transition-all',
        'border-t-4',
        agingClass,
        isUrgent ? 'ring-2 ring-status-cancelled' :
        isHigh   ? 'ring-1 ring-status-preparing' : '',
        selected ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-kds-bg' : '',
      ].join(' ')}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="font-display text-4xl font-extrabold tabular-nums leading-none tracking-tight">
            #{order.id.slice(-4).toUpperCase()}
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-kds-dim">
            <span className="rounded-md bg-kds-line px-1.5 py-0.5 text-kds-text">{CHANNEL_LABEL[order.channel] ?? order.channel}</span>
            {order.order_type === 'takeaway' && (
              <span className="rounded-md bg-status-preparing/20 px-1.5 py-0.5 text-status-preparing">To go</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-display text-xl font-extrabold tabular-nums">{elapsed}m</span>
          {order.priority < 2 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onBump() }}
              aria-label="Mark urgent"
              className="inline-flex items-center gap-1 rounded-lg bg-status-cancelled/15 px-2 py-1 text-xs font-semibold text-status-cancelled hover:bg-status-cancelled/25"
            >
              <Flame className="h-3.5 w-3.5" />
              Urgent
            </button>
          )}
        </div>
      </header>

      <ul className="flex flex-col gap-2">
        {order.order_items?.map((oi) => {
          const removed = (oi.customizations?.removed_ingredients ?? [])
            .map((id) => ingredientNames[id])
            .filter(Boolean)
          const instr = oi.customizations?.special_instructions
          return (
            <li key={oi.id} className="flex flex-col gap-0.5 text-xl leading-tight">
              <div className="flex items-baseline gap-2">
                <span className="font-display font-extrabold tabular-nums text-brand-400">{oi.quantity}×</span>
                <span className="font-medium">
                  {oi.menu_items?.name ?? 'Item'}
                  {oi.variant_name && <span className="text-kds-dim"> · {oi.variant_name}</span>}
                </span>
              </div>
              {removed.length > 0 && (
                <div className="ml-7 flex flex-wrap gap-1">
                  {removed.map((name) => (
                    <span
                      key={name}
                      className="rounded bg-status-cancelled/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-status-cancelled"
                    >
                      No {name}
                    </span>
                  ))}
                </div>
              )}
              {instr && (
                <div className="ml-7 text-sm italic text-status-preparing">&ldquo;{instr}&rdquo;</div>
              )}
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAdvance() }}
        className={[
          'mt-auto w-full rounded-xl py-3 font-display text-base font-extrabold tracking-tight',
          'transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-kds-bg',
          order.status === 'ready'
            ? 'bg-status-ready text-white hover:brightness-110'
            : 'bg-brand-hot text-white shadow-brand hover:brightness-110',
        ].join(' ')}
      >
        {NEXT_LABEL[order.status] ?? 'Next'}
      </button>
    </article>
  )
}

function KbdLegend() {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-kds-card/60 px-4 py-3 text-xs text-kds-dim ring-1 ring-inset ring-kds-line/60">
      <span className="inline-flex items-center gap-2">
        <KeyHint keys={['left', 'right']} separator=" " /> Navigate
      </span>
      <span className="inline-flex items-center gap-2">
        <KeyHint keys="space" /> Advance state
      </span>
      <span className="inline-flex items-center gap-2">
        <KeyHint keys="b" /> Bump priority
      </span>
    </div>
  )
}

function Clock() {
  const [time, setTime] = useState(() => fmt(new Date()))
  useEffect(() => {
    const id = setInterval(() => setTime(fmt(new Date())), 10_000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="inline-flex items-center gap-2 rounded-xl bg-kds-line px-3 py-2 font-display text-sm font-bold tabular-nums">
      <ClockIcon className="h-4 w-4 text-kds-dim" />
      {time}
    </div>
  )
}

function fmt(d) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
}
