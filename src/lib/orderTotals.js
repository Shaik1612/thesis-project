export function payableAmount(order, gstInclusive = false) {
  const subtotal = Number(order?.total_amount ?? 0)
  const gst = Number(order?.gst_amount ?? 0)
  return gstInclusive ? subtotal : subtotal + gst
}

export function paidRevenueOrder(order) {
  return order?.payment_status === 'paid' && order?.status !== 'cancelled'
}

export function orderCode(orderOrId) {
  const id = typeof orderOrId === 'string' ? orderOrId : orderOrId?.id
  return id ? `#${id.slice(-6).toUpperCase()}` : '#------'
}
