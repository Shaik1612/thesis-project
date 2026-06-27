# Desk Channel Audit

Audit date: 2026-06-16

Scope: `src/pages/desk/*`, shared order/menu/cart hooks used by Desk, and the Supabase desk cash POS migration.

## Executive Summary

The Desk channel has a solid transactional base for cash order creation: `create_desk_cash_order` validates staff role, active table sessions, item availability, tendered cash, creates the order/items/payment, and writes an audit event in one RPC.

Remediation update: the high-risk accounting, GST-inclusive total, cash cancellation, audit visibility, cash drawer, order detail, receipt reprint, table capacity, and lifecycle issues from this audit have been addressed in the source and in `supabase/migrations/018_desk_channel_audit_fixes.sql`.

The main risks are not transactionality. They are workflow and accounting mismatches:

- Desk cash orders are paid immediately but remain kitchen-active until staff completes them, while admin revenue reports only count `status = completed`.
- GST-inclusive totals are displayed inconsistently in Desk floor/order views and cash settlement.
- Desk can settle any unpaid cash order visible to staff, including non-desk unpaid cash orders, but the UI copy frames the page as Desk-only.
- The audit table exists, but there is no Desk/Admin screen to inspect cash audit events or payments.

## Findings

### High: paid desk revenue is excluded until order completion

Evidence:

- Desk cash order creation inserts orders as `status = 'pending'`, `payment_status = 'unpaid'`, then records payment and marks them paid without changing kitchen status: `supabase/migrations/017_desk_cash_pos.sql:186-279`.
- Admin reports query only completed orders: `src/pages/admin/ReportsAdmin.jsx:32-34`.
- Dashboard revenue also filters to completed orders: `src/pages/admin/Dashboard.jsx:30-39`.
- Desk orders can sit in `pending`, `accepted`, `preparing`, or `ready` after cash is already collected: `src/pages/desk/NewSale.jsx:18`.

Impact:

Cash can be in the drawer and in the `payments` table while Z-report revenue and dashboard revenue show zero or undercounted sales until kitchen completion. If staff forgets to complete a ready desk order, daily revenue stays wrong.

Recommendation:

Decide the accounting source of truth:

- For cash/UPI financial reports, count `payment_status = 'paid'` or read from `payments`, not only `status = 'completed'`.
- Keep kitchen fulfillment status separate from payment/revenue status.
- Add explicit "fulfilled" or "closed" reporting if operational completion still matters.

### High: GST-inclusive totals are double-counted in multiple desk views

Evidence:

- The RPC stores `total_amount = v_subtotal` and for GST-inclusive settings sets `v_total_due = v_subtotal`, `gst_amount = included GST`: `supabase/migrations/017_desk_cash_pos.sql:174-180` and `supabase/migrations/017_desk_cash_pos.sql:186-209`.
- Desk floor bill adds `total_amount + gst_amount`: `src/pages/desk/FloorPanel.jsx:206-210` and `src/pages/desk/FloorPanel.jsx:243`.
- Desk order list adds `total_amount + gst_amount`: `src/pages/desk/OrdersPanel.jsx:73-75`.
- Pending cash settlement adds `total_amount + gst_amount` and sends that amount to `settle_cash_order`, which also computes due as `total_amount + gst_amount`: `supabase/migrations/017_desk_cash_pos.sql:341-343`.

Impact:

When `gst_inclusive = true`, floor bills, order tables, and cash settlement can overstate the payable amount by adding included GST again. Example: a menu item priced at 100 with 5% inclusive GST should charge 100, but Desk list/settlement paths can show or require about 104.76.

Recommendation:

Create one helper/DB expression for payable total:

- If GST inclusive: payable = `total_amount`.
- If GST exclusive: payable = `total_amount + gst_amount`.

Use it consistently in Desk, Admin, status pages, reports, and `settle_cash_order`.

### Medium: pending cash page can settle non-desk orders without making that scope clear

Evidence:

- `PendingPayments` loads all unpaid cash orders by method/status only, no channel filter: `src/pages/desk/PendingPayments.jsx:11`.
- `settle_cash_order` accepts any unpaid order where `payment_method` is null or cash: `supabase/migrations/017_desk_cash_pos.sql:333-339`.
- The page copy says "Desk accepts cash only" and "Pending cash", not "all channels": `src/pages/desk/PendingPayments.jsx:42-48`.

Impact:

This may be intentional if Desk is the cashier for QR/kiosk/web cash orders. If so, it is a feature with unclear UX. If not, Desk staff can settle orders outside the Desk channel.

Recommendation:

Pick one of these behaviors:

- Cashier mode: rename/copy the page to "All pending cash", show channel/order type/table, and keep backend broad.
- Desk-only mode: add `channel: 'desk'` filtering and enforce `v_order.channel = 'desk'` in `settle_cash_order`.

### Medium: cancelling a paid cash order does not void/refund the payment

Evidence:

- Desk order actions allow cancel for non-ready orders regardless of payment status: `src/pages/desk/OrdersPanel.jsx:110-113`.
- The update only changes `orders.status`: `src/pages/desk/OrdersPanel.jsx:31-35`.
- Payments stay `paid`; there is no desk cancel RPC, void record, refund record, or audit event tied to the cancellation path.

Impact:

A paid cash order can become `cancelled` while its payment remains paid and the cash audit trail does not explain whether money was returned, retained, or voided.

Recommendation:

Replace direct status updates for paid desk orders with RPCs:

- `cancel_paid_cash_order(order_id, reason, refund_amount?)`
- Write `desk_audit_events`.
- Update/insert payment/refund/void records consistently.
- Require a reason in the UI.

### Medium: table lifecycle cannot move backward to `seated` after first order

Evidence:

- `LIFECYCLE` includes `seated`, but `advance_session_status` updates to `ordered` after first order: `supabase/migrations/008_triggers.sql:260-267`.
- The modal uses `Tabs` with `value={picked.session.status}`: `src/pages/desk/FloorPanel.jsx:185-190`.
- Staff can manually set any lifecycle value exposed in the tabs: `src/pages/desk/FloorPanel.jsx:110-117`.

Impact:

The UI says lifecycle moves left to right, but the controls allow arbitrary jumps backward and forward. This weakens table state as an operational signal.

Recommendation:

Make lifecycle controls explicit:

- Only show the next valid transition, or confirm backward transitions.
- Audit status changes.
- Consider hiding `seated` after an order exists.

### Medium: capacity input is not enforced server-side

Evidence:

- UI sets an input max from table capacity: `src/pages/desk/FloorPanel.jsx:151-157`.
- `openSession` inserts whatever parsed positive value is in the input: `src/pages/desk/FloorPanel.jsx:61-70`.
- `table_sessions.covers` only checks `covers > 0`: `supabase/migrations/005_tables.sql:13-24`.

Impact:

Browser/UI bypass or accidental input can create sessions beyond table capacity.

Recommendation:

Validate before insert in the UI and add a DB trigger or RPC for opening table sessions that checks `covers <= tables.capacity`.

### Low: keyboard listener is reattached on every render

Evidence:

- `NewSale` defines the shortcut `useEffect` without a dependency array: `src/pages/desk/NewSale.jsx:62-78`.

Impact:

React cleans up the previous listener, so this is not a functional leak. It is still unnecessary churn during cart edits and menu search.

Recommendation:

Add a dependency array with the values used by the handler, or use a stable callback/ref pattern.

### Low: Desk active ticket display may be misleading

Evidence:

- New Sale shows only active desk orders: `src/pages/desk/NewSale.jsx:18` and `src/pages/desk/NewSale.jsx:246`.
- Dine-in cash orders are immediately paid but still appear as active tickets until kitchen completion.

Impact:

Staff may interpret "active desk tickets" as unpaid/needs cashier action, when it actually means not kitchen-completed.

Recommendation:

Rename to "Kitchen-active desk tickets" or include payment status and table label.

## Feature Gaps

- No UI for `desk_audit_events` despite creating and writing the table.
- No cash drawer/reconciliation screen based on `payments`.
- No reason capture for cancellation, cash voids, refunds, or manual status changes.
- No receipt/invoice reprint flow from Desk, despite invoice print jobs being created on payment.
- No order detail drawer in Desk orders; staff cannot inspect line customizations before updating status.
- No split payment, partial payment, or bill-level settlement for table sessions.
- No cashier shift/open-close model, so cash accountability is per order but not per drawer/session.
- No search/filter by table/order id/payment status in Desk Orders or Pending Cash.
- No direct way to create a table session from New Sale when no active table exists; staff must switch to Floor.
- No offline/degraded-mode handling for Desk cash taking if Supabase is unreachable.

## Suggested Fix Order

1. Fix payable-total calculation in a shared helper and in `settle_cash_order`.
2. Change financial reports to count paid orders/payments, not completed fulfillment.
3. Clarify Pending Cash scope and enforce it in both UI and RPC.
4. Add paid-order cancel/void/refund RPCs with reason capture and audit events.
5. Expose Desk audit/payment reconciliation views.
6. Tighten table session creation and lifecycle transitions.

## Verification Notes

No runtime changes were made during this audit. The repo has no lint/test script in `package.json`; only `dev`, `build`, and `preview` are available.
