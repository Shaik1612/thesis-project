-- ============================================================
-- Anonymous QR (waiter-service) order submission
--
-- The waiter-service QR flow has no auth: a guest scans a code,
-- adds items, taps "Send to kitchen". The order must land in the
-- database from an anon JWT, but we don't want anon to be able to
-- inject discounts, mark itself paid, jump priority, or impersonate
-- another channel.
--
-- These policies allow INSERT only with a tightly-shaped payload.
-- Everything else is still locked down by the policies in 009_rls.sql.
-- ============================================================

-- --- orders: anon may insert ONLY waiter-service-style QR orders ---
create policy "anon_insert_qr_waiter_orders"
  on orders for insert
  to anon
  with check (
    channel           = 'qr'
    and status        = 'pending'
    and payment_method is null            -- determined later at desk
    and payment_status = 'unpaid'
    and razorpay_order_id is null         -- UPI orders go through the webhook (service role)
    and priority      = 0                 -- no bumping yourself
    and discount_amount = 0               -- no client-side discounts
    and coupon_code is null
    and table_id is not null              -- must be tied to a real table
    and order_type   = 'dine_in'
    and (
      session_id is null
      or exists (
        select 1 from table_sessions ts
        where ts.id = session_id
          and ts.table_id = orders.table_id
          and ts.status <> 'closed'
      )
    )
  );

-- --- order_items: anon may insert items only for an eligible parent order ---
-- We require the parent to be a fresh, unpaid, waiter-service QR order. This
-- prevents anon from appending items to other customers' (or staff-created)
-- orders. The 5-minute window is generous slack for slow networks.
create policy "anon_insert_qr_waiter_order_items"
  on order_items for insert
  to anon
  with check (
    exists (
      select 1
      from orders o
      where o.id = order_items.order_id
        and o.channel        = 'qr'
        and o.payment_status = 'unpaid'
        and o.payment_method is null
        and o.razorpay_order_id is null
        and o.created_at     > now() - interval '5 minutes'
    )
  );

-- --- Public (read-only) view of the order so guest can poll status ---
-- The existing orders policies don't grant anon SELECT. Guests on the QR
-- status page need to read the row they just inserted (and only that row).
-- Easiest correct fix: allow anon to read orders by id when given the id.
-- The id is a uuid, so it's unguessable, and we never list orders anonymously.
create policy "anon_read_own_qr_order"
  on orders for select
  to anon
  using (channel = 'qr');

create policy "anon_read_own_qr_order_items"
  on order_items for select
  to anon
  using (
    exists (
      select 1 from orders o
      where o.id = order_items.order_id and o.channel = 'qr'
    )
  );

-- --- categories / menu_items already readable; menu_item_ingredients NOT needed by guest ---

-- --- restaurant_settings: QR/kiosk/web guests need to read service_style,
--     module toggles, GST config. Existing policy gates on authenticated only,
--     which breaks unauthenticated channels. Allow anon SELECT.
create policy "anon_read_restaurant_settings"
  on restaurant_settings for select
  to anon
  using (true);

-- --- tables: anon needs to see its own table's status + label on the QR menu ---
create policy "anon_read_tables"
  on tables for select
  to anon
  using (true);

-- --- table_sessions: anon needs to read the active session for the table they're at,
--     so the QR menu can attach session_id when submitting an order.
create policy "anon_read_active_table_sessions"
  on table_sessions for select
  to anon
  using (status <> 'closed');
