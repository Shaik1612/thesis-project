-- ============================================================
-- Enable RLS on every table
-- ============================================================
alter table restaurant_settings   enable row level security;
alter table categories             enable row level security;
alter table menu_items             enable row level security;
alter table ingredients            enable row level security;
alter table menu_item_ingredients  enable row level security;
alter table tables                 enable row level security;
alter table table_sessions         enable row level security;
alter table staff_requests         enable row level security;
alter table orders                 enable row level security;
alter table order_items            enable row level security;
alter table print_jobs             enable row level security;
alter table loyalty_accounts       enable row level security;
alter table expenses               enable row level security;
alter table order_item_voids       enable row level security;
alter table refunds                enable row level security;
alter table z_reports              enable row level security;

-- ============================================================
-- Helper: role claim from JWT
-- ============================================================
create or replace function auth_role()
returns text language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    'anonymous'
  );
$$;

-- ============================================================
-- restaurant_settings — admin full, everyone else read-only
-- ============================================================
create policy "admin_all_restaurant_settings"
  on restaurant_settings for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "authenticated_read_restaurant_settings"
  on restaurant_settings for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- categories — admin manages, authenticated reads
-- ============================================================
create policy "admin_all_categories"
  on categories for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "authenticated_read_categories"
  on categories for select
  using (auth.role() = 'authenticated');

-- Guest (anon) can read categories and menu for QR/kiosk/web
create policy "anon_read_categories"
  on categories for select
  using (true);

-- ============================================================
-- menu_items — admin manages, everyone reads available items
-- ============================================================
create policy "admin_all_menu_items"
  on menu_items for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "public_read_available_menu_items"
  on menu_items for select
  using (available = true);

create policy "admin_read_all_menu_items"
  on menu_items for select
  using (auth_role() = 'admin');

-- ============================================================
-- ingredients — admin full, kitchen reads
-- ============================================================
create policy "admin_all_ingredients"
  on ingredients for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "staff_read_ingredients"
  on ingredients for select
  using (auth_role() in ('admin','employee','kitchen'));

-- ============================================================
-- menu_item_ingredients — admin manages, staff reads
-- ============================================================
create policy "admin_all_menu_item_ingredients"
  on menu_item_ingredients for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "staff_read_menu_item_ingredients"
  on menu_item_ingredients for select
  using (auth_role() in ('admin','employee','kitchen'));

-- ============================================================
-- tables — admin manages, staff reads, triggers update status
-- ============================================================
create policy "admin_all_tables"
  on tables for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "staff_read_tables"
  on tables for select
  using (auth_role() in ('admin','employee','kitchen'));

create policy "staff_update_table_status"
  on tables for update
  using (auth_role() in ('admin','employee'))
  with check (auth_role() in ('admin','employee'));

-- ============================================================
-- table_sessions — admin+employee manage, kitchen reads
-- ============================================================
create policy "admin_all_table_sessions"
  on table_sessions for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "employee_manage_sessions"
  on table_sessions for all
  using (auth_role() = 'employee')
  with check (auth_role() = 'employee');

create policy "kitchen_read_sessions"
  on table_sessions for select
  using (auth_role() = 'kitchen');

-- ============================================================
-- staff_requests — staff manages, kitchen reads
-- ============================================================
create policy "admin_all_staff_requests"
  on staff_requests for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "employee_manage_staff_requests"
  on staff_requests for all
  using (auth_role() = 'employee')
  with check (auth_role() = 'employee');

create policy "kitchen_read_staff_requests"
  on staff_requests for select
  using (auth_role() = 'kitchen');

-- Anonymous insert for QR bill-request / call-waiter
create policy "anon_insert_staff_requests"
  on staff_requests for insert
  with check (true);

-- ============================================================
-- orders — complex per-channel rules
-- ============================================================
create policy "admin_all_orders"
  on orders for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "employee_manage_orders"
  on orders for all
  using (auth_role() = 'employee')
  with check (auth_role() = 'employee');

create policy "kitchen_read_update_orders"
  on orders for select
  using (auth_role() = 'kitchen');

create policy "kitchen_update_status"
  on orders for update
  using (auth_role() = 'kitchen')
  with check (auth_role() = 'kitchen');

-- Edge Function (service role) inserts orders — covered by service role bypass

-- ============================================================
-- order_items — follows orders policy
-- ============================================================
create policy "admin_all_order_items"
  on order_items for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "employee_manage_order_items"
  on order_items for all
  using (auth_role() = 'employee')
  with check (auth_role() = 'employee');

create policy "kitchen_read_order_items"
  on order_items for select
  using (auth_role() = 'kitchen');

-- ============================================================
-- print_jobs — admin+employee manage, triggers insert
-- ============================================================
create policy "admin_all_print_jobs"
  on print_jobs for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "employee_read_print_jobs"
  on print_jobs for select
  using (auth_role() = 'employee');

-- ============================================================
-- loyalty_accounts — admin full, employee reads
-- ============================================================
create policy "admin_all_loyalty"
  on loyalty_accounts for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "employee_read_loyalty"
  on loyalty_accounts for select
  using (auth_role() = 'employee');

-- ============================================================
-- expenses — admin only
-- ============================================================
create policy "admin_all_expenses"
  on expenses for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

-- ============================================================
-- order_item_voids — admin+employee
-- ============================================================
create policy "admin_all_order_item_voids"
  on order_item_voids for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "employee_manage_order_item_voids"
  on order_item_voids for all
  using (auth_role() = 'employee')
  with check (auth_role() = 'employee');

-- ============================================================
-- refunds — admin manages
-- ============================================================
create policy "admin_all_refunds"
  on refunds for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');

create policy "employee_read_refunds"
  on refunds for select
  using (auth_role() = 'employee');

-- ============================================================
-- z_reports — admin only, locked after creation
-- ============================================================
create policy "admin_all_z_reports"
  on z_reports for all
  using (auth_role() = 'admin')
  with check (auth_role() = 'admin');
