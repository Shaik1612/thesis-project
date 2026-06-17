import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { MoneyText } from './ui'
import { fetchRecommendations } from '../lib/recommendations'

// Horizontal strip under the cart. The parent passes `menuItems` (the full
// loaded menu) so we can resolve the recommended ids back to rich items
// (with variants + removable ingredients) and route the tap through the
// same add path as the menu — opening the config sheet for items that
// have options, or calling onAdd directly otherwise.
export default function YouMayAlsoLike({ cart, menuItems, onPick }) {
  const [picks, setPicks] = useState([])
  const debounce = useRef(null)

  const cartItemIds = useMemo(
    () => [...new Set(cart.items.map(i => i.menuItemId))],
    [cart.items]
  )
  const cartCategoryIds = useMemo(() => {
    const set = new Set()
    for (const cartItem of cart.items) {
      const mi = menuItems.find(m => m.id === cartItem.menuItemId)
      if (mi?.category_id) set.add(mi.category_id)
    }
    return [...set]
  }, [cart.items, menuItems])

  useEffect(() => {
    if (cartItemIds.length === 0) {
      setPicks([])
      return
    }
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      const recs = await fetchRecommendations({
        cartItemIds,
        cartCategoryIds,
        limit: 4,
      })
      // Resolve to full menu items (with variants + removableIngredients)
      const enriched = recs
        .map(r => menuItems.find(m => m.id === r.id) ?? r)
        .filter(Boolean)
      setPicks(enriched)
    }, 300)
    return () => clearTimeout(debounce.current)
  }, [cartItemIds, cartCategoryIds, menuItems])

  if (picks.length === 0) return null

  return (
    <section className="mt-4 border-t border-surface-line pt-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-600">
        <Sparkles className="h-3.5 w-3.5 text-brand-500" />
        You may also like
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {picks.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item)}
            className="group flex w-32 shrink-0 flex-col rounded-xl border border-surface-line bg-surface-0 p-2 text-left active:bg-surface-100"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface-100">
              {item.photo_url ? (
                <img src={item.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl text-ink-400">🍽️</div>
              )}
              <div className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white shadow">
                <Plus className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 line-clamp-2 text-xs font-medium text-ink-900">{item.name}</div>
            <MoneyText
              amount={item.variants?.length ? Math.min(...item.variants.map(v => Number(v.price))) : Number(item.price)}
              className="mt-0.5 text-xs font-semibold text-ink-700"
            />
          </button>
        ))}
      </div>
    </section>
  )
}
