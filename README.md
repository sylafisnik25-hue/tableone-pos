# TableOne POS

A React + Vite + Supabase restaurant POS.

## Features

- **Tables** — 16-table grid (from DB or fallback); statuses: available, occupied, ready, paid
- **Order** — Category tabs, menu, order summary, submit to Supabase when configured
- **Navigation** — Tables, Orders, Kitchen, Stock, Owner

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. **Supabase (optional but recommended)**  
   - Create a project at [supabase.com](https://supabase.com).  
   - Copy `.env.example` to `.env` and set:
     - `VITE_SUPABASE_URL` — project URL (Settings → API)
     - `VITE_SUPABASE_ANON_KEY` — anon/public key  
   - In the Supabase **SQL Editor**, run the migration:
     - `supabase/migrations/20250318000000_initial_schema.sql`  
     - This creates `tables`, `orders`, `order_items`, and `stock`.  
   - (Optional) Seed 16 tables: in SQL Editor run:
     ```sql
     insert into public.tables (name, status)
     select 'Table ' || n, (array['available','occupied','ready','paid'])[1 + (n - 1) % 4]
     from generate_series(1, 16) as n;
     ```

3. Run dev server:
   ```bash
   npm run dev
   ```

**Without Supabase** the app still works: you get a default 16-table grid and can build orders in the UI; nothing is persisted. With Supabase and the schema applied, tables and orders are stored in the database.

## Scripts

- `npm run dev` — Start dev server  
- `npm run build` — Production build  
- `npm run preview` — Preview production build  
