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
  is_published boolean not null default true,
  available boolean not null default true,
  characteristics text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products
  add column if not exists is_published boolean not null default true;

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
  is_hidden boolean not null default false,
  sort_order int not null default 0
);

alter table product_images add column if not exists color_hex text;
alter table product_images add column if not exists is_hidden boolean not null default false;

create table if not exists product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  hex text,
  position int not null default 0
);

alter table product_images add column if not exists color_id uuid references product_colors(id) on delete set null;

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

create table if not exists homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique check (section_key in ('hero', 'selection')),
  image_url text,
  image_alt text,
  eyebrow text,
  kicker text,
  subheadline text,
  headline text,
  description text,
  cta_label text,
  cta_href text,
  image_managed boolean not null default false,
  updated_at timestamptz not null default now()
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
alter table product_colors enable row level security;
alter table product_measurements enable row level security;
alter table product_options enable row level security;
alter table homepage_sections enable row level security;

drop policy if exists "Public read categories" on categories;
create policy "Public read categories" on categories for select using (true);

drop policy if exists "Public read products" on products;
create policy "Public read products" on products for select using (true);

drop policy if exists "Public read product_categories" on product_categories;
create policy "Public read product_categories" on product_categories for select using (true);

drop policy if exists "Public read product_images" on product_images;
create policy "Public read product_images" on product_images for select using (true);

drop policy if exists "Public read product_colors" on product_colors;
create policy "Public read product_colors" on product_colors for select using (true);

drop policy if exists "Public read product_measurements" on product_measurements;
create policy "Public read product_measurements" on product_measurements for select using (true);

drop policy if exists "Public read product_options" on product_options;
create policy "Public read product_options" on product_options for select using (true);

drop policy if exists "Public read homepage_sections" on homepage_sections;
create policy "Public read homepage_sections" on homepage_sections for select using (true);

drop policy if exists "Authenticated full categories" on categories;
create policy "Authenticated full categories" on categories for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full products" on products;
create policy "Authenticated full products" on products for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full product_categories" on product_categories;
create policy "Authenticated full product_categories" on product_categories for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full product_images" on product_images;
create policy "Authenticated full product_images" on product_images for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full product_colors" on product_colors;
create policy "Authenticated full product_colors" on product_colors for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full product_measurements" on product_measurements;
create policy "Authenticated full product_measurements" on product_measurements for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated full product_options" on product_options;
create policy "Authenticated full product_options" on product_options for all to authenticated using (true) with check (true);

-- Grants minimos nas tabelas da aplicacao (necessarios alem do RLS/policies acima;
-- projetos novos do Supabase nao concedem automaticamente esses privilegios).
grant usage on schema public to anon, authenticated, service_role;

grant select on table
  categories, products, product_categories,
  product_images, product_colors, product_measurements, product_options,
  homepage_sections
to anon;

grant select, insert, update, delete on table
  categories, products, product_categories,
  product_images, product_colors, product_measurements, product_options
to authenticated, service_role;

grant select on table homepage_sections to authenticated;
grant select, insert, update, delete on table homepage_sections to service_role;

-- ─────────────────────────────────────────────────────────────
-- 4. Estatísticas (recolha própria, sem cookies)
-- ─────────────────────────────────────────────────────────────
-- Não guarda IP, user agent nem query strings. visitor_hash é um hash diário
-- (sal secreto + dia + IP + user agent) que muda todos os dias e não permite
-- identificar a pessoa. dedupe_key evita eventos duplicados (retries, duplo clique,
-- refresh imediato).
create table if not exists analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event_type text not null check (event_type in ('pageview', 'whatsapp_click')),
  path text not null,
  product_slug text,
  source text check (source is null or source in ('product', 'float', 'other')),
  visitor_hash text not null,
  dedupe_key text not null unique
);

create index if not exists idx_analytics_events_created_at
  on analytics_events (created_at);
create index if not exists idx_analytics_events_type_created_at
  on analytics_events (event_type, created_at);
create index if not exists idx_analytics_events_visitor_created_at
  on analytics_events (visitor_hash, created_at);

-- RLS ativo e SEM policies: anon/authenticated não leem nem escrevem.
-- Apenas o servidor (service_role) grava e consulta.
alter table analytics_events enable row level security;
revoke all on table analytics_events from anon, authenticated;
grant select, insert on table analytics_events to service_role;

create or replace function analytics_summary(p_since timestamptz)
returns jsonb
language sql
stable
set search_path = public
as $$
  with period as (
    select * from analytics_events where created_at >= p_since
  )
  select jsonb_build_object(
    'collection_started_at', (select min(created_at) from analytics_events),
    'pageviews', (select count(*) from period where event_type = 'pageview'),
    'visitors', (
      select count(distinct visitor_hash) from period where event_type = 'pageview'
    ),
    'clicks_product', (
      select count(*) from period where event_type = 'whatsapp_click' and source = 'product'
    ),
    'clicks_float', (
      select count(*) from period where event_type = 'whatsapp_click' and source = 'float'
    ),
    'clicks_other', (
      select count(*) from period
      where event_type = 'whatsapp_click' and coalesce(source, 'other') = 'other'
    ),
    'top_pages', coalesce((
      select jsonb_agg(row_to_json(t)) from (
        select path, count(*) as views, count(distinct visitor_hash) as visitors
        from period where event_type = 'pageview'
        group by path order by views desc, path limit 10
      ) t
    ), '[]'::jsonb),
    'top_products', coalesce((
      select jsonb_agg(row_to_json(t)) from (
        select product_slug as slug, count(*) as views, count(distinct visitor_hash) as visitors
        from period where event_type = 'pageview' and product_slug is not null
        group by product_slug order by views desc, product_slug limit 10
      ) t
    ), '[]'::jsonb),
    'clicks_by_product', coalesce((
      select jsonb_agg(row_to_json(t)) from (
        select
          product_slug as slug,
          count(*) filter (where source = 'product') as product_clicks,
          count(*) filter (where source = 'float') as float_clicks,
          count(*) as total
        from period
        where event_type = 'whatsapp_click' and product_slug is not null
        group by product_slug order by total desc, product_slug limit 20
      ) t
    ), '[]'::jsonb)
  );
$$;

revoke all on function analytics_summary(timestamptz) from public, anon, authenticated;
grant execute on function analytics_summary(timestamptz) to service_role;
