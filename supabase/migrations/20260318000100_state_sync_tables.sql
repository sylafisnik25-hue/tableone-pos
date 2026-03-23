-- TableOne POS - state sync extensions
-- Adds fields/tables needed to persist app state across refresh/devices.

alter table public.tables
  add column if not exists local_table_id int;

create unique index if not exists idx_tables_local_table_id
  on public.tables(local_table_id);

alter table public.orders
  add column if not exists local_table_id int,
  add column if not exists is_paid boolean not null default false,
  add column if not exists opened_by text,
  add column if not exists updated_by text,
  add column if not exists closed_by text,
  add column if not exists paid_at timestamptz,
  add column if not exists discount numeric(10,2) not null default 0,
  add column if not exists adjusted_total numeric(10,2),
  add column if not exists last_submission_id text,
  add column if not exists last_submitted_at timestamptz;

create unique index if not exists idx_orders_local_table_id
  on public.orders(local_table_id);

alter table public.order_items
  add column if not exists note text,
  add column if not exists category text,
  add column if not exists allergy text,
  add column if not exists cook_level text,
  add column if not exists route text,
  add column if not exists sent_qty int not null default 0;

create table if not exists public.staff (
  id text primary key,
  name text not null,
  role text not null default 'staff',
  pin text not null,
  on_shift boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method text not null default 'card',
  amount numeric(10,2) not null,
  paid_at timestamptz not null default now()
);

create index if not exists idx_payments_order_id on public.payments(order_id);
