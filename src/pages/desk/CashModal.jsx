import { useEffect, useMemo, useState } from 'react'
import { Banknote, ArrowRight, Delete, CheckCircle2 } from 'lucide-react'
import { Button, Modal } from '../../components/ui'
import { CHANNEL_HUE } from './shared'

const QUICK = [50, 100, 200, 500, 2000]
const NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back']

export default function CashModal({ open, onClose, onConfirm, amount, busy, subject = null }) {
  const [tendered, setTendered] = useState('')

  useEffect(() => { if (open) setTendered('') }, [open])

  // Keyboard input — every operator should be able to type the amount.
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (busy) return
      if (e.key === 'Enter' && Number(tendered) >= amount) {
        e.preventDefault()
        onConfirm?.(Number(tendered))
        return
      }
      if (e.key === 'Backspace') { e.preventDefault(); return setTendered((v) => v.slice(0, -1)) }
      if (/^[0-9]$/.test(e.key))  { e.preventDefault(); return setTendered((v) => (v + e.key).slice(0, 9)) }
      if (e.key === '.')          { e.preventDefault(); return setTendered((v) => v.includes('.') ? v : (v || '0') + '.') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, tendered, amount, busy, onConfirm])

  const tNum = Number(tendered || 0)
  const change = tNum - amount
  const enough = tNum >= amount
  const exact = Math.ceil(amount)

  const tenderedDisplay = useMemo(() => {
    if (!tendered) return '0'
    return Number(tendered).toLocaleString('en-IN', { maximumFractionDigits: 2 })
  }, [tendered])

  function handlePad(k) {
    if (busy) return
    if (k === 'back') return setTendered((v) => v.slice(0, -1))
    if (k === '.') {
      return setTendered((v) => v.includes('.') ? v : (v || '0') + '.')
    }
    setTendered((v) => (v + k).slice(0, 9))
  }

  return (
    <Modal open={open} onClose={onClose} size="xl" bare>
      <div className="grid h-full grid-cols-[1fr_320px] overflow-hidden rounded-2xl bg-surface-0">
        {/* Left: calculator face. */}
        <div className="flex flex-col bg-ink-900 text-white">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 shadow-brand">
                <Banknote className="h-4 w-4" />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                  {subject?.channel && (
                    <>
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: CHANNEL_HUE[subject.channel] ?? CHANNEL_HUE.desk }}
                      />
                      <span className="font-mono">{subject.channel}</span>
                      <span aria-hidden className="text-white/30">·</span>
                    </>
                  )}
                  <span>{subject?.isNew ? 'New ticket · cash' : 'Settling cash'}</span>
                </p>
                <p className="mt-0.5 truncate font-display text-base font-extrabold">
                  {subject?.isNew
                    ? 'New ticket'
                    : <><span className="font-mono">{subject?.code ?? '—'}</span>{subject?.where ? <span className="text-white/55"> · {subject.where}</span> : null}</>}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider text-white/60 hover:bg-white/5 hover:text-white"
            >
              esc
            </button>
          </div>

          {/* Big readouts. */}
          <div className="grid grid-cols-2 gap-px bg-white/10">
            <Readout label="Total due"  value={amount} tone="due" />
            <Readout label="Tendered"   value={tenderedDisplay} tone="tendered" raw />
          </div>

          {/* Tendered display (raw input). */}
          <div className="border-b border-white/10 bg-black/30 px-6 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">Input</p>
              <p className="readout text-2xl font-extrabold tabular-nums text-white">
                ₹{tendered || '0'}
                <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-brand-400 align-middle" />
              </p>
            </div>
          </div>

          {/* Quick denominations. */}
          <div className="border-b border-white/10 px-6 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">Common notes</p>
            <div className="flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setTendered(String(q))}
                  className="rounded-md bg-white/5 px-3 py-1.5 font-mono text-xs font-bold tabular-nums text-white ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10"
                >
                  ₹{q.toLocaleString('en-IN')}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTendered(String(exact))}
                className="rounded-md bg-brand-500/15 px-3 py-1.5 font-mono text-xs font-bold tabular-nums text-amber-200 ring-1 ring-inset ring-brand-500/30 hover:bg-brand-500/25"
              >
                Exact · ₹{exact.toLocaleString('en-IN')}
              </button>
            </div>
          </div>

          {/* Number pad. */}
          <div className="flex-1 px-6 py-4">
            <div className="grid grid-cols-3 gap-1.5">
              {NUMPAD.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handlePad(k)}
                  className={[
                    'flex h-12 items-center justify-center rounded-lg font-display text-lg font-bold transition-all active:scale-[0.97]',
                    k === 'back'
                      ? 'bg-white/5 text-white/70 ring-1 ring-inset ring-white/10 hover:bg-white/10'
                      : 'bg-white/10 text-white ring-1 ring-inset ring-white/10 hover:bg-white/20',
                  ].join(' ')}
                  aria-label={k === 'back' ? 'Backspace' : k}
                >
                  {k === 'back' ? <Delete className="h-5 w-5" /> : k}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: change display + confirm. */}
        <div className="flex flex-col">
          <div className="border-b border-surface-line bg-surface-50 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-400">Status</p>
            <p className="font-display text-base font-extrabold text-ink-900">
              {tNum === 0 ? 'Awaiting cash' : enough ? 'Ready to confirm' : 'Short payment'}
            </p>
          </div>

          <div className="flex-1 px-5 py-5">
            <div
              className={[
                'rounded-xl px-5 py-6 text-center ring-1 ring-inset transition-colors',
                tNum === 0
                  ? 'bg-surface-100 text-ink-400 ring-surface-line'
                  : enough
                    ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20'
                    : 'bg-status-cancelled/10 text-status-cancelled ring-status-cancelled/20',
              ].join(' ')}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]">
                {tNum === 0 ? 'Change due' : enough ? 'Hand back' : 'Short by'}
              </p>
              <p className="readout mt-1 font-display text-4xl font-extrabold leading-none">
                {tNum === 0 ? '—' : `₹${Math.abs(enough ? change : -change).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </p>
              {enough && tNum > 0 && (
                <p className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </p>
              )}
            </div>

            <div className="mt-5 space-y-2 rounded-lg bg-surface-50 px-4 py-3 ring-1 ring-inset ring-surface-line">
              <SummaryRow label="Bill total" value={amount} />
              <SummaryRow label="Cash in" value={tNum} muted />
              <div className="border-t border-dashed border-surface-line pt-2">
                <SummaryRow
                  label={enough ? 'Change out' : 'Short'}
                  value={Math.abs(enough ? change : -change)}
                  emphasis
                  tone={enough ? 'good' : 'bad'}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-surface-line bg-surface-50 px-5 py-4">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              busy={busy}
              disabled={!enough}
              onClick={() => onConfirm?.(tNum)}
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              {enough ? 'Confirm cash received' : 'Tender more cash'}
            </Button>
            <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-ink-400">
              press <kbd className="kbd">enter</kbd> to confirm · <kbd className="kbd">esc</kbd> to cancel
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function Readout({ label, value, tone, raw = false }) {
  return (
    <div className={[
      'flex flex-col gap-1 px-6 py-4',
      tone === 'due' ? 'bg-black/40' : 'bg-black/20',
    ].join(' ')}>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">{label}</p>
      <p className={[
        'readout font-display text-3xl font-extrabold leading-none',
        tone === 'due' ? 'text-white' : 'text-amber-200',
      ].join(' ')}>
        {raw ? `₹${value}` : `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      </p>
    </div>
  )
}

function SummaryRow({ label, value, emphasis = false, muted = false, tone = 'normal' }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className={[
        emphasis ? 'font-display font-bold text-ink-900' : 'text-ink-600',
        muted ? 'text-ink-500' : '',
      ].join(' ')}>
        {label}
      </span>
      <span className={[
        'font-mono font-bold tabular-nums',
        emphasis ? 'text-base' : 'text-sm',
        tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-status-cancelled' : 'text-ink-900',
      ].join(' ')}>
        ₹{Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  )
}
