import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useOrders(filters = {}) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let query = supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name, photo_url))')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }
    if (filters.paymentStatus) query = query.eq('payment_status', filters.paymentStatus)
    if (filters.paymentMethod) query = query.eq('payment_method', filters.paymentMethod)
    if (filters.channel) query = query.eq('channel', filters.channel)

    query.then(({ data }) => {
      if (data) setOrders(data)
      setLoading(false)
    })

    // Channel names must be unique per subscriber — DeskPage calls useOrders
    // twice (cash + UPI panes) and Supabase refuses to re-attach listeners
    // to an already-subscribed channel.
    const channel = supabase
      .channel(`orders_realtime:${Math.random().toString(36).slice(2, 10)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        query.then(({ data }) => { if (data) setOrders(data) })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  return { orders, loading }
}
