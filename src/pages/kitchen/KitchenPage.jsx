import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Clock as ClockIcon,
  LogOut,
  RotateCcw,
  Users,
  Utensils,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useOrders } from '../../hooks/useOrders'

const TO_COOK = ['pending', 'accepted', 'preparing']
const ACTIVE  = [...TO_COOK, 'ready', 'completed']
const CHANNEL_CHIP = { kiosk: 'KIOSK', web: 'WEB', desk: 'DESK' }
const CHIME_KEY = 'dineflow:kds:chime'

function readChimePref() {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(CHIME_KEY) === '1' } catch { return false }
}

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

function nextStatus(status) {
  if (status === 'pending' || status === 'accepted') return 'preparing'
  if (status === 'preparing') return 'ready'
  if (status === 'ready') return 'completed'
  return null
}

export default function KitchenPage() {
  const navigate = useNavigate()
  const { orders, refetch } = useOrders({ status: ACTIVE, refreshInterval: 5_000 })
  const [ingredientNames, setIngredientNames] = useState({})
  const [sessionCovers, setSessionCovers] = useState({})
  const [activeTab, setActiveTab] = useState('all')
  const [recallOpen, setRecallOpen] = useState(false)
  const [completedOrders, setCompletedOrders] = useState([])
  const [chime, setChime] = useState(readChimePref)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const seenIds = useRef(new Set())

  useEffect(() => {
    supabase.from('ingredients').select('id, name').then(({ data }) => {
      if (!data) return
      const map = {}
      for (const ing of data) map[ing.id] = ing.name
      setIngredientNames(map)
    })
    supabase.from('table_sessions').select('id, covers').then(({ data }) => {
      if (!data) return
      const map = {}
      for (const session of data) map[session.id] = session.covers
      setSessionCovers(map)
    })
  }, [])

  // Chime on new orders
  useEffect(() => {
    if (!chime) {
      seenIds.current = new Set(orders.map(o => o.id))
      return
    }
    let fresh = 0
    for (const o of orders) {
      if (!seenIds.current.has(o.id)) { seenIds.current.add(o.id); fresh++ }
    }
    if (fresh > 0 && seenIds.current.size > fresh) playChime()
  }, [orders, chime])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  const fetchCompleted = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name))')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setCompletedOrders(data)
  }, [])

  useEffect(() => {
    if (recallOpen) fetchCompleted()
  }, [recallOpen, fetchCompleted])

  const sorted = useMemo(() => {
    return [...orders].sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority
      return new Date(a.created_at) - new Date(b.created_at)
    })
  }, [orders])

  const toCookCount = useMemo(() => sorted.filter(o => TO_COOK.includes(o.status)).length, [sorted])
  const readyCount  = useMemo(() => sorted.filter(o => o.status === 'ready').length, [sorted])
  const completedCount = useMemo(() => sorted.filter(o => o.status === 'completed').length, [sorted])

  const filtered = useMemo(() => {
    if (activeTab === 'to_cook') return sorted.filter(o => TO_COOK.includes(o.status))
    if (activeTab === 'ready')   return sorted.filter(o => o.status === 'ready')
    if (activeTab === 'completed') return sorted.filter(o => o.status === 'completed')
    return sorted
  }, [sorted, activeTab])

  useEffect(() => {
    if (selectedIdx >= filtered.length) setSelectedIdx(Math.max(0, filtered.length - 1))
  }, [filtered.length, selectedIdx])

  const advance = useCallback(async (orderId, status) => {
    const next = nextStatus(status)
    if (!next) return
    await supabase.from('orders').update({ status: next }).eq('id', orderId)
    refetch()
  }, [refetch])

  const bump = useCallback(async (orderId) => {
    await supabase.from('orders').update({ priority: 2 }).eq('id', orderId)
    refetch()
  }, [refetch])

  const reopen = useCallback(async (orderId) => {
    await supabase.from('orders').update({ status: 'ready' }).eq('id', orderId)
    setRecallOpen(false)
    setActiveTab('ready')
    refetch()
    fetchCompleted()
  }, [refetch, fetchCompleted])

  // Keyboard: ← → navigate, Space advance, B bump priority
  useEffect(() => {
    function onKey(e) {
      const el = e.target
      if (el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setSelectedIdx(i => Math.min(filtered.length - 1, i + 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setSelectedIdx(i => Math.max(0, i - 1))
      } else if (e.key === ' ') {
        const card = filtered[selectedIdx]
        if (card) { e.preventDefault(); advance(card.id, card.status) }
      } else if (e.key.toLowerCase() === 'b') {
        const card = filtered[selectedIdx]
        if (card) { e.preventDefault(); bump(card.id) }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [filtered, selectedIdx, advance, bump])

  function toggleChime() {
    setChime(c => {
      const next = !c
      try { localStorage.setItem(CHIME_KEY, next ? '1' : '0') } catch {}
      return next
    })
  }

  const TABS = [
    { key: 'all',       label: 'All',       badge: null,           badgeClass: '' },
    { key: 'to_cook',   label: 'To cook',   badge: toCookCount,    badgeClass: 'bg-zinc-300 text-zinc-950' },
    { key: 'ready',     label: 'Ready',     badge: readyCount,     badgeClass: 'bg-blue-500 text-zinc-950' },
    { key: 'completed', label: 'Completed', badge: completedCount, badgeClass: 'bg-lime-500 text-zinc-950' },
  ]

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#f1f3f5] font-body text-[#111827]">
      <header className="shrink-0 border-b border-[#d7dbe0] bg-white">
        <div className="flex min-h-[64px] items-stretch overflow-x-auto">
          <nav className="flex items-stretch flex-1 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  'inline-flex min-w-[112px] items-center justify-center gap-2 px-6 text-[19px] font-semibold whitespace-nowrap transition-colors',
                  activeTab === tab.key
                    ? 'bg-[#e6e8eb] text-slate-900 shadow-[inset_0_0_0_1px_rgba(17,24,39,0.04)]'
                    : 'text-slate-800 hover:bg-slate-100',
                ].join(' ')}
              >
                {tab.label}
                {tab.badge !== null && (
                  <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[20px] font-bold leading-none ${tab.badgeClass}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-stretch border-l border-[#d7dbe0]">
            <button
              type="button"
              onClick={() => setRecallOpen(true)}
              className="inline-flex min-w-[128px] items-center justify-center gap-2 bg-[#d9dde3] px-6 text-[20px] font-semibold text-slate-900 transition-colors hover:bg-[#cfd4dc]"
            >
              <RotateCcw className="h-6 w-6 stroke-[3]" />
              Recall
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex min-w-[120px] items-center justify-center gap-2 border-l border-[#cfd4dc] bg-white px-6 text-[20px] font-semibold text-slate-900 transition-colors hover:bg-slate-100"
            >
              Close
              <LogOut className="h-6 w-6 stroke-[3]" />
            </button>
            <button
              type="button"
              onClick={toggleChime}
              aria-label={chime ? 'Disable order chime' : 'Enable order chime'}
              className={[
                'inline-flex w-14 items-center justify-center border-l border-[#d7dbe0] transition-colors',
                chime ? 'bg-blue-500 text-white' : 'bg-white text-slate-500 hover:text-slate-900',
              ].join(' ')}
            >
              {chime ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto p-4 sm:p-5"
        style={{
          backgroundColor: '#e9edf2',
          backgroundImage:
            'linear-gradient(180deg, rgba(255,255,255,0.82), rgba(233,237,242,0.92))',
        }}
      >
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded bg-white px-8 py-7 text-center shadow-sm">
              <Utensils className="mx-auto mb-3 h-10 w-10 text-slate-400" />
              <p className="text-base font-semibold text-slate-600">
                {activeTab === 'to_cook' ? 'Nothing to cook' : activeTab === 'ready' ? 'Nothing ready yet' : activeTab === 'completed' ? 'No completed orders' : 'All caught up'}
              </p>
            </div>
          </div>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
            {filtered.map((order, idx) => (
              <OrderCard
                key={order.id}
                order={order}
                ingredientNames={ingredientNames}
                covers={sessionCovers[order.session_id]}
                now={now}
                selected={idx === selectedIdx}
                onAdvance={() => advance(order.id, order.status)}
                onFocus={() => setSelectedIdx(idx)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Recall drawer */}
      {recallOpen && (
        <RecallDrawer
          orders={completedOrders}
          onClose={() => setRecallOpen(false)}
          onReopen={reopen}
        />
      )}
    </div>
  )
}

function OrderCard({ order, ingredientNames = {}, covers, now, selected, onAdvance, onFocus }) {
  const elapsed = Math.max(0, Math.floor((now - new Date(order.created_at).getTime()) / 60_000))
  const isReady  = order.status === 'ready'
  const isToCook = TO_COOK.includes(order.status)
  const isCompleted = order.status === 'completed'
  const isCooking = order.status === 'preparing'
  const isHot = isCooking || order.priority >= 2 || (isToCook && elapsed >= 10)
  const party = covers || (order.order_type === 'dine_in' ? 1 : 0)
  const code = order.id.slice(-3).toUpperCase()
  const headerClass = isCompleted
    ? 'bg-lime-300'
    : isReady
      ? 'bg-emerald-300'
      : isHot
        ? 'bg-pink-400'
        : 'bg-[#f7f8fa]'
  const borderClass = isCompleted || isReady
    ? 'border-emerald-300'
    : isHot
      ? 'border-pink-400'
      : 'border-[#d8dde3]'
  const timeClass = isHot
    ? 'bg-rose-500 text-white'
    : 'bg-white text-slate-950'
  const canAdvance = Boolean(nextStatus(order.status))

  return (
    <article
      tabIndex={0}
      onFocus={onFocus}
      onClick={() => {
        onFocus()
        if (canAdvance) onAdvance()
      }}
      className={[
        'mb-4 inline-block w-full break-inside-avoid overflow-hidden rounded-[4px] border-2 bg-white align-top text-slate-900 shadow-sm outline-none transition-all',
        canAdvance ? 'cursor-pointer' : 'cursor-default',
        borderClass,
        selected ? 'ring-2 ring-slate-900/20 ring-offset-2 ring-offset-[#e9edf2]' : '',
      ].join(' ')}
      aria-label={`Order ${code}, ${statusLabel(order.status)}`}
    >
      <div className={`flex min-h-[42px] items-center justify-between gap-3 px-3 text-[18px] font-bold leading-none ${headerClass}`}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 tabular-nums">#{code}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Users className="h-5 w-5 fill-slate-950 stroke-slate-950" />
          <span className="tabular-nums">{party}</span>
        </div>
      </div>

      <div className="flex items-center justify-between bg-[#f5f6f7] px-3 py-2.5">
        <span className={[
          'inline-flex min-h-9 items-center rounded-full px-4 text-[17px] font-semibold leading-none',
          isCompleted ? 'bg-lime-300 text-slate-950' : isReady ? 'bg-emerald-200 text-slate-950' : 'bg-[#c7c9cc] text-slate-900',
        ].join(' ')}>
          {statusLabel(order.status)}
        </span>
        <span className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[17px] font-bold leading-none tabular-nums ${timeClass}`}>
          <ClockIcon className="h-4 w-4 stroke-[3]" />
          {elapsed}'
        </span>
      </div>

      {order.channel && (
        <div className="flex items-center gap-2 border-t border-[#eef0f2] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          <span>{CHANNEL_CHIP[order.channel] ?? order.channel}</span>
          {order.order_type === 'takeaway' && (
            <>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>To go</span>
            </>
          )}
        </div>
      )}

      <ul className="flex flex-col gap-4 px-3 py-3">
        {order.order_items?.map(oi => {
          const removed = (oi.customizations?.removed_ingredients ?? [])
            .map(id => ingredientNames[id])
            .filter(Boolean)
          const instr = oi.customizations?.special_instructions
          return (
            <li key={oi.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-2 text-[20px] leading-tight">
                <span className="shrink-0 font-normal text-slate-500 tabular-nums">{oi.quantity}x</span>
                <span className="font-medium text-slate-800">
                  {oi.menu_items?.name ?? 'Item'}
                  {oi.variant_name && <span className="text-slate-500"> · {oi.variant_name}</span>}
                </span>
              </div>
              {removed.length > 0 && (
                <div className="ml-8 flex flex-wrap gap-1">
                  {removed.map(name => (
                    <span key={name} className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-rose-700">
                      No {name}
                    </span>
                  ))}
                </div>
              )}
              {instr && (
                <div className="ml-8 text-sm font-semibold italic text-amber-700">"{instr}"</div>
              )}
            </li>
          )
        })}
      </ul>
    </article>
  )
}

function statusLabel(status) {
  if (status === 'preparing') return 'Cooking'
  if (TO_COOK.includes(status)) return 'To cook'
  if (status === 'ready') return 'Ready'
  if (status === 'completed') return 'Completed'
  return status
}

function RecallDrawer({ orders, onClose, onReopen }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-80 bg-kds-card border-l border-kds-line z-50 flex flex-col shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-kds-line shrink-0">
          <div>
            <span className="font-display font-bold text-sm">Recall</span>
            <p className="text-xs text-kds-dim mt-0.5">Recently completed orders</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close recall"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-kds-dim hover:text-kds-text hover:bg-kds-line transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {orders.length === 0 ? (
            <div className="flex h-full items-center justify-center px-4 text-center">
              <p className="text-kds-dim text-sm">No recently completed orders</p>
            </div>
          ) : (
            <ul className="divide-y divide-kds-line">
              {orders.map(o => {
                const elapsed = Math.floor((Date.now() - new Date(o.created_at)) / 60_000)
                const itemCount = o.order_items?.length ?? 0
                return (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase text-kds-dim">
                          {CHANNEL_CHIP[o.channel] ?? o.channel}
                        </span>
                        <span className="text-sm font-bold">#{o.id.slice(-4).toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-kds-dim mt-0.5">
                        {itemCount} item{itemCount !== 1 ? 's' : ''} · {elapsed}m ago
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onReopen(o.id)}
                      className="shrink-0 rounded-lg bg-status-ready/15 px-2.5 py-1.5 text-xs font-bold text-status-ready hover:bg-status-ready hover:text-white transition-colors"
                    >
                      Re-open
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}

function Clock() {
  const [time, setTime] = useState(() => fmt(new Date()))
  useEffect(() => {
    const id = setInterval(() => setTime(fmt(new Date())), 10_000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-kds-line px-3 py-1.5 font-display text-sm font-bold tabular-nums ml-1">
      <ClockIcon className="h-3.5 w-3.5 text-kds-dim" />
      {time}
    </div>
  )
}

function fmt(d) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
}
