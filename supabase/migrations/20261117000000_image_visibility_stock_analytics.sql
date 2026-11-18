-- Ocultar imagens, produto esgotado e estatísticas do site.
-- Idempotente: pode ser executada mais do que uma vez sem alterar dados existentes.
-- Não altera nem apaga nenhuma linha: só acrescenta uma coluna, uma tabela e uma função.

-- ─────────────────────────────────────────────────────────────
-- 1. Imagens ocultas
-- ─────────────────────────────────────────────────────────────
-- Todas as imagens existentes ficam visíveis (default false).
alter table product_images
  add column if not exists is_hidden boolean not null default false;

-- 2. Produto esgotado: reutiliza a coluna existente products.available
--    (true = disponível, false = esgotado; já é "not null default true").
--    Esta migração NÃO lhe toca: os valores atuais são preservados.

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
