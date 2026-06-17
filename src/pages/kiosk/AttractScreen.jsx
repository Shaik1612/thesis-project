import { Flame, Hand } from 'lucide-react'

// Full-bleed attract screen. Animated gradient background, scrolling marquee
// of popular items, single tap-to-start CTA. Designed to look alive even when
// nobody is interacting with it.

export default function AttractScreen({ onStart, items = [] }) {
  // Show up to 12 popular items in the marquee. We duplicate the list so the
  // scroll wraps seamlessly.
  const marqueeItems = items
    .filter((i) => i.available !== false)
    .slice(0, 12)
  const marqueeList = marqueeItems.length > 0 ? [...marqueeItems, ...marqueeItems] : []

  return (
    <button
      type="button"
      onClick={onStart}
      className="group relative flex h-full w-full flex-col overflow-hidden text-center transition-transform active:scale-[0.995]"
      aria-label="Tap anywhere to start ordering"
    >
      {/* Background: animated brand-hot gradient + grain overlay. */}
      <div className="absolute inset-0 bg-brand-hot" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{ backgroundImage: 'var(--tw-grain, none)' }}
      />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(110%_70%_at_0%_0%,rgba(255,255,255,0.25),transparent_60%),radial-gradient(80%_60%_at_100%_100%,rgba(0,0,0,0.25),transparent_60%)]" />
      <div aria-hidden className="absolute inset-0 bg-grain mix-blend-overlay opacity-50" />

      {/* Centerpiece. */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10 px-8 text-white">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] backdrop-blur">
          <Flame className="h-3.5 w-3.5" />
          Hot &amp; fresh now
        </div>
        <div className="flex flex-col items-center gap-4">
          <h1 className="font-display text-[7.5rem] font-extrabold leading-none tracking-tighter drop-shadow-[0_4px_24px_rgba(0,0,0,0.18)]">
            DineFlow
          </h1>
          <p className="font-display text-3xl font-semibold tracking-tight text-white/90">
            Tap. Customise. Eat.
          </p>
        </div>

        <div className="mt-6 inline-flex items-center gap-4 rounded-full bg-white px-10 py-5 text-brand-600 shadow-lg ring-1 ring-white/40 transition-transform group-hover:-translate-y-1 group-active:translate-y-0 animate-tap-pulse">
          <Hand className="h-7 w-7" />
          <span className="font-display text-3xl font-extrabold tracking-tight">
            Tap anywhere to order
          </span>
        </div>
      </div>

      {/* Marquee of items along the bottom. */}
      {marqueeList.length > 0 && (
        <div className="relative z-10 mb-8 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-brand-600/60 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-brand-600/60 to-transparent" />
          <div className="flex w-max gap-4 px-8 animate-marquee">
            {marqueeList.map((it, idx) => (
              <span
                key={`${it.id}-${idx}`}
                className="inline-flex items-center gap-3 rounded-full bg-white/12 px-5 py-2.5 font-display text-lg font-semibold text-white/95 backdrop-blur"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white/70" aria-hidden />
                {it.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </button>
  )
}
