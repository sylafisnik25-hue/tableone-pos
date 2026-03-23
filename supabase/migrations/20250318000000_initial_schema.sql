-- TableOne POS – initial schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor) or via Supabase CLI

-- Restaurant tables (floor plan)
create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'available' check (status in ('available', 'occupied', 'ready', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orders (one per table/session)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables(id) on delete restrict,
  status text not null default 'open' check (status in ('open', 'submitted', 'paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order line items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null,
  quantity int not null default 1 check (quantity > 0),
  menu_item_id int,
  created_at timestamptz not null default now()
);

-- Stock / inventory
create table if not exists public.stock (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quantity numeric(12, 2) not null default 0,
  unit text default 'unit',
  updated_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists idx_orders_table_id on public.orders(table_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- Optional: seed 16 tables (run if you want default floor plan)
-- insert into public.tables (name, status)
-- select 'Table ' || n, (array['available','occupied','ready','paid'])[1 + (n - 1) % 4]
-- from generate_series(1, 16) as n;
