-- ============================================================
-- Variants, customer-side ingredient removal, and recommendation
-- co-occurrence view.
--
-- Adds three customer-facing capabilities:
--   1. menu_item_variants — size/style options with their own price
--      (e.g. Cola Small / Medium / Large). When a menu item has any
--      variants, the variant price is authoritative; the base
--      menu_items.price is ignored by the UI.
--   2. menu_item_ingredients.customer_removable — admin opts in
--      individual ingredient mappings as customer-removable
--      ("no onion", "no cheese"). Structural ingredients (flour,
--      dough) are not exposed.
--   3. order_items.variant_id / variant_name / customizations — per
--      line variant snapshot plus a JSONB customizations payload
--      ({removed_ingredients, special_instructions}).
--
-- Triggers updated:
--   * deduct_ingredients / restock_ingredients skip ingredients the
--     customer asked to remove.
--   * KOT and invoice print payloads include variant name, removed
--     ingredient names, and special instructions so the kitchen and
--     the receipt show what was actually ordered.
--
-- Adds an item_pairs materialized view for "you may also like"
-- co-occurrence recommendations.
-- ============================================================

-- ------------------------------------------------------------
-- 1. menu_item_variants
-- ------------------------------------------------------------
create table menu_item_variants (
  id           uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references menu_items(id) on delete cascade,
  name         text not null,
  price        numeric(10,2) not null check (price >= 0),
  sort_order   integer not null default 0,
  available    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index menu_item_variants_menu_item_id_idx on menu_item_variants(menu_item_id);
create index menu_item_variants_available_idx
  on menu_item_variants(menu_item_id) where available = true;

create trigger set_updated_at_menu_item_variants
  before update on menu_item_variants
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- 2. menu_item_ingredients.customer_removable
-- ------------------------------------------------------------
alter table menu_item_ingredients
  add column customer_removable boolean not null default false;

-- ------------------------------------------------------------
-- 3. order_items: variant + customizations
-- ------------------------------------------------------------
alter table order_items
  add column variant_id     uuid references menu_item_variants(id),
  add column variant_name   text,
  add column customizations jsonb not null default '{}'::jsonb;

create index order_items_variant_id_idx
  on order_items(variant_id) where variant_id is not null;

-- ------------------------------------------------------------
-- 4. Replace deduct_ingredients to honour removed_ingredients
-- ------------------------------------------------------------
create or replace function deduct_ingredients()
returns trigger language plpgsql as $$
declare
  v_item record;
  v_ing  record;
begin
  for v_item in
    select oi.menu_item_id, oi.quantity, oi.customizations
    from order_items oi
    where oi.order_id = new.id
  loop
    for v_ing in
      select mii.ingredient_id, mii.qty_used
      from menu_item_ingredients mii
      where mii.menu_item_id = v_item.menu_item_id
        and not (
          coalesce(v_item.customizations->'removed_ingredients', '[]'::jsonb)
          ? mii.ingredient_id::text
        )
    loop
      update ingredients
      set stock_qty = stock_qty - (v_item.quantity * v_ing.qty_used)
      where id = v_ing.ingredient_id;

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

-- ------------------------------------------------------------
-- 5. Replace restock_ingredients to mirror the removal skip
-- ------------------------------------------------------------
create or replace function restock_ingredients()
returns trigger language plpgsql as $$
declare
  v_item record;
  v_ing  record;
begin
  if old.status = new.status then
    return new;
  end if;
  if new.status <> 'cancelled' then
    return new;
  end if;

  for v_item in
    select oi.menu_item_id, oi.quantity, oi.customizations
    from order_items oi
    where oi.order_id = new.id
  loop
    for v_ing in
      select mii.ingredient_id, mii.qty_used
      from menu_item_ingredients mii
      where mii.menu_item_id = v_item.menu_item_id
        and not (
          coalesce(v_item.customizations->'removed_ingredients', '[]'::jsonb)
          ? mii.ingredient_id::text
        )
    loop
      update ingredients
      set stock_qty = stock_qty + (v_item.quantity * v_ing.qty_used)
      where id = v_ing.ingredient_id;

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

-- ------------------------------------------------------------
-- 6. Replace KOT print payload to include variant + modifications
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
        'order_id',   new.id,
        'channel',    new.channel,
        'table_id',   new.table_id,
        'order_type', new.order_type,
        'priority',   new.priority,
        'created_at', new.created_at,
        'items', (
          select jsonb_agg(jsonb_build_object(
            'name',                 mi.name,
            'variant_name',         oi.variant_name,
            'quantity',             oi.quantity,
            'removed_ingredients',  (
              select coalesce(jsonb_agg(ing.name order by ing.name), '[]'::jsonb)
              from ingredients ing
              where ing.id::text in (
                select jsonb_array_elements_text(
                  coalesce(oi.customizations->'removed_ingredients', '[]'::jsonb)
                )
              )
            ),
            'special_instructions', oi.customizations->>'special_instructions'
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

-- ------------------------------------------------------------
-- 7. Replace invoice print payload to include variant + modifications
-- ------------------------------------------------------------
create or replace function insert_invoice_print_job()
returns trigger language plpgsql as $$
begin
  if new.payment_status = 'paid' and old.payment_status <> 'paid' then
    insert into print_jobs (type, order_id, payload)
    select
      'invoice',
      new.id,
      jsonb_build_object(
        'order_id',        new.id,
        'channel',         new.channel,
        'payment_method',  new.payment_method,
        'total_amount',    new.total_amount,
        'discount_amount', new.discount_amount,
        'gst_rate',        new.gst_rate,
        'gst_amount',      new.gst_amount,
        'created_at',      new.created_at,
        'items', (
          select jsonb_agg(jsonb_build_object(
            'name',                 mi.name,
            'variant_name',         oi.variant_name,
            'quantity',             oi.quantity,
            'unit_price',           oi.unit_price,
            'subtotal',             oi.subtotal,
            'removed_ingredients',  (
              select coalesce(jsonb_agg(ing.name order by ing.name), '[]'::jsonb)
              from ingredients ing
              where ing.id::text in (
                select jsonb_array_elements_text(
                  coalesce(oi.customizations->'removed_ingredients', '[]'::jsonb)
                )
              )
            ),
            'special_instructions', oi.customizations->>'special_instructions'
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

-- ------------------------------------------------------------
-- 8. RLS for menu_item_variants
-- ------------------------------------------------------------
alter table menu_item_variants enable row level security;

create policy "admin_all_menu_item_variants"
  on menu_item_variants for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "public_read_available_menu_item_variants"
  on menu_item_variants for select
  using (available = true);

create policy "admin_read_all_menu_item_variants"
  on menu_item_variants for select
  using (auth_role() = 'admin');

-- ------------------------------------------------------------
-- 9. Expose ingredient names + mapping to unauthenticated channels
-- so the QR / web / kiosk customer flows can render the removable
-- ingredient checkboxes. Stock levels are not sensitive for this
-- restaurant context; if that changes, swap in a view that exposes
-- only id + name.
-- ------------------------------------------------------------
create policy "public_read_menu_item_ingredients"
  on menu_item_ingredients for select
  using (true);

create policy "public_read_ingredients"
  on ingredients for select
  using (true);

-- ------------------------------------------------------------
-- 10. item_pairs — co-occurrence for "you may also like"
-- ------------------------------------------------------------
create materialized view item_pairs as
select
  a.menu_item_id as item_a,
  b.menu_item_id as item_b,
  count(*)::int  as co_count
from order_items a
join order_items b
  on a.order_id      = b.order_id
 and a.menu_item_id <> b.menu_item_id
join orders o on o.id = a.order_id
where o.status = 'completed'
group by a.menu_item_id, b.menu_item_id;

create index item_pairs_a_idx on item_pairs(item_a, co_count desc);
create unique index item_pairs_pair_idx on item_pairs(item_a, item_b);

-- Materialized views don't honour RLS; grant SELECT explicitly. Pair
-- counts are anonymous aggregate data and safe to expose.
grant select on item_pairs to anon, authenticated;

-- Helper to refresh the view (called by a scheduled job in P2, or
-- manually from admin during the demo).
create or replace function refresh_item_pairs()
returns void language sql as $$
  refresh materialized view item_pairs;
$$;
