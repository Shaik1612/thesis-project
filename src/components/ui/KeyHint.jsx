// Sharp keyboard-glyph chip in the Linear / Vercel mould. Use to render
// shortcuts inline ("Press ⌘K to search"). Accepts string keys ("Esc"),
// modifier symbols, or an array of keys to compose a chord ("⌘", "K").

const SYM = {
  cmd:   '⌘',
  ctrl:  'Ctrl',
  alt:   '⌥',
  shift: '⇧',
  enter: '↵',
  esc:   'Esc',
  tab:   'Tab',
  up:    '↑',
  down:  '↓',
  left:  '←',
  right: '→',
  space: '␣',
  back:  '⌫',
}

const KEY_CLS = 'kbd font-mono'

export default function KeyHint({ keys, separator = '+', className = '' }) {
  const list = Array.isArray(keys) ? keys : [keys]
  return (
    <span className={['inline-flex items-center gap-0.5 text-ink-500', className].join(' ')}>
      {list.map((k, idx) => {
        const key = typeof k === 'string' ? (SYM[k.toLowerCase()] ?? k) : k
        return (
          <span key={idx} className="inline-flex items-center gap-0.5">
            {idx > 0 && <span className="px-0.5 text-[10px] text-ink-400">{separator}</span>}
            <kbd className={KEY_CLS}>{key}</kbd>
          </span>
        )
      })}
    </span>
  )
}
