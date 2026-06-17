import { supabase } from './supabase'

// Fetch up to `limit` "you may also like" candidates given the menu item ids
// already in the cart. We try three strategies in order and stop as soon as
// we have enough:
//   1. Co-occurrence — items that have appeared in past completed orders
//      alongside anything already in the cart (item_pairs MV).
//   2. Same-category popular — top selling menu items in the same categories
//      as the cart items, last 30 days.
//   3. Same-category fallback — any other available items in those categories,
//      so first-time customers still see something useful.
//
// All three strategies filter out items already in the cart and limit the
// final list to `limit` distinct menu items.
export async function fetchRecommendations({ cartItemIds, cartCategoryIds = [], limit = 4 }) {
  if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) return []

  const exclude = new Set(cartItemIds)
  const picked = []

  function take(items) {
    for (const it of items) {
      if (picked.length >= limit) break
      if (exclude.has(it.id)) continue
      exclude.add(it.id)
      picked.push(it)
    }
  }

  // Strategy 1: co-occurrence
  const { data: pairs } = await supabase
    .from('item_pairs')
    .select('item_a, item_b, co_count')
    .or(
      cartItemIds.map(id => `item_a.eq.${id},item_b.eq.${id}`).join(',')
    )
    .order('co_count', { ascending: false })
    .limit(limit * 4)

  if (pairs?.length) {
    const recIds = []
    for (const p of pairs) {
      const partner = cartItemIds.includes(p.item_a) ? p.item_b : p.item_a
      if (!exclude.has(partner) && !recIds.includes(partner)) recIds.push(partner)
      if (recIds.length >= limit) break
    }
    if (recIds.length) {
      const { data: items } = await supabase
        .from('menu_items')
        .select('id, name, price, photo_url, category_id, available')
        .in('id', recIds)
        .eq('available', true)
      // Preserve recIds order (strongest co-occurrence first).
      const byId = new Map((items ?? []).map(i => [i.id, i]))
      take(recIds.map(id => byId.get(id)).filter(Boolean))
    }
  }

  if (picked.length >= limit) return picked

  // Strategy 2: category-popular over the last 30 days
  if (cartCategoryIds.length > 0) {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const { data: recent } = await supabase
      .from('order_items')
      .select('menu_item_id, menu_items!inner(id, name, price, photo_url, category_id, available), orders!inner(status, created_at)')
      .eq('orders.status', 'completed')
      .gt('orders.created_at', since)
      .in('menu_items.category_id', cartCategoryIds)
      .eq('menu_items.available', true)
      .limit(200)

    if (recent?.length) {
      const counts = new Map()
      for (const row of recent) {
        if (!row.menu_items) continue
        const id = row.menu_item_id
        const prev = counts.get(id)
        if (prev) prev.count += 1
        else counts.set(id, { item: row.menu_items, count: 1 })
      }
      const sorted = [...counts.values()]
        .sort((a, b) => b.count - a.count)
        .map(({ item }) => item)
      take(sorted)
    }
  }

  if (picked.length >= limit) return picked

  // Strategy 3: any other available items in the same categories
  if (cartCategoryIds.length > 0) {
    const { data: filler } = await supabase
      .from('menu_items')
      .select('id, name, price, photo_url, category_id, available')
      .in('category_id', cartCategoryIds)
      .eq('available', true)
      .limit(limit * 2)
    take(filler ?? [])
  }

  return picked
}
