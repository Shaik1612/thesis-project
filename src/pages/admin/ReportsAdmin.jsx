import { useEffect, useState } from 'react'
import { Plus, Lock, Printer, History } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useSettings } from '../../lib/SettingsContext'
import { payableAmount } from '../../lib/orderTotals'
import { Button, MoneyText, StatusBadge, useToast } from '../../components/ui'
import { AdminPage, AdminCard, StatCard, FormRow, TextField, Select } from './_layout'

export default function ReportsAdmin() {
  const { user } = useAuth()
  const settings = useSettings()
  const { push } = useToast()
  const today = new Date().toISOString().split('T')[0]
  const [expenses, setExpenses] = useState([])
  const [orders, setOrders] = useState([])
  const [refunds, setRefunds] = useState([])
  const [voids, setVoids] = useState([])
  const [todayReport, setTodayReport] = useState(null)
  const [history, setHistory] = useState([])
  const [selectedReport, setSelectedReport] = useState(null) // null = today, otherwise a historical row
  const [closingCash, setClosingCash] = useState('')
  const [generating, setGenerating] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    category: 'ingredient',
    description: '',
    amount: '',
    date: today,
  })

  useEffect(() => {
    const since = new Date(today).toISOString()
    supabase.from('expenses').select('*').gte('date', today).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setExpenses(data) })
    supabase.from('orders').select('total_amount, gst_amount, discount_amount, payment_method, payment_status, status')
      .eq('payment_status', 'paid').neq('status', 'cancelled').gte('created_at', since)
      .then(({ data }) => { if (data) setOrders(data) })
    supabase.from('refunds').select('amount, status, created_at')
      .eq('status', 'processed').gte('created_at', since)
      .then(({ data }) => { if (data) setRefunds(data) })
    supabase.from('order_item_voids').select('amount_voided, quantity_voided, created_at')
      .gte('created_at', since)
      .then(({ data }) => { if (data) setVoids(data) })
    supabase.from('z_reports').select('*').eq('report_date', today).single()
      .then(({ data }) => { if (data) setTodayReport(data) })
    supabase.from('z_reports').select('*').order('report_date', { ascending: false }).limit(30)
      .then(({ data }) => { if (data) setHistory(data) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const gross = orders.reduce((s, o) => s + payableAmount(o, settings.gstInclusive), 0)
  const discounts = orders.reduce((s, o) => s + (o.discount_amount ?? 0), 0)
  const netRevenue = gross - discounts
  const totalGst = orders.reduce((s, o) => s + (o.gst_amount ?? 0), 0)
  const totalCash = orders.filter((o) => o.payment_method === 'cash').reduce((s, o) => s + payableAmount(o, settings.gstInclusive), 0)
  const totalUpi = orders.filter((o) => o.payment_method === 'upi').reduce((s, o) => s + payableAmount(o, settings.gstInclusive), 0)
  const totalRefunds = refunds.reduce((s, r) => s + (r.amount ?? 0), 0)
  const totalVoidsCount = voids.reduce((s, v) => s + (v.quantity_voided ?? 0), 0)
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const profit = netRevenue - totalExpenses

  async function addExpense() {
    const { data, error } = await supabase.from('expenses').insert({
      category: expenseForm.category,
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      date: expenseForm.date,
    }).select().single()
    if (error) return push({ type: 'error', title: 'Failed to add', message: error.message })
    setExpenses((prev) => [data, ...prev])
    setExpenseForm((p) => ({ ...p, description: '', amount: '' }))
  }

  async function generateZ() {
    if (!closingCash) return
    setGenerating(true)
    const { data, error } = await supabase.from('z_reports').insert({
      report_date: today,
      total_orders: orders.length,
      total_gross: gross,
      total_discounts: discounts,
      total_net: netRevenue,
      total_gst: totalGst,
      total_cash: totalCash,
      total_upi: totalUpi,
      total_refunds: totalRefunds,
      total_voids: totalVoidsCount,
      closing_cash_balance: parseFloat(closingCash),
      generated_by: user?.id,
      is_locked: true,
    }).select().single()
    setGenerating(false)
    if (error) return push({ type: 'error', title: 'Failed to generate', message: error.message })
    setTodayReport(data)
    setHistory((prev) => [data, ...prev.filter((r) => r.report_date !== data.report_date)])
    push({ type: 'success', title: 'Z report generated and locked' })
  }

  // What gets shown in the report card — today if we have one, or a row the
  // user picked from history.
  const shownReport = selectedReport ?? todayReport
  const showingHistorical = selectedReport != null && selectedReport.report_date !== today

  return (
    <AdminPage title={`Reports — ${today}`}>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Gross revenue" value={<MoneyText amount={gross} />} tone="brand" />
        <StatCard label="Net revenue"   value={<MoneyText amount={netRevenue} />} />
        <StatCard label="Expenses"      value={<MoneyText amount={totalExpenses} />} />
        <StatCard label="Est. profit"   value={<MoneyText amount={profit} />} tone={profit >= 0 ? 'good' : 'bad'} />
      </div>

      <AdminCard
        title="Expenses"
        action={
          <span className="text-xs text-ink-600 num">
            Total <MoneyText amount={totalExpenses} className="font-medium" />
          </span>
        }
      >
        <div className="grid grid-cols-12 gap-3">
          <FormRow label="Category" className="col-span-3">
            <Select value={expenseForm.category} onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))}>
              <option value="ingredient">Ingredient</option>
              <option value="staff">Staff</option>
              <option value="utility">Utility</option>
              <option value="refund">Refund</option>
              <option value="other">Other</option>
            </Select>
          </FormRow>
          <FormRow label="Description" className="col-span-6">
            <TextField value={expenseForm.description} onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))} />
          </FormRow>
          <FormRow label="Amount (₹)" className="col-span-2">
            <TextField
              type="number"
              min={0}
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
            />
          </FormRow>
          <div className="col-span-1 flex items-end">
            <Button variant="primary" fullWidth disabled={!expenseForm.amount || !expenseForm.description} onClick={addExpense}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {expenses.length > 0 && (
          <ul className="mt-4 divide-y divide-surface-line text-sm">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs font-medium capitalize text-ink-600">
                    {e.category}
                  </span>
                  <span className="ml-3 text-ink-900">{e.description}</span>
                </div>
                <MoneyText amount={e.amount} className="font-medium" />
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard
        title={showingHistorical ? `Z report — ${shownReport.report_date}` : 'Z report — end of day'}
        action={
          shownReport ? (
            <div className="inline-flex items-center gap-3">
              {showingHistorical && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>
                  Back to today
                </Button>
              )}
              <span className="inline-flex items-center gap-1.5 text-sm text-ink-600">
                <Lock className="h-4 w-4" />
                Locked
              </span>
            </div>
          ) : null
        }
      >
        {shownReport ? (
          <ZReportTable report={shownReport} />
        ) : (
          <div className="flex items-end gap-3">
            <FormRow label="Closing cash (physical count)" className="flex-1">
              <TextField
                type="number"
                min={0}
                placeholder="0"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
              />
            </FormRow>
            <Button variant="primary" disabled={!closingCash} busy={generating} onClick={generateZ}>
              <Lock className="h-4 w-4" />
              Generate &amp; lock day
            </Button>
          </div>
        )}
      </AdminCard>

      <AdminCard
        title="Recent Z-reports"
        action={
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
            <History className="h-3.5 w-3.5" />
            Last {history.length}
          </span>
        }
      >
        {history.length === 0 ? (
          <p className="text-sm text-ink-500">No locked reports yet. Generate today&rsquo;s to start the history.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2 text-right">Gross</th>
                <th className="py-2 text-right">Net</th>
                <th className="py-2 text-right">Cash</th>
                <th className="py-2 text-right">UPI</th>
                <th className="py-2 text-right">Refunds</th>
                <th className="py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-line">
              {history.map((r) => {
                const isActive = selectedReport?.id === r.id || (!selectedReport && r.report_date === today)
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedReport(r.report_date === today ? null : r)}
                    className={[
                      'cursor-pointer transition-colors',
                      isActive ? 'bg-brand-soft' : 'hover:bg-surface-50',
                    ].join(' ')}
                  >
                    <td className="py-2 text-ink-900 num">{r.report_date}</td>
                    <td className="py-2 text-right tabular-nums"><MoneyText amount={r.total_gross} /></td>
                    <td className="py-2 text-right tabular-nums"><MoneyText amount={r.total_net} /></td>
                    <td className="py-2 text-right tabular-nums"><MoneyText amount={r.total_cash} /></td>
                    <td className="py-2 text-right tabular-nums"><MoneyText amount={r.total_upi} /></td>
                    <td className="py-2 text-right tabular-nums"><MoneyText amount={r.total_refunds ?? 0} /></td>
                    <td className="py-2 text-right">
                      <StatusBadge status={r.is_locked ? 'ready' : 'pending'} label={r.is_locked ? 'Locked' : 'Open'} size="sm" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </AdminCard>
    </AdminPage>
  )
}

function ZReportTable({ report }) {
  // Split totals into CGST + SGST halves per GST Act invoice rules.
  const halfGst = (report.total_gst ?? 0) / 2
  return (
    <div className="font-mono">
      <div className="mb-3 text-sm text-status-ready">✓ Locked snapshot for {report.report_date}</div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-surface-line">
          <ZRow label="Total orders" value={<span className="num">{report.total_orders}</span>} />
          <ZRow label="Gross revenue" value={<MoneyText amount={report.total_gross} />} />
          <ZRow label="Discounts" value={<MoneyText amount={report.total_discounts} />} />
          <ZRow label="Net revenue" value={<MoneyText amount={report.total_net} className="font-bold" />} />
          <ZRow label="CGST (half)" value={<MoneyText amount={halfGst} />} />
          <ZRow label="SGST (half)" value={<MoneyText amount={halfGst} />} />
          <ZRow label="GST total" value={<MoneyText amount={report.total_gst} />} />
          <ZRow label="Cash collected" value={<MoneyText amount={report.total_cash} />} />
          <ZRow label="UPI collected" value={<MoneyText amount={report.total_upi} />} />
          <ZRow label="Refunds processed" value={<MoneyText amount={report.total_refunds ?? 0} />} />
          <ZRow label="Items voided" value={<span className="num">{report.total_voids ?? 0}</span>} />
          <ZRow label="Closing cash balance" value={<MoneyText amount={report.closing_cash_balance} className="font-bold" />} />
        </tbody>
      </table>
      <div className="mt-4 flex justify-end">
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  )
}

function ZRow({ label, value }) {
  return (
    <tr>
      <td className="py-2 text-ink-600">{label}</td>
      <td className="py-2 text-right text-ink-900 num">{value}</td>
    </tr>
  )
}
