create extension if not exists "pgcrypto";

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  short_description text,
  description text,
  base_price numeric,
  featured boolean not null default false,
  best_seller boolean not null default false,
  available boolean not null default true,
  characteristics text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_categories (
  product_id uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt_text text,
  color_name text,
  color_hex text,
  is_main boolean not null default false,
  sort_order int not null default 0
);

alter table product_images add column if not exists color_hex text;

create table if not exists product_measurements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  measure_label text not null,
  price numeric,
  active boolean not null default true
);

create table if not exists product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  option_name text not null,
  values text[] not null default '{}'
);

insert into categories (slug, label)
values
  ('sofas', 'Sofas'),
  ('camas', 'Camas'),
  ('colchoes', 'Colchoes'),
  ('sala', 'Sala'),
  ('mais-vendidos', 'Mais Vendidos')
on conflict (slug) do update set label = excluded.label;

alter table categories enable row level security;
alter table products enable row level security;
alter table product_categories enable row level security;
alter table product_images enable row level security;
alter table product_measurements enable row level security;
alter table product_options enable row level security;

drop policy if exists "Public read categories" on categories;
create policy "Public read categories" on categories for select using (true);

drop policy if exists "Public read products" on products;
create policy "Public read products" on products for select using (true);

drop policy if exists "Public read product_categories" on product_categories;
create policy "Public read product_categories" on product_categories for select using (true);

drop policy if exists "Public read product_images" on product_images;
create policy "Public read product_images" on product_images for select using (true);

drop policy if exists "Public read product_measurements" on product_measurements;
create policy "Public read product_measurements" on product_measurements for select using (true);

drop policy if exists "Public read product_options" on product_options;
create policy "Public read product_options" on product_options for select using (true);

drop policy if exists "Authenticated full categories" on categories;
create policy "Authenticated full categories" on categories for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full products" on products;
create policy "Authenticated full products" on products for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full product_categories" on product_categories;
create policy "Authenticated full product_categories" on product_categories for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full product_images" on product_images;
create policy "Authenticated full product_images" on product_images for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full product_measurements" on product_measurements;
create policy "Authenticated full product_measurements" on product_measurements for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full product_options" on product_options;
create policy "Authenticated full product_options" on product_options for all to authenticated using (true) with check (true);

-- Grants minimos nas tabelas da aplicacao (necessarios alem do RLS/policies acima;
-- projetos novos do Supabase nao concedem automaticamente esses privilegios).
grant usage on schema public to anon, authenticated, service_role;

grant select on table
  categories, products, product_categories,
  product_images, product_measurements, product_options
to anon;

grant select, insert, update, delete on table
  categories, products, product_categories,
  product_images, product_measurements, product_options
to authenticated, service_role;
