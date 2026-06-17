create table restaurant_settings (
  id                      uuid primary key default gen_random_uuid(),
  service_style           text not null default 'counter_service'
                            check (service_style in ('waiter_service', 'counter_service')),
  qr_enabled              boolean not null default true,
  kiosk_enabled           boolean not null default true,
  web_ordering_enabled    boolean not null default true,
  loyalty_enabled         boolean not null default true,
  table_selection_enabled boolean not null default true,
  desk_enabled            boolean not null default true,
  cash_enabled            boolean not null default true,
  loyalty_method          text default 'points'
                            check (loyalty_method in ('points', 'stamps', 'cashback')),
  theme_config            jsonb default '{"brand_color": "#f97316"}'::jsonb,
  gstin                   text,
  gst_rate                numeric(4,2) not null default 5.00,
  gst_inclusive           boolean not null default false,
  updated_at              timestamptz default now()
);

-- Enforce single-row table
create unique index restaurant_settings_singleton on restaurant_settings ((true));

-- Seed default settings
insert into restaurant_settings (service_style) values ('counter_service');
