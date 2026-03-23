-- TableOne POS - inventory tables
-- Basic stock tracking with movement log.

create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'General',
  quantity numeric(12,2) not null default 0,
  low_stock_threshold numeric(12,2) not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  stock_item_id uuid not null references public.stock_items(id) on delete cascade,
  movement_type text not null check (movement_type in ('increase', 'decrease', 'set_threshold')),
  quantity_delta numeric(12,2) not null default 0,
  previous_quantity numeric(12,2),
  next_quantity numeric(12,2),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_items_category on public.stock_items(category);
create index if not exists idx_stock_movements_item_id on public.stock_movements(stock_item_id);
