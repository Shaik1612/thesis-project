create table ingredients (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  unit                text not null,
  stock_qty           numeric not null default 0 check (stock_qty >= 0),
  low_stock_threshold numeric not null default 0 check (low_stock_threshold >= 0),
  auto_disable        boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table menu_item_ingredients (
  menu_item_id  uuid not null references menu_items(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  qty_used      numeric not null check (qty_used > 0),
  primary key (menu_item_id, ingredient_id)
);

create index menu_item_ingredients_ingredient_id_idx on menu_item_ingredients(ingredient_id);
