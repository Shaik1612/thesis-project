create table tables (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  capacity    integer not null default 4 check (capacity > 0),
  position_x  numeric not null default 0,
  position_y  numeric not null default 0,
  shape       text not null default 'rect' check (shape in ('rect', 'round')),
  status      text not null default 'free' check (status in ('free', 'occupied', 'reserved')),
  merged_with uuid[],
  created_at  timestamptz not null default now()
);

create table table_sessions (
  id               uuid primary key default gen_random_uuid(),
  table_id         uuid not null references tables(id),
  opened_by        uuid references auth.users(id),
  opened_at        timestamptz not null default now(),
  covers           integer not null check (covers > 0),
  assigned_waiter  uuid references auth.users(id),
  status           text not null default 'seated'
                     check (status in ('seated','ordered','eating','bill_requested','paying','closed')),
  closed_at        timestamptz,
  total_collected  numeric(10,2)
);

create index table_sessions_table_id_idx on table_sessions(table_id);
create index table_sessions_status_idx on table_sessions(status) where status <> 'closed';

create table staff_requests (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references table_sessions(id) on delete cascade,
  table_id   uuid references tables(id) on delete cascade,
  type       text not null check (type in ('call_waiter','request_bill','done_eating')),
  status     text not null default 'pending' check (status in ('pending','acknowledged')),
  created_at timestamptz not null default now()
);

create index staff_requests_status_idx on staff_requests(status) where status = 'pending';
