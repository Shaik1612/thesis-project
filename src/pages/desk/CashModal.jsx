import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Delete } from 'lucide-react'
import { Button, Modal } from '../../components/ui'
import { CHANNEL_HUE } from './shared'

const QUICK = [50, 100, 200, 500, 2000]
const NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back']

export default function CashModal({ open, onClose, onConfirm, amount, busy, subject = null }) {
  const [tendered, setTendered] = useState('')

  useEffect(() => { if (open) setTendered('') }, [open])

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
    if (k === '.') return setTendered((v) => v.includes('.') ? v : (v || '0') + '.')
    setTendered((v) => (v + k).slice(0, 9))
  }

  return (
    <Modal open={open} onClose={onClose} size="xl" bare>
      <div className="grid h-full grid-cols-[1fr_320px] overflow-hidden rounded-xl bg-surface-0">
        <div className="flex flex-col border-r border-surface-line">
          <div className="flex items-center justify-between gap-4 border-b border-surface-line px-6 py-4">
            <div className="min-w-0 leading-tight">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500">
                {subject?.channel && (
                  <>
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: CHANNEL_HUE[subject.channel] ?? CHANNEL_HUE.desk }}
                    />
                    <span className="font-mono">{subject.channel}</span>
                    <span aria-hidden className="text-ink-300">·</span>
                  </>
                )}
                <span>{subject?.isNew ? 'New ticket · cash' : 'Settling cash'}</span>
              </p>
              <p className="mt-0.5 truncate text-base font-semibold text-ink-900">
                {subject?.isNew
                  ? 'New ticket'
                  : <><span className="font-mono">{subject?.code ?? '—'}</span>{subject?.where ? <span className="text-ink-500"> · {subject.where}</span> : null}</>}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wider text-ink-500 hover:bg-surface-100 hover:text-ink-900"
            >
              esc
            </button>
          </div>

          <div className="grid grid-cols-2 border-b border-surface-line">
            <Readout label="Total due" value={amount} />
            <Readout label="Tendered" value={tenderedDisplay} raw muted />
          </div>

          <div className="border-b border-surface-line bg-surface-50 px-6 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500">Input</p>
              <p className="font-mono text-2xl font-bold tabular-nums text-ink-900">₹{tendered || '0'}</p>
            </div>
          </div>

          <div className="border-b border-surface-line px-6 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500">Common notes</p>
            <div className="flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setTendered(String(q))}
                  className="rounded-md bg-surface-100 px-3 py-1.5 font-mono text-xs font-bold tabular-nums text-ink-800 ring-1 ring-inset ring-surface-line transition-colors hover:bg-surface-150"
                >
                  ₹{q.toLocaleString('en-IN')}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTendered(String(exact))}
                className="rounded-md bg-brand-500 px-3 py-1.5 font-mono text-xs font-bold tabular-nums text-white shadow-brand hover:bg-brand-600"
              >
                Exact · ₹{exact.toLocaleString('en-IN')}
              </button>
            </div>
          </div>

          <div className="flex-1 px-6 py-4">
            <div className="grid grid-cols-3 gap-1.5">
              {NUMPAD.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handlePad(k)}
                  className={[
                    'flex h-12 items-center justify-center rounded-md text-lg font-semibold transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-0',
                    k === 'back'
                      ? 'bg-surface-50 text-ink-600 ring-1 ring-inset ring-surface-line hover:bg-surface-100'
                      : 'bg-surface-100 text-ink-900 ring-1 ring-inset ring-surface-line hover:bg-surface-150',
                  ].join(' ')}
                  aria-label={k === 'back' ? 'Backspace' : k}
                >
                  {k === 'back' ? <Delete className="h-5 w-5" /> : k}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="border-b border-surface-line bg-surface-50 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">Status</p>
            <p className="text-base font-semibold text-ink-900">
              {tNum === 0 ? 'Awaiting cash' : enough ? 'Ready to confirm' : 'Short payment'}
            </p>
          </div>

          <div className="flex-1 px-5 py-5">
            <div
              className={[
                'rounded-lg px-5 py-6 text-center ring-1 ring-inset transition-colors',
                tNum === 0
                  ? 'bg-surface-100 text-ink-400 ring-surface-line'
                  : enough
                    ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20'
                    : 'bg-status-cancelled/10 text-status-cancelled ring-status-cancelled/20',
              ].join(' ')}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]">
                {tNum === 0 ? 'Change due' : enough ? 'Hand back' : 'Short by'}
              </p>
              <p className="mt-1 font-mono text-4xl font-bold leading-none tabular-nums">
                {tNum === 0 ? '—' : `₹${Math.abs(enough ? change : -change).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </p>
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
              Enter to confirm · Esc to cancel
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function Readout({ label, value, raw = false, muted = false }) {
  return (
    <div className={['flex flex-col gap-1 px-6 py-4', muted ? 'border-l border-surface-line bg-surface-50' : 'bg-surface-0'].join(' ')}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-500">{label}</p>
      <p className="font-mono text-3xl font-bold leading-none tabular-nums text-ink-900">
        {raw ? `₹${value}` : `₹${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      </p>
    </div>
  )
}

function SummaryRow({ label, value, emphasis = false, muted = false, tone = 'normal' }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className={[
        emphasis ? 'font-semibold text-ink-900' : 'text-ink-600',
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
