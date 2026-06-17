import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, X, Info, Layers, Carrot, ImageIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button, FoodImage, MoneyText, SideDrawer, StatusBadge, Tabs, useToast } from '../../components/ui'
import { AdminPage, AdminTable, FormRow, TextField, TextArea, Select, Toggle } from './_layout'

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  photo_url: '',
  sort_order: 0,
  available: true,
}

const TABS = [
  { value: 'basics',      label: 'Basics',      icon: <Info className="h-3.5 w-3.5" /> },
  { value: 'variants',    label: 'Variants',    icon: <Layers className="h-3.5 w-3.5" /> },
  { value: 'ingredients', label: 'Ingredients', icon: <Carrot className="h-3.5 w-3.5" /> },
  { value: 'photo',       label: 'Photo',       icon: <ImageIcon className="h-3.5 w-3.5" /> },
]

export default function MenuAdmin() {
  const { push } = useToast()
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [selectedCat, setSelectedCat] = useState(null)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [variants, setVariants] = useState([])
  const [ingredientMappings, setIngredientMappings] = useState([])
  const [activeTab, setActiveTab] = useState('basics')
  const [saving, setSaving] = useState(false)

  // Snapshot of state when the drawer opened. Used to detect dirty edits so
  // Esc / backdrop / X confirms before discarding.
  const initialSnapshot = useRef(null)

  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => {
      if (data) {
        setCategories(data)
        if (data.length) setSelectedCat(data[0].id)
      }
    })
    supabase.from('menu_items').select('*').order('sort_order').then(({ data }) => {
      if (data) setItems(data)
    })
    supabase.from('ingredients').select('id, name, unit').order('name').then(({ data }) => {
      if (data) setIngredients(data)
    })
  }, [])

  const visibleItems = selectedCat ? items.filter((i) => i.category_id === selectedCat) : items

  function openNew() {
    const blank = { ...EMPTY_FORM, category_id: selectedCat ?? '' }
    setForm(blank)
    setVariants([])
    setIngredientMappings([])
    setActiveTab('basics')
    initialSnapshot.current = snapshot(blank, [], [])
    setEdit('new')
  }

  async function openEdit(item) {
    const populated = { ...EMPTY_FORM, ...item }
    setForm(populated)
    setActiveTab('basics')
    setEdit(item.id)
    const [{ data: vRows }, { data: mRows }] = await Promise.all([
      supabase
        .from('menu_item_variants')
        .select('id, name, price, sort_order, available')
        .eq('menu_item_id', item.id)
        .order('sort_order'),
      supabase
        .from('menu_item_ingredients')
        .select('ingredient_id, qty_used, customer_removable')
        .eq('menu_item_id', item.id),
    ])
    const v = vRows ?? []
    const m = mRows ?? []
    setVariants(v)
    setIngredientMappings(m)
    initialSnapshot.current = snapshot(populated, v, m)
  }

  function closeDrawer() {
    setEdit(null)
    initialSnapshot.current = null
  }

  const dirty = useMemo(() => {
    if (!edit || !initialSnapshot.current) return false
    return initialSnapshot.current !== snapshot(form, variants, ingredientMappings)
  }, [edit, form, variants, ingredientMappings])

  async function save() {
    setSaving(true)
    const variantsAuthoritative = variants.length > 0
    const payload = {
      name: form.name,
      description: form.description,
      // When variants exist they own the price. Keep menu_items.price valid
      // (NOT NULL constraint) by storing 0 — the UI ignores it for these items.
      price: variantsAuthoritative ? 0 : parseFloat(form.price || 0),
      category_id: form.category_id || null,
      photo_url: form.photo_url?.trim() || null,
      sort_order: Number.isFinite(parseInt(form.sort_order, 10)) ? parseInt(form.sort_order, 10) : 0,
      available: form.available,
    }
    try {
      let itemId = edit
      if (edit === 'new') {
        const { data, error } = await supabase.from('menu_items').insert(payload).select().single()
        if (error) throw error
        itemId = data.id
        setItems((prev) => [...prev, data])
      } else {
        const { error } = await supabase.from('menu_items').update(payload).eq('id', edit)
        if (error) throw error
        setItems((prev) => prev.map((i) => (i.id === edit ? { ...i, ...payload } : i)))
      }

      await syncVariants(itemId, variants)
      await syncIngredientMappings(itemId, ingredientMappings)

      push({ type: 'success', title: edit === 'new' ? 'Item added' : 'Item updated', message: payload.name })
      closeDrawer()
    } catch (e) {
      push({ type: 'error', title: 'Save failed', message: e.message })
    } finally {
      setSaving(false)
    }
  }

  async function toggleAvail(item) {
    const next = !item.available
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, available: next } : i)))
    await supabase.from('menu_items').update({ available: next }).eq('id', item.id)
  }

  async function del(id) {
    if (!confirm('Delete this item?')) return
    await supabase.from('menu_items').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    push({ type: 'success', title: 'Item deleted' })
  }

  const variantsAuthoritative = variants.length > 0

  const tabItems = TABS.map((t) => {
    if (t.value === 'variants') return { ...t, count: variants.length || undefined }
    if (t.value === 'ingredients') return { ...t, count: ingredientMappings.length || undefined }
    return t
  })

  return (
    <AdminPage
      title="Menu"
      action={
        <Button variant="primary" onClick={openNew}>
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedCat(null)}
          className={[
            'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            !selectedCat ? 'bg-brand-500 text-white' : 'bg-surface-100 text-ink-600 hover:bg-surface-line',
          ].join(' ')}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCat(c.id)}
            className={[
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              selectedCat === c.id ? 'bg-brand-500 text-white' : 'bg-surface-100 text-ink-600 hover:bg-surface-line',
            ].join(' ')}
          >
            {c.name}
          </button>
        ))}
      </div>

      <AdminTable
        empty="No items in this category. Add your first one."
        columns={[
          {
            label: 'Item',
            render: (i) => (
              <div>
                <div className="font-medium text-ink-900">{i.name}</div>
                {i.description && <div className="text-xs text-ink-600 line-clamp-1">{i.description}</div>}
              </div>
            ),
          },
          { label: 'Category', render: (i) => categories.find((c) => c.id === i.category_id)?.name ?? '—' },
          { label: 'Price', align: 'right', render: (i) => <MoneyText amount={i.price} className="font-medium" /> },
          {
            label: 'Status',
            render: (i) => <StatusBadge status={i.available ? 'ready' : 'cancelled'} label={i.available ? 'Available' : 'Unavailable'} />,
          },
          {
            label: '',
            align: 'right',
            render: (i) => (
              <div className="inline-flex gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => openEdit(i)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button variant="secondary" size="sm" onClick={() => toggleAvail(i)}>
                  {i.available ? 'Disable' : 'Enable'}
                </Button>
                <Button variant="danger" size="sm" onClick={() => del(i.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ),
          },
        ]}
        rows={visibleItems}
      />

      <SideDrawer
        open={!!edit}
        onClose={closeDrawer}
        dirty={dirty}
        width="xl"
        title={edit === 'new' ? 'Add menu item' : 'Edit menu item'}
        subtitle={form.name ? form.name : 'Fill in the details, then save.'}
        footer={
          <>
            <Button variant="ghost" onClick={closeDrawer}>Cancel</Button>
            <Button
              variant="primary"
              busy={saving}
              disabled={!form.name || (!variantsAuthoritative && !form.price)}
              onClick={save}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Tabs
            variant="underline"
            value={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            ariaLabel="Menu item sections"
          />

          {activeTab === 'basics' && (
            <div className="space-y-3">
              <FormRow label="Name *">
                <TextField
                  value={form.name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </FormRow>
              <FormRow label="Description">
                <TextArea
                  rows={2}
                  value={form.description ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </FormRow>
              <div className="grid grid-cols-2 gap-3">
                <FormRow
                  label={variantsAuthoritative ? 'Base price (unused)' : 'Price (₹) *'}
                  hint={variantsAuthoritative ? 'Variants set the price.' : undefined}
                >
                  <TextField
                    type="number"
                    min={0}
                    step={0.5}
                    disabled={variantsAuthoritative}
                    value={variantsAuthoritative ? '' : (form.price ?? '')}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </FormRow>
                <FormRow label="Category">
                  <Select
                    value={form.category_id ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                  >
                    <option value="">None</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </FormRow>
              </div>
              <FormRow label="Sort order" hint="Lower numbers show first inside the category.">
                <TextField
                  type="number"
                  min={0}
                  step={1}
                  value={form.sort_order ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                />
              </FormRow>
              <div className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2">
                <span className="text-sm font-medium text-ink-900">Available to order</span>
                <Toggle checked={!!form.available} onChange={(v) => setForm((f) => ({ ...f, available: v }))} />
              </div>
            </div>
          )}

          {activeTab === 'variants' && (
            <VariantEditor variants={variants} setVariants={setVariants} />
          )}

          {activeTab === 'ingredients' && (
            <IngredientMappingEditor
              ingredients={ingredients}
              mappings={ingredientMappings}
              setMappings={setIngredientMappings}
            />
          )}

          {activeTab === 'photo' && (
            <div className="space-y-3">
              <FormRow
                label="Photo URL"
                hint="Paste a URL to a hosted image. Leave blank for the branded fallback."
              >
                <TextField
                  type="url"
                  placeholder="https://…"
                  value={form.photo_url ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
                />
              </FormRow>
              <div className="rounded-2xl border border-surface-line p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Preview</p>
                <div className="max-w-sm">
                  <FoodImage
                    src={form.photo_url?.trim() || null}
                    name={form.name || 'Menu item'}
                    aspect="4/3"
                    rounded="xl"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </SideDrawer>
    </AdminPage>
  )
}

function snapshot(form, variants, mappings) {
  return JSON.stringify({
    form: {
      name: form.name ?? '',
      description: form.description ?? '',
      price: form.price ?? '',
      category_id: form.category_id ?? '',
      photo_url: form.photo_url ?? '',
      sort_order: String(form.sort_order ?? ''),
      available: !!form.available,
    },
    variants: variants.map((v) => ({
      id: v.id ?? null,
      name: v.name ?? '',
      price: String(v.price ?? ''),
      available: !!v.available,
    })),
    mappings: mappings.map((m) => ({
      ingredient_id: m.ingredient_id,
      qty_used: String(m.qty_used ?? ''),
      customer_removable: !!m.customer_removable,
    })),
  })
}

function VariantEditor({ variants, setVariants }) {
  function add() {
    setVariants((prev) => [
      ...prev,
      { id: null, _tempId: crypto.randomUUID(), name: '', price: '', sort_order: prev.length, available: true },
    ])
  }
  function update(idx, patch) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)))
  }
  function remove(idx) {
    setVariants((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <section className="rounded-lg border border-surface-line p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-ink-900">Variants</div>
          <div className="text-xs text-ink-600">
            Add size or style options. When set, variants override the base price.
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Add variant
        </Button>
      </div>
      {variants.length === 0 ? (
        <p className="rounded bg-surface-50 px-3 py-2 text-xs text-ink-500">
          No variants. Customers will see a single price.
        </p>
      ) : (
        <ul className="space-y-2">
          {variants.map((v, idx) => (
            <li key={v.id ?? v._tempId} className="flex items-center gap-2">
              <input
                value={v.name}
                onChange={(e) => update(idx, { name: e.target.value })}
                placeholder="Small"
                className="h-9 flex-1 rounded-lg bg-surface-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <input
                type="number"
                min={0}
                step={0.5}
                value={v.price}
                onChange={(e) => update(idx, { price: e.target.value })}
                placeholder="Price"
                className="h-9 w-28 rounded-lg bg-surface-100 px-3 text-sm num focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <label className="inline-flex items-center gap-1.5 text-xs text-ink-600">
                <Toggle
                  checked={!!v.available}
                  onChange={(val) => update(idx, { available: val })}
                />
                Available
              </label>
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label="Remove"
                className="flex h-8 w-8 items-center justify-center rounded text-ink-600 hover:bg-surface-100"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function IngredientMappingEditor({ ingredients, mappings, setMappings }) {
  const used = new Set(mappings.map((m) => m.ingredient_id))
  const available = ingredients.filter((i) => !used.has(i.id))

  function add(ingredientId) {
    if (!ingredientId) return
    setMappings((prev) => [
      ...prev,
      { ingredient_id: ingredientId, qty_used: '1', customer_removable: false },
    ])
  }
  function update(id, patch) {
    setMappings((prev) =>
      prev.map((m) => (m.ingredient_id === id ? { ...m, ...patch } : m))
    )
  }
  function remove(id) {
    setMappings((prev) => prev.filter((m) => m.ingredient_id !== id))
  }

  return (
    <section className="rounded-lg border border-surface-line p-3">
      <div className="mb-2">
        <div className="text-sm font-semibold text-ink-900">Ingredients</div>
        <div className="text-xs text-ink-600">
          Map ingredients for stock deduction. Mark ones the customer can remove
          ("no onion") to expose them in the order sheet.
        </div>
      </div>
      {mappings.length > 0 && (
        <ul className="mb-2 space-y-2">
          {mappings.map((m) => {
            const ing = ingredients.find((i) => i.id === m.ingredient_id)
            if (!ing) return null
            return (
              <li key={m.ingredient_id} className="flex items-center gap-2">
                <span className="flex-1 text-sm text-ink-900">{ing.name}</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={m.qty_used}
                  onChange={(e) => update(m.ingredient_id, { qty_used: e.target.value })}
                  className="h-9 w-20 rounded-lg bg-surface-100 px-3 text-sm num focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-xs text-ink-500">{ing.unit}</span>
                <label className="inline-flex items-center gap-1.5 text-xs text-ink-600">
                  <Toggle
                    checked={!!m.customer_removable}
                    onChange={(val) => update(m.ingredient_id, { customer_removable: val })}
                  />
                  Customer can remove
                </label>
                <button
                  type="button"
                  onClick={() => remove(m.ingredient_id)}
                  aria-label="Remove"
                  className="flex h-8 w-8 items-center justify-center rounded text-ink-600 hover:bg-surface-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <Select value="" onChange={(e) => add(e.target.value)}>
        <option value="">Add ingredient…</option>
        {available.map((i) => (
          <option key={i.id} value={i.id}>{i.name}</option>
        ))}
      </Select>
    </section>
  )
}

async function syncVariants(menuItemId, variants) {
  const { data: existing } = await supabase
    .from('menu_item_variants')
    .select('id')
    .eq('menu_item_id', menuItemId)
  const existingIds = new Set((existing ?? []).map((v) => v.id))
  const keepIds = new Set(variants.filter((v) => v.id).map((v) => v.id))

  const toDelete = [...existingIds].filter((id) => !keepIds.has(id))
  if (toDelete.length > 0) {
    const { error } = await supabase.from('menu_item_variants').delete().in('id', toDelete)
    if (error) throw error
  }

  const toInsert = variants
    .filter((v) => !v.id && v.name.trim() && v.price !== '')
    .map((v, idx) => ({
      menu_item_id: menuItemId,
      name: v.name.trim(),
      price: Number(v.price),
      sort_order: idx,
      available: !!v.available,
    }))
  if (toInsert.length > 0) {
    const { error } = await supabase.from('menu_item_variants').insert(toInsert)
    if (error) throw error
  }

  const toUpdate = variants.filter((v) => v.id)
  for (let idx = 0; idx < toUpdate.length; idx++) {
    const v = toUpdate[idx]
    const { error } = await supabase
      .from('menu_item_variants')
      .update({
        name: v.name.trim(),
        price: Number(v.price),
        sort_order: idx,
        available: !!v.available,
      })
      .eq('id', v.id)
    if (error) throw error
  }
}

async function syncIngredientMappings(menuItemId, mappings) {
  // (menu_item_id, ingredient_id) is the PK, so a full replace is the simplest
  // and safest path. Two-step delete-then-insert avoids leftover rows for
  // ingredients the admin removed in this edit.
  const { error: delErr } = await supabase
    .from('menu_item_ingredients')
    .delete()
    .eq('menu_item_id', menuItemId)
  if (delErr) throw delErr

  const rows = mappings
    .filter((m) => m.ingredient_id && Number(m.qty_used) > 0)
    .map((m) => ({
      menu_item_id: menuItemId,
      ingredient_id: m.ingredient_id,
      qty_used: Number(m.qty_used),
      customer_removable: !!m.customer_removable,
    }))
  if (rows.length > 0) {
    const { error } = await supabase.from('menu_item_ingredients').insert(rows)
    if (error) throw error
  }
}
