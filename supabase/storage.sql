-- Politicas de Storage para o bucket "product-images".
-- Pre-requisito: o bucket precisa existir antes de rodar este arquivo
-- (criacao via API/dashboard, ver SUPABASE_SETUP.md secao 6 -- nao ha
-- comando SQL para criar buckets, isso e feito pela Storage API).
--
-- Idempotente: pode ser executado novamente sem erro.

-- Leitura publica das imagens do bucket product-images
drop policy if exists "Public read product-images" on storage.objects;
create policy "Public read product-images"
on storage.objects for select
to public
using (bucket_id = 'product-images');

-- Upload autenticado (o painel admin usa service_role, que ja tem bypassrls,
-- mas mantemos a policy explicita para authenticated tambem)
drop policy if exists "Authenticated upload product-images" on storage.objects;
create policy "Authenticated upload product-images"
on storage.objects for insert
to authenticated, service_role
with check (bucket_id = 'product-images');
