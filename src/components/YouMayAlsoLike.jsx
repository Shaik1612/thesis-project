import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { MoneyText } from './ui'
import { fetchRecommendations } from '../lib/recommendations'

// Horizontal strip under the cart. The parent passes `menuItems` (the full
// loaded menu) so we can resolve the recommended ids back to rich items
// (with variants + removable ingredients) and route the tap through the
// same add path as the menu — opening the config sheet for items that
// have options, or calling onAdd directly otherwise.
export default function YouMayAlsoLike({ cart, menuItems, onPick, showAll = false, layout = 'scroll' }) {
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
  const fallbackPicks = useMemo(() => {
    if (cartItemIds.length === 0) return []

    const cartIds = new Set(cartItemIds)
    const sameCategory = []
    const otherItems = []

    for (const item of menuItems) {
      if (!item || item.available === false || cartIds.has(item.id)) continue
      if (cartCategoryIds.includes(item.category_id)) sameCategory.push(item)
      else otherItems.push(item)
    }

    return [...sameCategory, ...otherItems].slice(0, 6)
  }, [cartCategoryIds, cartItemIds, menuItems])

  useEffect(() => {
    if (showAll) {
      setPicks([])
      return
    }
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
      const seen = new Set(enriched.map(item => item.id))
      const filled = [
        ...enriched,
        ...fallbackPicks.filter(item => !seen.has(item.id)),
      ]
      setPicks(filled.slice(0, 6))
    }, 300)
    return () => clearTimeout(debounce.current)
  }, [cartItemIds, cartCategoryIds, fallbackPicks, menuItems, showAll])

  const allPicks = useMemo(
    () => menuItems.filter((item) => item && item.available !== false),
    [menuItems],
  )
  const displayPicks = showAll ? allPicks : picks.length > 0 ? picks : fallbackPicks

  if (displayPicks.length === 0) return null

  return (
    <section className="mt-7 border-t border-surface-line pt-4">
      <div className="mb-4 flex items-center gap-2 text-[14px] font-extrabold uppercase tracking-[0.12em] text-ink-600">
        <Sparkles className="h-[18px] w-[18px] text-brand-500" />
        You may also like
      </div>
      <div className={[
        layout === 'grid'
          ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'
          : '-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 no-scrollbar',
      ].join(' ')}>
        {displayPicks.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item)}
            className={[
              'group flex flex-col rounded-2xl border border-surface-line bg-surface-0 p-2.5 text-left shadow-sm active:bg-surface-100',
              layout === 'grid' ? 'min-w-0' : 'w-[126px] shrink-0',
            ].join(' ')}
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-surface-100">
              {item.photo_url ? (
                <img src={item.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl text-ink-400">+</div>
              )}
              <div className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow">
                <Plus className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2.5 line-clamp-2 min-h-[2.4rem] text-[15px] font-semibold leading-tight text-ink-900">{item.name}</div>
            <MoneyText
              amount={item.variants?.length ? Math.min(...item.variants.map(v => Number(v.price))) : Number(item.price)}
              className="mt-1.5 font-display text-[16px] font-extrabold leading-none text-ink-900"
            />
          </button>
        ))}
      </div>
    </section>
  )
}
