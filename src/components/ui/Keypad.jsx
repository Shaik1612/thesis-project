import { Delete } from 'lucide-react'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']

export default function Keypad({ value = '', onChange, maxLength = 14, allowDecimal = true, className = '' }) {
  const handle = (key) => {
    if (key === 'back') return onChange(value.slice(0, -1))
    if (key === '.') {
      if (!allowDecimal || value.includes('.')) return
      if (!value) return onChange('0.')
      return onChange(value + '.')
    }
    if (value.length >= maxLength) return
    onChange(value + key)
  }

  return (
    <div className={['grid grid-cols-3 gap-2', className].join(' ')}>
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => handle(k)}
          className={[
            'flex h-16 items-center justify-center rounded-lg bg-surface-100 text-2xl font-display font-bold num',
            'active:bg-surface-line active:scale-[0.97] transition-all duration-150',
            k === 'back' ? 'text-ink-600' : 'text-ink-900',
            !allowDecimal && k === '.' ? 'opacity-30 pointer-events-none' : '',
          ].join(' ')}
          aria-label={k === 'back' ? 'Backspace' : k}
        >
          {k === 'back' ? <Delete className="h-6 w-6" /> : k}
        </button>
      ))}
    </div>
  )
}
