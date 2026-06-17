-- ============================================================
-- pending_carts — server-side cart store for UPI checkout
--
-- create-razorpay-order writes one row per Razorpay order with
-- the full validated cart + GST totals. razorpay-webhook reads
-- it back on payment.captured to insert the real order. This
-- avoids stuffing JSON.stringify(items) into Razorpay's tiny
-- notes field, which silently truncates and breaks the flow.
-- ============================================================
create table pending_carts (
  razorpay_order_id text primary key,
  channel           text not null check (channel in ('qr','kiosk','web')),
  table_id          uuid references tables(id),
  session_id        uuid references table_sessions(id),
  order_type        text not null check (order_type in ('dine_in','takeaway')),
  customer_phone    text,
  items             jsonb not null,    -- [{ menu_item_id, quantity, unit_price, subtotal }, ...]
  subtotal          numeric(10,2) not null,
  gst_rate          numeric(4,2) not null,
  gst_amount        numeric(10,2) not null,
  total_amount      numeric(10,2) not null,
  consumed_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index pending_carts_created_at_idx
  on pending_carts(created_at)
  where consumed_at is null;

alter table pending_carts enable row level security;

-- Only the service role (Edge Functions) touches this table.
-- No anon, no admin, no employee policies — by omission, all
-- non-service-role access is blocked by RLS.
