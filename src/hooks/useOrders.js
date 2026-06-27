import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useOrders(filters = {}) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef(null)

  useEffect(() => {
    const { refreshInterval = 15_000, ...queryFilters } = filters

    let query = supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name, photo_url)), refunds(*)')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })

    if (queryFilters.status) {
      if (Array.isArray(queryFilters.status)) {
        query = query.in('status', queryFilters.status)
      } else {
        query = query.eq('status', queryFilters.status)
      }
    }
    if (queryFilters.paymentStatus) query = query.eq('payment_status', queryFilters.paymentStatus)
    if (queryFilters.paymentMethod) query = query.eq('payment_method', queryFilters.paymentMethod)
    if (queryFilters.channel) query = query.eq('channel', queryFilters.channel)

    const doFetch = () => query.then(({ data }) => { if (data) setOrders(data) })
    fetchRef.current = doFetch

    doFetch().then(() => setLoading(false))

    // Channel names must be unique per subscriber — DeskPage calls useOrders
    // twice (cash + UPI panes) and Supabase refuses to re-attach listeners
    // to an already-subscribed channel.
    const channel = supabase
      .channel(`orders_realtime:${Math.random().toString(36).slice(2, 10)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, doFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, doFetch)
      .subscribe()

    const intervalId = refreshInterval > 0 ? setInterval(doFetch, refreshInterval) : null
    const onFocus = () => doFetch()
    const onOnline = () => doFetch()
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)

    return () => {
      fetchRef.current = null
      if (intervalId) clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onOnline)
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  const refetch = useCallback(() => { fetchRef.current?.() }, [])

  return { orders, loading, refetch }
}
