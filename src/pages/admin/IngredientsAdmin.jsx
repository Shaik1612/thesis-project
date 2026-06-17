import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button, Modal, useToast } from '../../components/ui'
import { AdminPage, AdminTable, FormRow, TextField, Toggle } from './_layout'

export default function IngredientsAdmin() {
  const { push } = useToast()
  const [ingredients, setIngredients] = useState([])
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('ingredients').select('*').order('name').then(({ data }) => {
      if (data) setIngredients(data)
    })
  }, [])

  function openNew() {
    setForm({ name: '', unit: 'g', stock_qty: 0, low_stock_threshold: 0, auto_disable: false })
    setEdit('new')
  }

  function openEdit(ing) {
    setForm({ ...ing })
    setEdit(ing.id)
  }

  async function save() {
    setSaving(true)
    const payload = {
      name: form.name,
      unit: form.unit,
      stock_qty: parseFloat(form.stock_qty) || 0,
      low_stock_threshold: parseFloat(form.low_stock_threshold) || 0,
      auto_disable: !!form.auto_disable,
    }
    try {
      if (edit === 'new') {
        const { data, error } = await supabase.from('ingredients').insert(payload).select().single()
        if (error) throw error
        setIngredients((prev) => [...prev, data])
      } else {
        const { error } = await supabase.from('ingredients').update(payload).eq('id', edit)
        if (error) throw error
        setIngredients((prev) => prev.map((i) => (i.id === edit ? { ...i, ...payload } : i)))
      }
      push({ type: 'success', title: 'Saved' })
      setEdit(null)
    } catch (e) {
      push({ type: 'error', title: 'Save failed', message: e.message })
    } finally {
      setSaving(false)
    }
  }

  async function del(id) {
    if (!confirm('Delete this ingredient?')) return
    await supabase.from('ingredients').delete().eq('id', id)
    setIngredients((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <AdminPage
      title="Inventory"
      action={
        <Button variant="primary" onClick={openNew}>
          <Plus className="h-4 w-4" />
          Add ingredient
        </Button>
      }
    >
      <AdminTable
        empty="No ingredients yet."
        columns={[
          { label: 'Name', render: (i) => <span className="font-medium text-ink-900">{i.name}</span> },
          { label: 'Unit', key: 'unit' },
          {
            label: 'Stock',
            align: 'right',
            render: (i) => {
              const low = i.stock_qty <= i.low_stock_threshold
              return (
                <span className={['inline-flex items-center justify-end gap-1.5 font-medium num', low ? 'text-status-cancelled' : 'text-ink-900'].join(' ')}>
                  {low && <AlertTriangle className="h-3.5 w-3.5" />}
                  {i.stock_qty} {i.unit}
                </span>
              )
            },
          },
          { label: 'Low threshold', align: 'right', render: (i) => `${i.low_stock_threshold} ${i.unit}` },
          { label: 'Auto-disable', render: (i) => (i.auto_disable ? 'Yes' : '—') },
          {
            label: '',
            align: 'right',
            render: (i) => (
              <div className="inline-flex gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => openEdit(i)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => del(i.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ),
          },
        ]}
        rows={ingredients}
      />

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit === 'new' ? 'Add ingredient' : 'Edit ingredient'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
            <Button variant="primary" busy={saving} disabled={!form.name} onClick={save}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormRow label="Name *">
            <TextField value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormRow>
          <div className="grid grid-cols-2 gap-3">
            <FormRow label="Unit" hint="g, ml, pieces, kg…">
              <TextField value={form.unit ?? ''} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
            </FormRow>
            <FormRow label="Stock on hand">
              <TextField
                type="number"
                min={0}
                value={form.stock_qty ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, stock_qty: e.target.value }))}
              />
            </FormRow>
          </div>
          <FormRow label="Low-stock threshold">
            <TextField
              type="number"
              min={0}
              value={form.low_stock_threshold ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, low_stock_threshold: e.target.value }))}
            />
          </FormRow>
          <div className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2">
            <div>
              <div className="text-sm font-medium text-ink-900">Auto-disable items at zero</div>
              <div className="text-xs text-ink-600">Disable any menu item that uses this ingredient when stock hits 0.</div>
            </div>
            <Toggle checked={!!form.auto_disable} onChange={(v) => setForm((f) => ({ ...f, auto_disable: v }))} />
          </div>
        </div>
      </Modal>
    </AdminPage>
  )
}
