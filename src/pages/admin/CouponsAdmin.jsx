import { useEffect, useState } from 'react'
import { Plus, TicketPercent, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  Alert, Button, DataTable, EmptyState, useToast,
} from '../../components/ui'
import {
  AdminPage, AdminCard, FormRow, TextField, Select, Toggle,
} from './_layout'

const BLANK = {
  code: '',
  discount_type: 'flat',
  discount_value: 50,
  min_order_amount: 0,
  max_discount: '',
  expires_at: '',
  active: true,
}

export default function CouponsAdmin() {
  const { push } = useToast()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
    setCoupons(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function create() {
    setError('')
    const code = draft.code.trim().toUpperCase()
    const value = Number(draft.discount_value)
    if (!code) return setError('Code is required.')
    if (!value || value <= 0) return setError('Discount value must be positive.')
    if (draft.discount_type === 'percent' && value > 100) return setError('Percent discount cannot exceed 100.')

    setSaving(true)
    const { error: err } = await supabase.from('coupons').insert({
      code,
      discount_type: draft.discount_type,
      discount_value: value,
      min_order_amount: Number(draft.min_order_amount) || 0,
      max_discount: draft.max_discount ? Number(draft.max_discount) : null,
      expires_at: draft.expires_at || null,
      active: draft.active,
    })
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    push({ type: 'success', title: 'Coupon created', message: code })
    setDraft(BLANK)
    load()
  }

  async function toggleActive(coupon) {
    await supabase.from('coupons').update({ active: !coupon.active }).eq('id', coupon.id)
    load()
  }

  async function remove(coupon) {
    if (!confirm(`Delete coupon "${coupon.code}"?`)) return
    await supabase.from('coupons').delete().eq('id', coupon.id)
    push({ type: 'success', title: 'Coupon deleted', message: coupon.code })
    load()
  }

  return (
    <AdminPage
      title="Coupons"
      subtitle="Discount codes applied at checkout across web, kiosk and desk."
    >
      <AdminCard title="Create coupon">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormRow label="Code" hint="Customers type this at checkout">
            <TextField
              value={draft.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
              placeholder="WELCOME10"
              maxLength={32}
            />
          </FormRow>
          <FormRow label="Type">
            <Select
              value={draft.discount_type}
              onChange={(e) => setDraft((d) => ({ ...d, discount_type: e.target.value }))}
            >
              <option value="flat">Flat ₹ off</option>
              <option value="percent">Percent off</option>
            </Select>
          </FormRow>
          <FormRow
            label={draft.discount_type === 'flat' ? 'Discount (₹)' : 'Discount (%)'}
          >
            <TextField
              type="number"
              min={0}
              step={draft.discount_type === 'flat' ? 1 : 0.5}
              value={draft.discount_value}
              onChange={(e) => setDraft((d) => ({ ...d, discount_value: e.target.value }))}
            />
          </FormRow>
          <FormRow label="Min order (₹)" hint="Order must be at least this much">
            <TextField
              type="number"
              min={0}
              step={1}
              value={draft.min_order_amount}
              onChange={(e) => setDraft((d) => ({ ...d, min_order_amount: e.target.value }))}
            />
          </FormRow>
          {draft.discount_type === 'percent' && (
            <FormRow label="Max discount (₹)" hint="Cap on percent discounts; blank = no cap">
              <TextField
                type="number"
                min={0}
                step={1}
                value={draft.max_discount}
                onChange={(e) => setDraft((d) => ({ ...d, max_discount: e.target.value }))}
                placeholder="No cap"
              />
            </FormRow>
          )}
          <FormRow label="Expires at" hint="Local date / time; blank = no expiry">
            <TextField
              type="datetime-local"
              value={draft.expires_at}
              onChange={(e) => setDraft((d) => ({ ...d, expires_at: e.target.value }))}
            />
          </FormRow>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Toggle
            label="Active on create"
            checked={draft.active}
            onChange={(v) => setDraft((d) => ({ ...d, active: v }))}
          />
          <Button
            variant="primary"
            busy={saving}
            onClick={create}
            iconLeft={<Plus className="h-4 w-4" />}
          >
            Add coupon
          </Button>
        </div>
        {error && <Alert tone="danger" className="mt-3">{error}</Alert>}
      </AdminCard>

      <AdminCard title="All coupons" padding="p-0">
        <DataTable
          loading={loading}
          ariaLabel="Coupons"
          rows={coupons}
          rowKey={(c) => c.id}
          columns={[
            {
              key: 'code',
              header: 'Code',
              cell: (v) => (
                <span className="inline-flex items-center gap-2 font-mono text-sm font-bold">
                  <TicketPercent className="h-4 w-4 text-emerald-600" />
                  {v}
                </span>
              ),
            },
            {
              key: 'discount_type',
              header: 'Discount',
              cell: (_v, row) =>
                row.discount_type === 'flat'
                  ? `₹${Number(row.discount_value).toLocaleString('en-IN')} off`
                  : `${row.discount_value}% off${row.max_discount ? ` (max ₹${row.max_discount})` : ''}`,
            },
            {
              key: 'min_order_amount',
              header: 'Min order',
              cell: (v) => (Number(v) > 0 ? `₹${Number(v).toLocaleString('en-IN')}` : '—'),
            },
            {
              key: 'expires_at',
              header: 'Expires',
              cell: (v) => (v ? new Date(v).toLocaleString('en-IN') : 'Never'),
            },
            {
              key: 'active',
              header: 'Status',
              cell: (_v, row) => {
                const live = row.active && (!row.expires_at || new Date(row.expires_at) > new Date())
                return (
                  <span
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      live
                        ? 'bg-status-ready/15 text-status-ready'
                        : 'bg-surface-100 text-ink-500',
                    ].join(' ')}
                  >
                    <span className={['h-1.5 w-1.5 rounded-full', live ? 'bg-status-ready' : 'bg-ink-400'].join(' ')} />
                    {live ? 'Active' : 'Inactive'}
                  </span>
                )
              },
            },
            {
              key: 'id',
              header: '',
              width: '160px',
              cell: (_v, row) => (
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={() => toggleActive(row)}>
                    {row.active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(row)} aria-label={`Delete ${row.code}`}>
                    <Trash2 className="h-4 w-4 text-status-cancelled" />
                  </Button>
                </div>
              ),
            },
          ]}
          empty={<EmptyState title="No coupons yet" message="Create one above to start offering discounts." />}
        />
      </AdminCard>
    </AdminPage>
  )
}
