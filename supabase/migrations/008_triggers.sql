-- ============================================================
-- Reusable updated_at trigger
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_menu_items
  before update on menu_items
  for each row execute function set_updated_at();

create trigger set_updated_at_ingredients
  before update on ingredients
  for each row execute function set_updated_at();

create trigger set_updated_at_orders
  before update on orders
  for each row execute function set_updated_at();

create trigger set_updated_at_loyalty_accounts
  before update on loyalty_accounts
  for each row execute function set_updated_at();

create trigger set_updated_at_restaurant_settings
  before update on restaurant_settings
  for each row execute function set_updated_at();

-- ============================================================
-- Ingredient deduction — fires atomically on order insert
-- ============================================================
create or replace function deduct_ingredients()
returns trigger language plpgsql as $$
declare
  v_item  record;
  v_ing   record;
begin
  -- iterate over every item in the new order
  for v_item in
    select oi.menu_item_id, oi.quantity
    from order_items oi
    where oi.order_id = new.id
  loop
    -- deduct each ingredient mapped to this menu item
    for v_ing in
      select mii.ingredient_id, mii.qty_used
      from menu_item_ingredients mii
      where mii.menu_item_id = v_item.menu_item_id
    loop
      update ingredients
      set stock_qty = stock_qty - (v_item.quantity * v_ing.qty_used)
      where id = v_ing.ingredient_id;

      -- auto-disable menu item if stock exhausted
      update menu_items mi
      set available = false
      from ingredients ing
      where ing.id = v_ing.ingredient_id
        and ing.stock_qty <= 0
        and ing.auto_disable = true
        and mi.id = v_item.menu_item_id;
    end loop;
  end loop;

  return new;
end;
$$;

-- Trigger runs AFTER order insert so order_items already exist
create trigger deduct_ingredients_on_order
  after insert on orders
  for each row
  when (new.status = 'pending')
  execute function deduct_ingredients();

-- ============================================================
-- Ingredient restock — fires on order cancel
-- ============================================================
create or replace function restock_ingredients()
returns trigger language plpgsql as $$
declare
  v_item  record;
  v_ing   record;
begin
  -- only react to status transitioning to 'cancelled'
  if old.status = new.status then
    return new;
  end if;
  if new.status <> 'cancelled' then
    return new;
  end if;

  for v_item in
    select oi.menu_item_id, oi.quantity
    from order_items oi
    where oi.order_id = new.id
  loop
    for v_ing in
      select mii.ingredient_id, mii.qty_used
      from menu_item_ingredients mii
      where mii.menu_item_id = v_item.menu_item_id
    loop
      update ingredients
      set stock_qty = stock_qty + (v_item.quantity * v_ing.qty_used)
      where id = v_ing.ingredient_id;

      -- re-enable item if auto_disable was triggered and stock is now positive
      update menu_items mi
      set available = true
      from ingredients ing
      where ing.id = v_ing.ingredient_id
        and ing.stock_qty > 0
        and ing.auto_disable = true
        and mi.id = v_item.menu_item_id
        and mi.available = false;
    end loop;
  end loop;

  return new;
end;
$$;

create trigger restock_ingredients_on_cancel
  after update on orders
  for each row execute function restock_ingredients();

-- ============================================================
-- Session close — fires when last unpaid order in a session is paid
-- ============================================================
create or replace function close_session_on_payment()
returns trigger language plpgsql as $$
declare
  v_unpaid_count integer;
begin
  if new.payment_status <> 'paid' or old.payment_status = 'paid' then
    return new;
  end if;

  -- only for orders linked to a session
  if new.session_id is null then
    return new;
  end if;

  select count(*) into v_unpaid_count
  from orders
  where session_id = new.session_id
    and payment_status = 'unpaid'
    and id <> new.id;

  if v_unpaid_count = 0 then
    update table_sessions
    set status = 'closed', closed_at = now()
    where id = new.session_id;

    -- flip the table back to free
    update tables t
    set status = 'free'
    from table_sessions ts
    where ts.id = new.session_id
      and t.id = ts.table_id;
  end if;

  return new;
end;
$$;

create trigger close_session_on_payment
  after update on orders
  for each row execute function close_session_on_payment();

-- ============================================================
-- Insert KOT print job when order is accepted
-- ============================================================
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
        'table_id',    new.table_id,
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

create trigger insert_kot_print_job
  after update on orders
  for each row execute function insert_kot_print_job();

-- ============================================================
-- Insert invoice print job when payment is confirmed
-- ============================================================
create or replace function insert_invoice_print_job()
returns trigger language plpgsql as $$
begin
  if new.payment_status = 'paid' and old.payment_status <> 'paid' then
    insert into print_jobs (type, order_id, payload)
    select
      'invoice',
      new.id,
      jsonb_build_object(
        'order_id',       new.id,
        'channel',        new.channel,
        'payment_method', new.payment_method,
        'total_amount',   new.total_amount,
        'discount_amount',new.discount_amount,
        'gst_rate',       new.gst_rate,
        'gst_amount',     new.gst_amount,
        'created_at',     new.created_at,
        'items',          (
          select jsonb_agg(jsonb_build_object(
            'name',       mi.name,
            'quantity',   oi.quantity,
            'unit_price', oi.unit_price,
            'subtotal',   oi.subtotal
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

create trigger insert_invoice_print_job
  after update on orders
  for each row execute function insert_invoice_print_job();

-- ============================================================
-- Auto-advance session status when first order arrives
-- ============================================================
create or replace function advance_session_status()
returns trigger language plpgsql as $$
begin
  -- seated → ordered when first order for this session is inserted
  if new.session_id is not null then
    update table_sessions
    set status = 'ordered'
    where id = new.session_id
      and status = 'seated';
  end if;
  return new;
end;
$$;

create trigger advance_session_on_order
  after insert on orders
  for each row execute function advance_session_status();
