import { useEffect, useState } from 'react'
import { Save, Check, Layers, Receipt, Phone, Volume2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Alert, Button, useToast } from '../../components/ui'
import {
  AdminPage, AdminCard, FormRow, TextField, Toggle, SectionHeader,
} from './_layout'

const CHANNEL_TOGGLES = [
  { key: 'kiosk_enabled',           label: 'Kiosk',         desc: 'Self-service kiosk for in-store orders' },
  { key: 'web_ordering_enabled',    label: 'Web ordering',  desc: '/order route for remote takeaway orders' },
  { key: 'desk_enabled',            label: 'Employee desk', desc: 'Desk POS route' },
]
const FLOW_TOGGLES = [
  { key: 'cash_enabled',            label: 'Cash (desk only)', desc: 'Cash payment option on the desk POS' },
  { key: 'loyalty_enabled',         label: 'Loyalty program',  desc: 'Show optional phone capture and points redemption' },
]

export default function SettingsAdmin() {
  const { push } = useToast()
  const [row, setRow] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.from('restaurant_settings').select('*').single().then(({ data }) => {
      if (data) setRow(data)
    })
  }, [])

  async function save() {
    if (!row) return
    setSaving(true)
    const { error } = await supabase.from('restaurant_settings').update(row).eq('id', row.id)
    setSaving(false)
    if (error) return push({ type: 'error', title: 'Save failed', message: error.message })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
    push({ type: 'success', title: 'Settings saved' })
  }

  const set = (key, value) => setRow((p) => ({ ...p, [key]: value }))

  if (!row) {
    return <AdminPage title="Settings"><p className="text-sm text-ink-600">Loading…</p></AdminPage>
  }

  return (
    <AdminPage
      title="Settings"
      subtitle="Channel toggles, GST, and payments."
      action={
        <Button variant="primary" busy={saving} onClick={save} iconLeft={saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}>
          {saved ? 'Saved' : 'Save changes'}
        </Button>
      }
    >
      <section className="space-y-4">
        <SectionHeader
          icon={Layers}
          title="Channels"
          subtitle="Enable or disable ordering surfaces."
        />
        <AdminCard padding="p-2">
          <ul className="divide-y divide-surface-line">
            {CHANNEL_TOGGLES.map((t) => (
              <li key={t.key} className="px-3 py-3">
                <Toggle
                  label={t.label}
                  hint={t.desc}
                  checked={!!row[t.key]}
                  onChange={(v) => set(t.key, v)}
                />
              </li>
            ))}
          </ul>
        </AdminCard>
      </section>

      <section className="space-y-4">
        <SectionHeader
          icon={Phone}
          title="Flow options"
          subtitle="Adjust how customers and staff interact with the system."
        />
        <AdminCard padding="p-2">
          <ul className="divide-y divide-surface-line">
            {FLOW_TOGGLES.map((t) => (
              <li key={t.key} className="px-3 py-3">
                <Toggle
                  label={t.label}
                  hint={t.desc}
                  checked={!!row[t.key]}
                  onChange={(v) => set(t.key, v)}
                />
              </li>
            ))}
          </ul>
        </AdminCard>
      </section>

      <section className="space-y-4">
        <SectionHeader
          icon={Receipt}
          title="GST"
          subtitle="Identifiers and tax rate applied to every invoice."
        />
        <AdminCard>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormRow label="GSTIN" hint="15-character GST Identification Number">
              <TextField
                value={row.gstin ?? ''}
                onChange={(e) => set('gstin', e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
            </FormRow>
            <FormRow label="GST rate (%)" hint="5 for most restaurants; 18 if AC + liquor licence">
              <TextField
                type="number"
                min={0}
                max={28}
                step={0.01}
                value={row.gst_rate ?? 5}
                onChange={(e) => set('gst_rate', parseFloat(e.target.value))}
              />
            </FormRow>
          </div>
          <div className="mt-4 rounded-lg border border-surface-line bg-surface-50 px-4 py-3">
            <Toggle
              label="Prices include GST"
              hint="Menu prices are tax-inclusive; system back-calculates for invoices."
              checked={!!row.gst_inclusive}
              onChange={(v) => set('gst_inclusive', v)}
            />
          </div>
        </AdminCard>
      </section>

      <section className="space-y-4">
        <SectionHeader
          icon={Volume2}
          title="Kitchen"
          subtitle="Sound and notification preferences on this device."
        />
        <Alert tone="info">
          Audible chime is configured per-device on the Kitchen Display itself (Volume icon in the
          header) and stored locally — it isn&apos;t saved here.
        </Alert>
      </section>
    </AdminPage>
  )
}
