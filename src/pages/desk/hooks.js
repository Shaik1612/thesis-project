import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * Today's cash drawer summary for the operator strip.
 * Returns { net, paid, tendered, change, count }.
 */
export function useDeskDrawerToday() {
  const [state, setState] = useState({ net: 0, paid: 0, tendered: 0, change: 0, count: 0 })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const since = new Date()
      since.setHours(0, 0, 0, 0)

      const { data } = await supabase
        .from('payments')
        .select('amount, tendered_amount, change_amount, method, status')
        .eq('method', 'cash')
        .eq('status', 'paid')
        .gte('created_at', since.toISOString())

      if (cancelled || !data) return
      const paid     = data.reduce((s, p) => s + Number(p.amount          ?? 0), 0)
      const tendered = data.reduce((s, p) => s + Number(p.tendered_amount ?? 0), 0)
      const change   = data.reduce((s, p) => s + Number(p.change_amount   ?? 0), 0)
      setState({
        net: tendered - change,
        paid, tendered, change,
        count: data.length,
      })
    }

    load()
    const channel = supabase
      .channel(`desk_drawer_summary:${Math.random().toString(36).slice(2,9)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, load)
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  return state
}
