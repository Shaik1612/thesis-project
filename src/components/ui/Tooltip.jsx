import { Children, cloneElement, useId, useState } from 'react'

// Pure-CSS tooltip — no portals, no positioning lib. Trigger must be a single
// focusable element. Wraps the child in a relative span so the tooltip
// positions itself.
//
// Use for keyboard hints and dense desk/admin actions. Disabled when `content`
// is falsy so callers can conditionally hide.

const SIDE = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  right:  'left-full top-1/2 -translate-y-1/2 ml-2',
}

const ARROW = {
  top:    'left-1/2 -translate-x-1/2 -bottom-1 border-x-transparent border-b-transparent border-t-ink-900',
  bottom: 'left-1/2 -translate-x-1/2 -top-1    border-x-transparent border-t-transparent border-b-ink-900',
  left:   'top-1/2 -translate-y-1/2 -right-1   border-y-transparent border-r-transparent border-l-ink-900',
  right:  'top-1/2 -translate-y-1/2 -left-1    border-y-transparent border-l-transparent border-r-ink-900',
}

export default function Tooltip({
  content,
  side = 'top',
  children,
  // Delay before the tooltip becomes visible on hover (ms).
  delay = 200,
  className = '',
}) {
  const [shown, setShown] = useState(false)
  const id = useId()

  if (!content) return children

  // Single child trigger; we wire aria-describedby so screen readers announce.
  const trigger = Children.only(children)
  const triggerWithAria = cloneElement(trigger, {
    'aria-describedby': shown ? id : undefined,
  })

  let timer
  const show = () => {
    timer = setTimeout(() => setShown(true), delay)
  }
  const hide = () => {
    clearTimeout(timer)
    setShown(false)
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={() => setShown(true)}
      onBlur={() => setShown(false)}
    >
      {triggerWithAria}
      <span
        id={id}
        role="tooltip"
        className={[
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-md',
          'transition-opacity duration-150',
          shown ? 'opacity-100' : 'opacity-0',
          SIDE[side],
          className,
        ].join(' ')}
      >
        {content}
        <span className={['absolute h-0 w-0 border-4 border-solid', ARROW[side]].join(' ')} aria-hidden />
      </span>
    </span>
  )
}
