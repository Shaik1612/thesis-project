import { Minus, Plus, Trash2 } from 'lucide-react'

const SIZE = {
  sm:    { btn: 'h-9  w-9  text-base rounded-lg',  icon: 'h-4 w-4', label: 'min-w-[2rem]    text-base' },
  md:    { btn: 'h-11 w-11 text-lg   rounded-lg',  icon: 'h-5 w-5', label: 'min-w-[2.5rem]  text-lg' },
  lg:    { btn: 'h-14 w-14 text-xl   rounded-xl',  icon: 'h-6 w-6', label: 'min-w-[2.75rem] text-xl' },
  kiosk: { btn: 'h-16 w-16 text-2xl  rounded-2xl', icon: 'h-7 w-7', label: 'min-w-[3rem]    text-2xl' },
}

export default function QtyStepper({
  count,
  onMinus,
  onPlus,
  // Back-compat: `kiosk` boolean still works. New: explicit `size`.
  kiosk = false,
  size,
  min = 0,
  max = Infinity,
  // When true and count === min, the minus button renders a trash icon instead.
  trashAtMin = false,
  label,
  className = '',
}) {
  const sz = SIZE[size] ?? (kiosk ? SIZE.kiosk : SIZE.md)
  const atMin = count <= min
  const atMax = count >= max
  const showTrash = atMin && trashAtMin

  return (
    <div
      className={['inline-flex items-center gap-1', className].join(' ')}
      role="group"
      aria-label={label ?? `Quantity ${count}`}
    >
      <button
        type="button"
        onClick={onMinus}
        disabled={atMin && !trashAtMin}
        aria-label={showTrash ? 'Remove item' : 'Decrease quantity'}
        className={[
          'flex items-center justify-center font-medium transition-all duration-150',
          'active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40',
          showTrash
            ? 'bg-status-cancelled/12 text-status-cancelled hover:bg-status-cancelled/18'
            : 'bg-surface-100 text-ink-900 hover:bg-surface-150 active:bg-surface-line',
          sz.btn,
        ].join(' ')}
      >
        {showTrash ? <Trash2 className={sz.icon} /> : <Minus className={sz.icon} />}
      </button>
      <span
        className={['text-center font-display font-bold num tabular-nums', sz.label].join(' ')}
        aria-live="polite"
      >
        {count}
      </span>
      <button
        type="button"
        onClick={onPlus}
        disabled={atMax}
        aria-label="Increase quantity"
        className={[
          'flex items-center justify-center font-medium text-white transition-all duration-150',
          'bg-brand-500 hover:bg-brand-600 active:bg-brand-700 active:scale-[0.94]',
          'disabled:cursor-not-allowed disabled:bg-ink-400',
          sz.btn,
        ].join(' ')}
      >
        <Plus className={sz.icon} />
      </button>
    </div>
  )
}
