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

alter table homepage_sections enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'homepage_sections'
      and policyname = 'Public read homepage_sections'
  ) then
    create policy "Public read homepage_sections"
      on homepage_sections for select using (true);
  end if;
end
$$;

insert into homepage_sections (section_key, image_url, image_alt, eyebrow, kicker, subheadline, headline, description, cta_label, cta_href, image_managed)
values
  (
    'hero',
    '/Home/banner-inicial.png',
    'Ambiente premium',
    'Os Mais Vendidos',
    null,
    null,
    'Conforto e design para transformar a sua casa',
    'Móveis bonitos que duram anos sem problema. Conforto que sua família vai aproveitar todo dia, com o design que você gosta.',
    'Explorar colecao',
    '/produtos?from=/',
    false
  ),
  (
    'selection',
    null,
    'Ambiente decorado',
    'Viver bem',
    'Seleção',
    'Menos excesso. Mais elegância.',
    'A sala que você deseja começa com a escolha certa',
    'Escolha agora entre os modelos mais procurados — converse com a gente e encontre a peça perfeita pra sua casa em minutos.',
    'Falar com especialista',
    null,
    false
  )
on conflict (section_key) do nothing;

grant select on table homepage_sections to anon, authenticated;
grant select, insert, update, delete on table homepage_sections to service_role;
