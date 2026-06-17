export function timeAgo(ts) {
  if (!ts) return '—'
  const mins = Math.floor((Date.now() - new Date(ts)) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h ago`
}

export function formatRupees(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

// Channel-rail hues. Source of truth lives in index.css `.channel-chip` rules;
// this mirror is for places that need the raw hex (stripes on cards, dots on
// dark surfaces). Update both when adding a channel.
export const CHANNEL_HUE = {
  kiosk: '#0EA5E9',
  web:   '#8B5CF6',
  desk:  '#F59E0B',
}

// Translate Supabase / Postgres errors into copy a cashier can act on.
// Anything we don't recognize falls back to a generic message; the raw text
// is kept under `details` so support can still see it. Always returns
// { message, details } so toast call sites stay uniform.
export function humanizeError(error, fallback = 'Try again or call a manager.') {
  const raw = error?.message ?? String(error ?? '')
  const code = error?.code ?? ''
  const lower = raw.toLowerCase()

  // RLS / auth — staff not signed in or wrong role.
  if (code === 'PGRST301' || lower.includes('row-level security') || lower.includes('rls')) {
    return { message: 'You don\'t have permission for this action. Sign in again or ask a manager.', details: raw }
  }
  // Network / offline.
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network request failed')) {
    return { message: 'Lost connection. Check the wifi and try again.', details: raw }
  }
  // Unique constraint — duplicate work.
  if (code === '23505' || lower.includes('duplicate key') || lower.includes('unique constraint')) {
    return { message: 'This ticket was already settled. Refresh the page to see the latest.', details: raw }
  }
  // Check constraint — tendered too low, etc.
  if (code === '23514' || lower.includes('check constraint')) {
    return { message: 'The amount entered isn\'t valid. Re-enter and try again.', details: raw }
  }
  // FK violation — order or related row is gone.
  if (code === '23503' || lower.includes('foreign key')) {
    return { message: 'This ticket no longer exists. Refresh the page.', details: raw }
  }
  // Server-raised app errors carry their own readable message; surface as-is.
  if (code === 'P0001' && raw) {
    return { message: raw, details: '' }
  }
  return { message: fallback, details: raw }
}
