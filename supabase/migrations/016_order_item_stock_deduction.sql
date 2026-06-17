-- ============================================================
-- Deduct ingredient stock when order_items are inserted.
--
-- The original trigger ran after an orders insert, but the app inserts the
-- order first and its order_items afterward. At order-insert time there are
-- no rows to deduct, so desk/QR/web/kiosk orders could miss stock updates.
-- ============================================================

drop trigger if exists deduct_ingredients_on_order on orders;

create or replace function deduct_ingredients_for_order_item()
returns trigger language plpgsql as $$
begin
  update ingredients ing
  set stock_qty = ing.stock_qty - (new.quantity * mii.qty_used)
  from menu_item_ingredients mii
  join orders o on o.id = new.order_id
  where mii.ingredient_id = ing.id
    and mii.menu_item_id = new.menu_item_id
    and o.status <> 'cancelled'
    and not (
      ing.id::text in (
        select jsonb_array_elements_text(
          coalesce(new.customizations->'removed_ingredients', '[]'::jsonb)
        )
      )
    );

  update menu_items mi
  set available = false
  from menu_item_ingredients mii
  join ingredients ing on ing.id = mii.ingredient_id
  where mi.id = new.menu_item_id
    and mii.menu_item_id = new.menu_item_id
    and ing.stock_qty <= 0
    and ing.auto_disable = true;

  return new;
end;
$$;

create trigger deduct_ingredients_on_order_item
  after insert on order_items
  for each row
  execute function deduct_ingredients_for_order_item();

create or replace function restock_ingredients()
returns trigger language plpgsql as $$
declare
  v_item record;
  v_ing record;
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
          mii.ingredient_id::text in (
            select jsonb_array_elements_text(
              coalesce(v_item.customizations->'removed_ingredients', '[]'::jsonb)
            )
          )
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
