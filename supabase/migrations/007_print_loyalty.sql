create table print_jobs (
  id         uuid primary key default gen_random_uuid(),
  type       text not null check (type in ('kot','invoice')),
  order_id   uuid references orders(id) on delete cascade,
  payload    jsonb not null,
  status     text not null default 'pending' check (status in ('pending','printed','failed')),
  created_at timestamptz not null default now()
);

create index print_jobs_status_idx on print_jobs(status) where status = 'pending';

create table loyalty_accounts (
  id           uuid primary key default gen_random_uuid(),
  phone        text unique not null,
  points       integer not null default 0 check (points >= 0),
  visit_count  integer not null default 0 check (visit_count >= 0),
  total_spend  numeric(10,2) not null default 0 check (total_spend >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table expenses (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (category in ('ingredient','staff','utility','refund','other')),
  description text,
  amount      numeric(10,2) not null check (amount > 0),
  date        date not null,
  created_at  timestamptz not null default now()
);

create index expenses_date_idx on expenses(date desc);

create table order_item_voids (
  id              uuid primary key default gen_random_uuid(),
  order_item_id   uuid not null references order_items(id),
  order_id        uuid not null references orders(id),
  voided_by       uuid references auth.users(id),
  reason          text,
  quantity_voided integer not null check (quantity_voided > 0),
  amount_voided   numeric(10,2) not null check (amount_voided >= 0),
  created_at      timestamptz not null default now()
);

create index order_item_voids_order_id_idx on order_item_voids(order_id);

create table refunds (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references orders(id),
  razorpay_refund_id text,
  amount             numeric(10,2) not null check (amount > 0),
  reason             text,
  status             text not null default 'pending' check (status in ('pending','processed','failed')),
  initiated_by       uuid references auth.users(id),
  created_at         timestamptz not null default now()
);

create index refunds_order_id_idx on refunds(order_id);

create table z_reports (
  id                   uuid primary key default gen_random_uuid(),
  report_date          date not null unique,
  opened_at            timestamptz,
  closed_at            timestamptz,
  total_orders         integer not null default 0,
  total_gross          numeric(10,2) not null default 0,
  total_discounts      numeric(10,2) not null default 0,
  total_net            numeric(10,2) not null default 0,
  total_gst            numeric(10,2) not null default 0,
  total_cash           numeric(10,2) not null default 0,
  total_upi            numeric(10,2) not null default 0,
  total_refunds        numeric(10,2) not null default 0,
  total_voids          integer not null default 0,
  closing_cash_balance numeric(10,2) not null default 0,
  generated_by         uuid references auth.users(id),
  is_locked            boolean not null default true
);
