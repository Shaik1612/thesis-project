-- ============================================================
-- Desk cash POS hardening
--
-- Desk orders are cash-only and are created through one transactional RPC
-- instead of a client-side sequence of orders -> order_items -> paid update.
-- ============================================================

create table if not exists payments (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  method          text not null check (method in ('cash')),
  amount          numeric(10,2) not null check (amount >= 0),
  tendered_amount numeric(10,2) not null check (tendered_amount >= 0),
  change_amount   numeric(10,2) not null check (change_amount >= 0),
  status          text not null default 'paid' check (status in ('paid','voided','refunded')),
  staff_id        uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create index if not exists payments_order_id_idx on payments(order_id);
create index if not exists payments_created_at_idx on payments(created_at desc);

create table if not exists desk_audit_events (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id),
  event_type  text not null,
  order_id    uuid references orders(id) on delete set null,
  session_id  uuid references table_sessions(id) on delete set null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists desk_audit_events_order_id_idx on desk_audit_events(order_id);
create index if not exists desk_audit_events_created_at_idx on desk_audit_events(created_at desc);

create unique index if not exists table_sessions_one_active_per_table_idx
  on table_sessions(table_id)
  where status <> 'closed';

alter table payments enable row level security;
alter table desk_audit_events enable row level security;

create policy "admin_all_payments"
  on payments for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "employee_read_payments"
  on payments for select
  using (auth_role() = 'employee');

create policy "admin_all_desk_audit_events"
  on desk_audit_events for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "employee_read_desk_audit_events"
  on desk_audit_events for select
  using (auth_role() = 'employee');

-- Table/session closure should be a deliberate floor action. Auto-closing a
-- dine-in table on payment is wrong for a POS: staff may collect cash before
-- food is completed or before guests leave.
create or replace function close_session_on_payment()
returns trigger language plpgsql as $$
begin
  return new;
end;
$$;

create or replace function create_desk_cash_order(
  p_order_type text,
  p_session_id uuid,
  p_items jsonb,
  p_tendered_amount numeric
)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := auth_role();
  v_staff_id uuid := auth.uid();
  v_settings record;
  v_session record;
  v_table_id uuid := null;
  v_order orders;
  v_line jsonb;
  v_menu record;
  v_variant record;
  v_variant_id uuid;
  v_variant_name text;
  v_qty integer;
  v_unit_price numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_gst_amount numeric(10,2) := 0;
  v_total_due numeric(10,2) := 0;
  v_tendered numeric(10,2) := coalesce(p_tendered_amount, 0);
begin
  if v_role not in ('admin', 'employee') then
    raise exception 'Only desk staff can create desk cash orders';
  end if;

  if p_order_type not in ('dine_in', 'takeaway') then
    raise exception 'Invalid order type';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Ticket must contain at least one item';
  end if;

  select * into v_settings from restaurant_settings limit 1;
  if not coalesce(v_settings.desk_enabled, true) then
    raise exception 'Desk ordering is disabled';
  end if;
  if not coalesce(v_settings.cash_enabled, true) then
    raise exception 'Cash payments are disabled';
  end if;

  if p_order_type = 'dine_in' then
    if p_session_id is null then
      raise exception 'Dine-in desk orders require an active table session';
    end if;

    select ts.id, ts.table_id, ts.status
    into v_session
    from table_sessions ts
    where ts.id = p_session_id
      and ts.status <> 'closed'
    for update;

    if v_session.id is null then
      raise exception 'Table session is not active';
    end if;
    v_table_id := v_session.table_id;
  elsif p_session_id is not null then
    raise exception 'Takeaway desk orders cannot be linked to a table session';
  end if;

  for v_line in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(1, floor(coalesce((v_line->>'quantity')::numeric, 1))::integer);

    select id, name, price, available
    into v_menu
    from menu_items
    where id = (v_line->>'menu_item_id')::uuid
    for update;

    if v_menu.id is null or v_menu.available = false then
      raise exception 'Menu item is unavailable';
    end if;

    if nullif(v_line->>'variant_id', '') is not null then
      select id, name, price, available
      into v_variant
      from menu_item_variants
      where id = (v_line->>'variant_id')::uuid
        and menu_item_id = v_menu.id
      for update;

      if v_variant.id is null or v_variant.available = false then
        raise exception 'Menu variant is unavailable';
      end if;
      v_unit_price := v_variant.price;
    else
      v_unit_price := v_menu.price;
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_qty);
  end loop;

  if coalesce(v_settings.gst_inclusive, false) then
    v_gst_amount := round(v_subtotal - (v_subtotal / (1 + (coalesce(v_settings.gst_rate, 0) / 100))), 2);
    v_total_due := v_subtotal;
  else
    v_gst_amount := round(v_subtotal * coalesce(v_settings.gst_rate, 0) / 100, 2);
    v_total_due := v_subtotal + v_gst_amount;
  end if;

  if v_tendered < v_total_due then
    raise exception 'Cash tendered is less than total due';
  end if;

  insert into orders (
    channel,
    order_type,
    table_id,
    session_id,
    status,
    payment_method,
    payment_status,
    total_amount,
    gst_rate,
    gst_amount
  )
  values (
    'desk',
    p_order_type,
    v_table_id,
    p_session_id,
    'pending',
    'cash',
    'unpaid',
    v_subtotal,
    coalesce(v_settings.gst_rate, 0),
    v_gst_amount
  )
  returning * into v_order;

  for v_line in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(1, floor(coalesce((v_line->>'quantity')::numeric, 1))::integer);

    select id, price
    into v_menu
    from menu_items
    where id = (v_line->>'menu_item_id')::uuid;

    if nullif(v_line->>'variant_id', '') is not null then
      select id, name, price
      into v_variant
      from menu_item_variants
      where id = (v_line->>'variant_id')::uuid;
      v_variant_id := v_variant.id;
      v_variant_name := v_variant.name;
      v_unit_price := v_variant.price;
    else
      v_variant_id := null;
      v_variant_name := null;
      v_unit_price := v_menu.price;
    end if;

    insert into order_items (
      order_id,
      menu_item_id,
      variant_id,
      variant_name,
      quantity,
      unit_price,
      subtotal,
      customizations
    )
    values (
      v_order.id,
      v_menu.id,
      v_variant_id,
      v_variant_name,
      v_qty,
      v_unit_price,
      v_unit_price * v_qty,
      coalesce(v_line->'customizations', '{}'::jsonb)
    );
  end loop;

  insert into payments (
    order_id,
    method,
    amount,
    tendered_amount,
    change_amount,
    status,
    staff_id
  )
  values (
    v_order.id,
    'cash',
    v_total_due,
    v_tendered,
    v_tendered - v_total_due,
    'paid',
    v_staff_id
  );

  update orders
  set payment_status = 'paid'
  where id = v_order.id
  returning * into v_order;

  insert into desk_audit_events(actor_id, event_type, order_id, session_id, payload)
  values (
    v_staff_id,
    'desk_cash_order_created',
    v_order.id,
    v_order.session_id,
    jsonb_build_object(
      'order_type', v_order.order_type,
      'subtotal', v_subtotal,
      'gst_amount', v_gst_amount,
      'total_due', v_total_due,
      'tendered_amount', v_tendered,
      'change_amount', v_tendered - v_total_due
    )
  );

  return v_order;
end;
$$;

revoke all on function create_desk_cash_order(text, uuid, jsonb, numeric) from public;
grant execute on function create_desk_cash_order(text, uuid, jsonb, numeric) to authenticated;

create or replace function settle_cash_order(
  p_order_id uuid,
  p_tendered_amount numeric
)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := auth_role();
  v_staff_id uuid := auth.uid();
  v_order orders;
  v_total_due numeric(10,2);
  v_tendered numeric(10,2) := coalesce(p_tendered_amount, 0);
begin
  if v_role not in ('admin', 'employee') then
    raise exception 'Only desk staff can settle cash orders';
  end if;

  select * into v_order
  from orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if v_order.payment_status = 'paid' then
    raise exception 'Order is already paid';
  end if;

  if v_order.payment_method is not null and v_order.payment_method <> 'cash' then
    raise exception 'Only cash orders can be settled at Desk';
  end if;

  v_total_due := coalesce(v_order.total_amount, 0) + coalesce(v_order.gst_amount, 0);
  if v_tendered < v_total_due then
    raise exception 'Cash tendered is less than total due';
  end if;

  insert into payments (
    order_id,
    method,
    amount,
    tendered_amount,
    change_amount,
    status,
    staff_id
  )
  values (
    v_order.id,
    'cash',
    v_total_due,
    v_tendered,
    v_tendered - v_total_due,
    'paid',
    v_staff_id
  );

  update orders
  set payment_method = 'cash',
      payment_status = 'paid'
  where id = v_order.id
  returning * into v_order;

  insert into desk_audit_events(actor_id, event_type, order_id, session_id, payload)
  values (
    v_staff_id,
    'cash_order_settled',
    v_order.id,
    v_order.session_id,
    jsonb_build_object(
      'total_due', v_total_due,
      'tendered_amount', v_tendered,
      'change_amount', v_tendered - v_total_due
    )
  );

  return v_order;
end;
$$;

revoke all on function settle_cash_order(uuid, numeric) from public;
grant execute on function settle_cash_order(uuid, numeric) to authenticated;
