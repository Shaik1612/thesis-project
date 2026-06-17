-- ============================================================
-- Cleanup: collapse to 3 channels (desk, web, kiosk), drop QR/waiter/tables.
--
-- This migration:
--   1. Drops all RLS policies / triggers / functions that reference the
--      table_sessions, tables, staff_requests, or service_style concepts.
--   2. Drops the legacy `qr` channel and the dine-in table linkage from
--      orders + pending_carts. Existing rows with channel='qr' are migrated
--      to channel='desk' so the check constraint stays clean.
--   3. Drops the `tables`, `table_sessions`, and `staff_requests` tables.
--   4. Drops the unused restaurant_settings flags: service_style,
--      qr_enabled, table_selection_enabled, loyalty_method.
--   5. Adds a `coupons` table + `validate_coupon()` RPC, and an
--      orders.loyalty_points_redeemed column for audit.
--   6. Reissues create_desk_cash_order + settle_cash_order so they accept
--      a customer phone, coupon code, and points-to-redeem, and award
--      loyalty points on settle (mirrors the Razorpay webhook).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Drop anon-QR policies (referenced in 012)
-- ------------------------------------------------------------
drop policy if exists "anon_insert_qr_waiter_orders"        on orders;
drop policy if exists "anon_insert_qr_waiter_order_items"   on order_items;
drop policy if exists "anon_read_own_qr_order"              on orders;
drop policy if exists "anon_read_own_qr_order_items"        on order_items;
drop policy if exists "anon_read_tables"                    on tables;
drop policy if exists "anon_read_active_table_sessions"     on table_sessions;
drop policy if exists "anon_insert_staff_requests"          on staff_requests;

-- Web + kiosk customers hit Supabase as anon and still need to read settings
-- (channel toggles, GST rate). Keep that policy.
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'restaurant_settings' and policyname = 'anon_read_restaurant_settings'
  ) then
    create policy "anon_read_restaurant_settings"
      on restaurant_settings for select
      to anon
      using (true);
  end if;
end $$;

-- Table / session / staff_requests policies (will fall when tables are
-- dropped, but be explicit for clarity).
drop policy if exists "admin_all_tables"                    on tables;
drop policy if exists "staff_read_tables"                   on tables;
drop policy if exists "staff_update_table_status"           on tables;
drop policy if exists "admin_all_table_sessions"            on table_sessions;
drop policy if exists "employee_manage_sessions"            on table_sessions;
drop policy if exists "kitchen_read_sessions"               on table_sessions;
drop policy if exists "admin_all_staff_requests"            on staff_requests;
drop policy if exists "employee_manage_staff_requests"      on staff_requests;
drop policy if exists "kitchen_read_staff_requests"         on staff_requests;

-- ------------------------------------------------------------
-- 2. Drop triggers + functions that reference sessions/tables
-- ------------------------------------------------------------
drop trigger if exists close_session_on_payment       on orders;
drop trigger if exists advance_session_on_order       on orders;
drop trigger if exists mark_table_occupied            on table_sessions;
drop trigger if exists free_table_on_session_close    on table_sessions;

drop function if exists close_session_on_payment()                  cascade;
drop function if exists advance_session_status()                    cascade;
drop function if exists mark_table_occupied_on_session_open()       cascade;
drop function if exists free_table_on_session_close()               cascade;
drop function if exists open_table_session(uuid, integer)           cascade;
drop function if exists advance_table_session(uuid, text)           cascade;
drop function if exists close_table_session(uuid)                   cascade;
drop function if exists create_desk_cash_order(text, uuid, jsonb, numeric) cascade;

-- ------------------------------------------------------------
-- 3. Migrate any legacy data + drop dependent columns
-- ------------------------------------------------------------
update orders         set channel = 'desk' where channel = 'qr';
update pending_carts  set channel = 'desk' where channel = 'qr';

-- Drop columns that FK into tables/table_sessions.
alter table orders            drop column if exists session_id;
alter table orders            drop column if exists table_id;
alter table pending_carts     drop column if exists session_id;
alter table pending_carts     drop column if exists table_id;
alter table desk_audit_events drop column if exists session_id;

-- pending_carts gains coupon support so create-razorpay-order can stash the
-- applied code/discount alongside loyalty redemption, and razorpay-webhook
-- can write them onto the final order row.
alter table pending_carts
  add column if not exists coupon_code     text,
  add column if not exists coupon_discount numeric(10,2) not null default 0
    check (coupon_discount >= 0);

-- Update channel check constraints to remove 'qr'.
alter table orders        drop constraint if exists orders_channel_check;
alter table orders        add  constraint orders_channel_check
                          check (channel in ('kiosk','web','desk'));

alter table pending_carts drop constraint if exists pending_carts_channel_check;
alter table pending_carts add  constraint pending_carts_channel_check
                          check (channel in ('kiosk','web','desk'));

-- ------------------------------------------------------------
-- 4. Drop the actual tables
-- ------------------------------------------------------------
drop table if exists staff_requests cascade;
drop table if exists table_sessions cascade;
drop table if exists tables         cascade;

-- ------------------------------------------------------------
-- 5. Strip unused settings columns
-- ------------------------------------------------------------
alter table restaurant_settings drop column if exists service_style;
alter table restaurant_settings drop column if exists qr_enabled;
alter table restaurant_settings drop column if exists table_selection_enabled;
alter table restaurant_settings drop column if exists loyalty_method;

-- ------------------------------------------------------------
-- 6. Coupons
-- ------------------------------------------------------------
create table if not exists coupons (
  id                uuid primary key default gen_random_uuid(),
  code              text unique not null,
  discount_type     text not null check (discount_type in ('flat','percent')),
  discount_value    numeric(10,2) not null check (discount_value > 0),
  min_order_amount  numeric(10,2) not null default 0 check (min_order_amount >= 0),
  max_discount      numeric(10,2) check (max_discount is null or max_discount > 0),
  active            boolean not null default true,
  expires_at        timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists coupons_active_idx on coupons(active) where active = true;

alter table coupons enable row level security;

create policy "admin_all_coupons"
  on coupons for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "anyone_read_active_coupons"
  on coupons for select
  using (active = true and (expires_at is null or expires_at > now()));

-- Server-side coupon validator. Returns the discount amount (>=0) or raises.
create or replace function validate_coupon(
  p_code         text,
  p_order_total  numeric
) returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_coupon  coupons;
  v_total   numeric(10,2) := coalesce(p_order_total, 0);
  v_disc    numeric(10,2);
begin
  if nullif(trim(coalesce(p_code, '')), '') is null then
    raise exception 'Coupon code is required';
  end if;

  select * into v_coupon
  from coupons
  where upper(code) = upper(trim(p_code))
  limit 1;

  if v_coupon.id is null then
    raise exception 'Coupon not found';
  end if;

  if not v_coupon.active then
    raise exception 'Coupon is inactive';
  end if;

  if v_coupon.expires_at is not null and v_coupon.expires_at <= now() then
    raise exception 'Coupon has expired';
  end if;

  if v_total < v_coupon.min_order_amount then
    raise exception 'Order must be at least %', v_coupon.min_order_amount;
  end if;

  if v_coupon.discount_type = 'flat' then
    v_disc := v_coupon.discount_value;
  else
    v_disc := round(v_total * v_coupon.discount_value / 100, 2);
    if v_coupon.max_discount is not null then
      v_disc := least(v_disc, v_coupon.max_discount);
    end if;
  end if;

  -- Never allow the discount to take the order below 1 rupee.
  if v_disc > v_total - 1 then
    v_disc := greatest(0, v_total - 1);
  end if;

  return round(v_disc, 2);
end;
$$;

revoke all on function validate_coupon(text, numeric) from public;
grant execute on function validate_coupon(text, numeric) to anon, authenticated;

-- ------------------------------------------------------------
-- 7. Loyalty points-redeemed audit column on orders
-- ------------------------------------------------------------
alter table orders
  add column if not exists loyalty_points_redeemed integer not null default 0
    check (loyalty_points_redeemed >= 0);

-- ------------------------------------------------------------
-- 8. Reissue desk cash RPCs with loyalty + coupon support
-- ------------------------------------------------------------
create or replace function create_desk_cash_order(
  p_order_type      text,
  p_items           jsonb,
  p_tendered_amount numeric,
  p_customer_phone  text default null,
  p_coupon_code     text default null,
  p_points_to_redeem integer default 0
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
  v_pre_discount_total numeric(10,2) := 0;
  v_coupon_discount numeric(10,2) := 0;
  v_points_discount numeric(10,2) := 0;
  v_points_redeemed integer := 0;
  v_total_due numeric(10,2) := 0;
  v_tendered numeric(10,2) := coalesce(p_tendered_amount, 0);
  v_phone text := nullif(regexp_replace(coalesce(p_customer_phone, ''), '\D', '', 'g'), '');
  v_points_available integer := 0;
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

  -- Reprice every line server-side from menu_items / variants.
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
    v_pre_discount_total := v_subtotal;
  else
    v_gst_amount := round(v_subtotal * coalesce(v_settings.gst_rate, 0) / 100, 2);
    v_pre_discount_total := v_subtotal + v_gst_amount;
  end if;

  if nullif(trim(coalesce(p_coupon_code, '')), '') is not null then
    v_coupon_discount := validate_coupon(p_coupon_code, v_pre_discount_total);
  end if;

  if p_points_to_redeem is not null and p_points_to_redeem > 0 then
    if v_phone is null then
      raise exception 'Customer phone is required to redeem points';
    end if;

    select coalesce(points, 0) into v_points_available
    from loyalty_accounts
    where phone = v_phone
    for update;

    v_points_redeemed := least(
      p_points_to_redeem,
      coalesce(v_points_available, 0),
      greatest(0, floor(v_pre_discount_total - v_coupon_discount)::integer - 1)
    );
    if v_points_redeemed < 0 then
      v_points_redeemed := 0;
    end if;
    v_points_discount := v_points_redeemed;
  end if;

  v_total_due := round(greatest(0, v_pre_discount_total - v_coupon_discount - v_points_discount), 2);

  if v_tendered < v_total_due then
    raise exception 'Cash tendered is less than total due';
  end if;

  insert into orders (
    channel,
    order_type,
    status,
    payment_method,
    payment_status,
    customer_phone,
    total_amount,
    gst_rate,
    gst_amount,
    discount_amount,
    coupon_code,
    loyalty_points_redeemed
  )
  values (
    'desk',
    p_order_type,
    'pending',
    'cash',
    'unpaid',
    v_phone,
    v_subtotal,
    coalesce(v_settings.gst_rate, 0),
    v_gst_amount,
    round(v_coupon_discount + v_points_discount, 2),
    nullif(trim(coalesce(p_coupon_code, '')), ''),
    v_points_redeemed
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

  -- Loyalty: deduct redeemed, award earned (1 pt per ₹10 of payable total).
  if v_phone is not null and coalesce(v_settings.loyalty_enabled, true) then
    perform award_loyalty_for_order(v_phone, v_total_due, v_points_redeemed);
  end if;

  insert into desk_audit_events(actor_id, event_type, order_id, payload)
  values (
    v_staff_id,
    'desk_cash_order_created',
    v_order.id,
    jsonb_build_object(
      'order_type',          v_order.order_type,
      'subtotal',            v_subtotal,
      'gst_amount',          v_gst_amount,
      'coupon_discount',     v_coupon_discount,
      'points_redeemed',     v_points_redeemed,
      'total_due',           v_total_due,
      'tendered_amount',     v_tendered,
      'change_amount',       v_tendered - v_total_due,
      'customer_phone',      v_phone
    )
  );

  return v_order;
end;
$$;

revoke all on function create_desk_cash_order(text, jsonb, numeric, text, text, integer) from public;
grant execute on function create_desk_cash_order(text, jsonb, numeric, text, text, integer) to authenticated;

-- Settle helper used by PendingPayments. Now also awards loyalty if a phone
-- was captured at order time.
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
  v_settings record;
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

  select * into v_settings from restaurant_settings limit 1;
  v_total_due := order_payable_amount(
    v_order.total_amount,
    v_order.gst_amount,
    coalesce(v_settings.gst_inclusive, false)
  );
  v_total_due := round(greatest(0, v_total_due - coalesce(v_order.discount_amount, 0)), 2);

  if v_tendered < v_total_due then
    raise exception 'Cash tendered is less than total due';
  end if;

  insert into payments (
    order_id, method, amount, tendered_amount, change_amount, status, staff_id
  )
  values (
    v_order.id, 'cash', v_total_due, v_tendered, v_tendered - v_total_due, 'paid', v_staff_id
  );

  update orders
  set payment_method = 'cash',
      payment_status = 'paid'
  where id = v_order.id
  returning * into v_order;

  if v_order.customer_phone is not null and coalesce(v_settings.loyalty_enabled, true) then
    perform award_loyalty_for_order(v_order.customer_phone, v_total_due, v_order.loyalty_points_redeemed);
  end if;

  insert into desk_audit_events(actor_id, event_type, order_id, payload)
  values (
    v_staff_id,
    'cash_order_settled',
    v_order.id,
    jsonb_build_object(
      'channel',         v_order.channel,
      'total_due',       v_total_due,
      'tendered_amount', v_tendered,
      'change_amount',   v_tendered - v_total_due
    )
  );

  return v_order;
end;
$$;

revoke all on function settle_cash_order(uuid, numeric) from public;
grant execute on function settle_cash_order(uuid, numeric) to authenticated;

-- Shared loyalty bookkeeping: deduct redeemed, award 1 pt per ₹10 spent.
create or replace function award_loyalty_for_order(
  p_phone text,
  p_amount_paid numeric,
  p_points_redeemed integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
  v_redeem integer := greatest(0, coalesce(p_points_redeemed, 0));
  v_earn integer := floor(coalesce(p_amount_paid, 0) / 10)::integer;
  v_account loyalty_accounts;
begin
  if v_phone is null then return; end if;

  select * into v_account
  from loyalty_accounts
  where phone = v_phone
  for update;

  if v_account.id is null then
    insert into loyalty_accounts(phone, points, visit_count, total_spend)
    values (v_phone, greatest(0, v_earn), 1, coalesce(p_amount_paid, 0));
  else
    update loyalty_accounts
    set points = greatest(0, coalesce(points, 0) - v_redeem) + v_earn,
        visit_count = coalesce(visit_count, 0) + 1,
        total_spend = coalesce(total_spend, 0) + coalesce(p_amount_paid, 0)
    where id = v_account.id;
  end if;
end;
$$;

revoke all on function award_loyalty_for_order(text, numeric, integer) from public;
grant execute on function award_loyalty_for_order(text, numeric, integer) to service_role, authenticated;

-- ------------------------------------------------------------
-- 10. Backfill table-level grants
--
-- The Supabase CLI auto-expose default flipped to OFF in May 2026, so freshly
-- created tables in `public` no longer carry implicit SELECT for the Data API
-- roles. Without these GRANTs, RLS policies are moot — Postgres refuses every
-- query with "permission denied for table". Grant broadly here and rely on
-- RLS to gate access per role.
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables    in schema public to authenticated, service_role;
grant usage,  select on            all sequences      in schema public to anon, authenticated, service_role;
grant execute on                   all functions      in schema public to anon, authenticated, service_role;

-- Anon gets SELECT only — RLS narrows to "available items" / "active coupons" / etc.
grant select on all tables in schema public to anon;

-- Keep the same defaults in place for future migrations.
alter default privileges in schema public
  grant select, insert, update, delete on tables    to authenticated, service_role;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 9. Patch insert_kot_print_job — drop the table_id reference
-- ------------------------------------------------------------
create or replace function insert_kot_print_job()
returns trigger language plpgsql as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    insert into print_jobs (type, order_id, payload)
    select
      'kot',
      new.id,
      jsonb_build_object(
        'order_id',    new.id,
        'channel',     new.channel,
        'order_type',  new.order_type,
        'priority',    new.priority,
        'created_at',  new.created_at,
        'items',       (
          select jsonb_agg(jsonb_build_object(
            'name',     mi.name,
            'quantity', oi.quantity
          ))
          from order_items oi
          join menu_items mi on mi.id = oi.menu_item_id
          where oi.order_id = new.id
        )
      );
  end if;
  return new;
end;
$$;
