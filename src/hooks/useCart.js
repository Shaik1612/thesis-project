import { useState, useCallback, useMemo } from 'react'
import { calcGst } from '../components/PriceDisplay'

// A cart line is uniquely identified by menu item + variant + the exact set
// of customizations. Two "Margherita — no cheese" lines collapse into one
// stepper, while "Margherita" and "Margherita — no onion" stay separate.
function lineKeyFor(menuItemId, variantId, customizations) {
  const removed = [...(customizations?.removed_ingredients ?? [])].sort().join(',')
  const instr = (customizations?.special_instructions ?? '').trim()
  return `${menuItemId}::${variantId ?? ''}::${removed}::${instr}`
}

function normalizeCustomizations(c) {
  if (!c) return {}
  const out = {}
  if (Array.isArray(c.removed_ingredients) && c.removed_ingredients.length > 0) {
    out.removed_ingredients = [...c.removed_ingredients].sort()
  }
  const instr = (c.special_instructions ?? '').trim()
  if (instr) out.special_instructions = instr
  return out
}

export function useCart(gstRate = 5, gstInclusive = false) {
  const [items, setItems] = useState([])

  // add(menuItem) for the simple path (no variants/modifications), or
  // add(menuItem, { variantId, variantName, unitPrice, customizations, quantity })
  // for the configured path. Multiple calls with the same line key merge.
  const add = useCallback((menuItem, config = {}) => {
    const customizations = normalizeCustomizations(config.customizations)
    const variantId = config.variantId ?? null
    const variantName = config.variantName ?? null
    const unitPrice = Number(config.unitPrice ?? menuItem.price)
    const quantity = Math.max(1, Math.floor(config.quantity ?? 1))
    const lineKey = lineKeyFor(menuItem.id, variantId, customizations)

    setItems(prev => {
      const existing = prev.find(i => i.lineKey === lineKey)
      if (existing) {
        return prev.map(i =>
          i.lineKey === lineKey ? { ...i, quantity: i.quantity + quantity } : i
        )
      }
      return [
        ...prev,
        {
          lineKey,
          menuItemId: menuItem.id,
          name: menuItem.name,
          photoUrl: menuItem.photo_url ?? null,
          variantId,
          variantName,
          unitPrice,
          customizations,
          quantity,
        },
      ]
    })
  }, [])

  // remove decrements a line by key; the legacy menu UI calls cart.remove(item.id)
  // for items it added with no variant/customization — we treat that menuItemId as
  // matching the default (no variant, no modifications) line key for back-compat.
  const remove = useCallback((keyOrMenuItemId) => {
    setItems(prev => {
      const defaultKey = lineKeyFor(keyOrMenuItemId, null, {})
      const target =
        prev.find(i => i.lineKey === keyOrMenuItemId) ??
        prev.find(i => i.lineKey === defaultKey)
      if (!target) return prev
      if (target.quantity <= 1) return prev.filter(i => i.lineKey !== target.lineKey)
      return prev.map(i =>
        i.lineKey === target.lineKey ? { ...i, quantity: i.quantity - 1 } : i
      )
    })
  }, [])

  const removeLine = useCallback((lineKey) => {
    setItems(prev => prev.filter(i => i.lineKey !== lineKey))
  }, [])

  const updateLineNote = useCallback((lineKey, note) => {
    const cleanNote = String(note ?? '').slice(0, 140).trim()
    setItems(prev => {
      const target = prev.find(i => i.lineKey === lineKey)
      if (!target) return prev

      const nextCustomizations = normalizeCustomizations({
        ...target.customizations,
        special_instructions: cleanNote,
      })
      const nextLineKey = lineKeyFor(target.menuItemId, target.variantId, nextCustomizations)
      const existing = prev.find(i => i.lineKey === nextLineKey && i.lineKey !== lineKey)

      if (existing) {
        return prev
          .filter(i => i.lineKey !== lineKey)
          .map(i =>
            i.lineKey === nextLineKey
              ? { ...i, quantity: i.quantity + target.quantity }
              : i
          )
      }

      return prev.map(i =>
        i.lineKey === lineKey
          ? { ...i, lineKey: nextLineKey, customizations: nextCustomizations }
          : i
      )
    })
  }, [])

  const removeOneForMenuItem = useCallback((menuItemId) => {
    setItems(prev => {
      const target = prev.find(i => i.menuItemId === menuItemId)
      if (!target) return prev
      if (target.quantity <= 1) return prev.filter(i => i.lineKey !== target.lineKey)
      return prev.map(i =>
        i.lineKey === target.lineKey ? { ...i, quantity: i.quantity - 1 } : i
      )
    })
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [items]
  )
  const { gstAmount, grandTotal } = useMemo(
    () => calcGst(subtotal, gstRate, gstInclusive),
    [subtotal, gstRate, gstInclusive]
  )
  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  )

  // Total quantity of a menu item across every configuration, for the
  // "qty pill" on the menu card.
  const quantityFor = useCallback(
    (menuItemId) =>
      items
        .filter(i => i.menuItemId === menuItemId)
        .reduce((sum, i) => sum + i.quantity, 0),
    [items]
  )

  return {
    items,
    add,
    remove,
    removeLine,
    updateLineNote,
    removeOneForMenuItem,
    clear,
    subtotal,
    gstAmount,
    grandTotal,
    totalItems,
    quantityFor,
  }
}
