-- Simple phone-based points and counter dine-in cleanup.

alter table pending_carts
  add column if not exists loyalty_points_redeemed integer not null default 0 check (loyalty_points_redeemed >= 0),
  add column if not exists loyalty_discount_amount numeric(10,2) not null default 0 check (loyalty_discount_amount >= 0);

create or replace function get_loyalty_points(p_phone text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select points
    from loyalty_accounts
    where phone = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
    limit 1
  ), 0);
$$;

revoke all on function get_loyalty_points(text) from public;
grant execute on function get_loyalty_points(text) to anon, authenticated;

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
  v_session_id uuid := null;
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

  if p_session_id is not null then
    if p_order_type <> 'dine_in' then
      raise exception 'Takeaway desk orders cannot be linked to a table session';
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

    v_session_id := v_session.id;
    v_table_id := v_session.table_id;
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
    v_session_id,
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
