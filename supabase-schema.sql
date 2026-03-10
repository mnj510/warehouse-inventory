-- Supabase Postgres schema for warehouse inventory app
-- (로그인 없이 누구나 접근 가능 + SKU 등록 지원)

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  inserted_at timestamptz not null default timezone('utc'::text, now())
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text,
  description text,
  min_stock integer default 0 check (min_stock >= 0),
  inserted_at timestamptz not null default timezone('utc'::text, now())
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  lot text,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  updated_by uuid references auth.users(id)
);

create unique index inventory_unique_product_location_lot
  on public.inventory(product_id, location_id, coalesce(lot, ''));

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action in ('입고', '출고', '이동', '수정')),
  product_id uuid not null references public.products(id) on delete cascade,
  location_from uuid references public.locations(id),
  location_to uuid references public.locations(id),
  quantity_change integer not null,
  user_id uuid references auth.users(id),
  note text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- RLS 켜기
alter table public.locations enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.audit_log enable row level security;

-- locations: 누구나 조회 + 등록
create policy "Public read locations"
  on public.locations for select
  using (true);

create policy "Public insert locations"
  on public.locations for insert
  with check (true);

-- products: 누구나 조회 + 등록
create policy "Public read products"
  on public.products for select
  using (true);

create policy "Public insert products"
  on public.products for insert
  with check (true);

-- inventory: 누구나 조회/입고/수정
create policy "Public read inventory"
  on public.inventory for select
  using (true);

create policy "Public insert inventory"
  on public.inventory for insert
  with check (true);

create policy "Public update inventory"
  on public.inventory for update
  using (true);

-- audit_log: 누구나 조회/기록
create policy "Public read audit_log"
  on public.audit_log for select
  using (true);

create policy "Public insert audit_log"
  on public.audit_log for insert
  with check (true);
