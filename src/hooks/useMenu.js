import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Pull variants and the customer-removable ingredient mappings in the same
// request as the menu items so opening the item config sheet doesn't fan
// out a per-item query.
const MENU_SELECT = `
  *,
  categories(name),
  menu_item_variants(id, name, price, sort_order, available),
  menu_item_ingredients(
    ingredient_id,
    customer_removable,
    ingredients(id, name)
  )
`

function normalizeItem(raw) {
  const variants = (raw.menu_item_variants ?? [])
    .filter(v => v.available)
    .sort((a, b) => a.sort_order - b.sort_order)
  const removableIngredients = (raw.menu_item_ingredients ?? [])
    .filter(mii => mii.customer_removable && mii.ingredients)
    .map(mii => ({ id: mii.ingredients.id, name: mii.ingredients.name }))
  return {
    ...raw,
    variants,
    removableIngredients,
    hasOptions: variants.length > 0 || removableIngredients.length > 0,
  }
}

export function displayPrice(item) {
  if (item?.variants?.length > 0) {
    return Math.min(...item.variants.map(v => Number(v.price)))
  }
  return Number(item?.price ?? 0)
}

export function hasMultipleVariants(item) {
  return (item?.variants?.length ?? 0) > 0
}

export function useMenu() {
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [catRes, itemRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('menu_items').select(MENU_SELECT).order('sort_order'),
      ])
      if (cancelled) return

      setCategories(catRes.data ?? [])
      setItems((itemRes.data ?? []).map(normalizeItem))
      setLoading(false)
      if (catRes.error) setError(catRes.error)
      if (itemRes.error) setError(itemRes.error)
    }

    async function reloadItem(id) {
      const { data } = await supabase
        .from('menu_items')
        .select(MENU_SELECT)
        .eq('id', id)
        .maybeSingle()
      if (cancelled || !data) return
      const fresh = normalizeItem(data)
      setItems(prev => prev.map(item => (item.id === id ? fresh : item)))
    }

    load()

    const channel = supabase
      .channel('menu_availability')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'menu_items' },
        ({ new: updated }) => {
          setItems(prev =>
            prev.map(item =>
              item.id === updated.id ? { ...item, ...updated } : item
            )
          )
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_item_variants' },
        ({ new: row, old }) => reloadItem(row?.menu_item_id ?? old?.menu_item_id)
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  return { categories, items, loading, error }
}
