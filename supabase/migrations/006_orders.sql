create table orders (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid references table_sessions(id),
  order_type         text not null check (order_type in ('dine_in','takeaway')),
  table_id           uuid references tables(id),
  channel            text not null check (channel in ('qr','kiosk','web','desk')),
  status             text not null default 'pending'
                       check (status in ('pending','accepted','preparing','ready','completed','cancelled')),
  payment_method     text check (payment_method in ('upi','cash')),
  payment_status     text not null default 'unpaid' check (payment_status in ('unpaid','paid')),
  razorpay_order_id  text unique,
  customer_phone     text,
  total_amount       numeric(10,2) not null check (total_amount >= 0),
  discount_amount    numeric(10,2) not null default 0 check (discount_amount >= 0),
  coupon_code        text,
  gst_rate           numeric(4,2) not null default 0,
  gst_amount         numeric(10,2) not null default 0 check (gst_amount >= 0),
  priority           integer not null default 0 check (priority in (0,1,2)),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index orders_status_idx on orders(status);
create index orders_payment_status_idx on orders(payment_status) where payment_status = 'unpaid';
create index orders_session_id_idx on orders(session_id);
create index orders_table_id_idx on orders(table_id);
create index orders_channel_idx on orders(channel);
create index orders_created_at_idx on orders(created_at desc);

create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  quantity     integer not null check (quantity > 0),
  unit_price   numeric(10,2) not null check (unit_price >= 0),
  subtotal     numeric(10,2) not null check (subtotal >= 0)
);

create index order_items_order_id_idx on order_items(order_id);
