# Supabase Setup — Da Fábrica Interiores

Este documento descreve toda a infraestrutura de dados (Supabase) e deploy (Vercel) da
aplicação, com o objetivo de permitir que qualquer desenvolvedor recrie o ambiente
completo do zero apenas seguindo estes passos.

## 1. Visão geral da arquitetura

```
Next.js 15 (App Router) ──┬── Leitura pública do catálogo (getCatalogData)
                           │      └─ Supabase Postgres (tabelas products/categories/...)
                           │
                           ├── Painel Admin (/admin/**)
                           │      ├─ Login por cookie httpOnly (ADMIN_USERNAME/ADMIN_PASSWORD)
                           │      └─ Rotas de escrita em /api/admin/** (protegidas por sessão)
                           │           ├─ CRUD de produtos → Supabase Postgres
                           │           └─ Upload de imagens → Supabase Storage (bucket product-images)
                           │
                           └── Deploy: Vercel (produção, preview, development)
```

Pontos-chave:
- **Autenticação do admin** é feita por um cookie httpOnly (`dafabrica_admin_session`),
  validado por `src/lib/admin-auth.ts` e `src/lib/admin-session.ts`. Não usa
  Supabase Auth — é um login simples usuário/senha via variáveis de ambiente.
- **Todas as rotas de escrita** em `/api/admin/**` (criar/editar/excluir produto,
  quick-edit, upload) exigem sessão válida e retornam `401` caso contrário.
- **Leitura pública** (`getCatalogData()` em `src/lib/data/catalog.ts`) usa o cliente
  Supabase anônimo (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) e cai em um fallback local
  (`src/lib/data/local-seed.json`) apenas se o Supabase não estiver configurado —
  em produção, com Supabase configurado, o fallback local nunca é usado.
- **Escrita administrativa** usa o cliente Supabase com `service_role`
  (`src/lib/supabase/service.ts`), que ignora RLS.
- Em runtimes somente-leitura (Vercel/produção), o filesystem **nunca** é usado para
  persistir produtos — apenas o banco.

## 2. Variáveis de ambiente necessárias

| Variável | Uso | Onde configurar |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase (ex.: `https://<ref>.supabase.co`) | `.env.local` + Vercel (Prod/Preview/Dev) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (`sb_publishable_...`, formato novo do Supabase) | `.env.local` + Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privada (`sb_secret_...`), usada só no servidor | `.env.local` + Vercel (**nunca** com prefixo `NEXT_PUBLIC_`) |
| `ADMIN_USERNAME` | Usuário do painel admin | `.env.local` + Vercel |
| `ADMIN_PASSWORD` | Senha do painel admin | `.env.local` + Vercel |
| `NEXT_PUBLIC_SITE_URL` | URL pública do site | `.env.local` + Vercel |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número usado no botão flutuante do WhatsApp | `.env.local` + Vercel |

> ⚠️ O Supabase atual usa o **novo formato de chaves de API**: `sb_publishable_...`
> (equivalente à antiga `anon key`) e `sb_secret_...` (equivalente à antiga
> `service_role key`). Confira sempre o prefixo antes de colar valores — é fácil
> confundir a URL do projeto com uma das chaves.

Sem as 3 variáveis do Supabase configuradas, o app funciona apenas com o fallback
local (`local-seed.json`) e o painel admin recusa qualquer escrita em produção
(retorna erro explícito em vez de tentar gravar no filesystem).

## 3. Como criar um novo projeto Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project**.
2. Escolha organização, nome do projeto, senha do banco (guarde-a) e região.
3. Aguarde o provisionamento (alguns minutos).
4. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / `publishable` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / `secret` key → `SUPABASE_SERVICE_ROLE_KEY`
5. Em **Project Settings → Database**, copie a connection string direta (host
   `db.<ref>.supabase.co`, porta `5432`) — necessária para aplicar o schema via `psql`,
   já que o schema faz DDL (criação de tabelas/policies/grants), que a API REST não executa.

## 4. Como aplicar o schema

O schema completo (tabelas, categorias iniciais, RLS, policies e grants) está em
[`supabase/schema.sql`](supabase/schema.sql). Ele é idempotente (pode ser rodado
mais de uma vez sem erro).

```bash
PGPASSWORD='<senha-do-banco>' psql \
  "host=db.<project-ref>.supabase.co port=5432 dbname=postgres user=postgres sslmode=require" \
  -f supabase/schema.sql
```

O schema cria, nesta ordem:
1. Extensão `pgcrypto` (para `gen_random_uuid()`).
2. Tabelas: `categories`, `products`, `product_categories`, `product_images`,
   `product_measurements`, `product_options`.
3. Seed das 5 categorias fixas (`sofas`, `camas`, `colchoes`, `sala`, `mais-vendidos`).
4. RLS habilitado em todas as tabelas + policies de leitura pública e escrita para
   `authenticated`.
5. **Grants mínimos** nas 6 tabelas (ver seção 8) — necessários porque projetos novos
   do Supabase não concedem automaticamente esses privilégios, mesmo com RLS/policies
   configuradas corretamente.

Após aplicar, confirme que as 6 tabelas existem:

```bash
PGPASSWORD='<senha-do-banco>' psql \
  "host=db.<project-ref>.supabase.co port=5432 dbname=postgres user=postgres sslmode=require" \
  -c "\dt"
```

## 5. Como executar o seed

O seed popula o banco a partir de `src/lib/data/local-seed.json` (gerado previamente
por `npm run prepare:assets` a partir dos arquivos em `public/produtos/`).

```bash
# 1. Garanta que .env.local tem as 3 variáveis do Supabase configuradas
# 2. Confirme que a tabela products está vazia antes de rodar (evita duplicar dados)
npm run seed:supabase
```

O script (`scripts/seed-supabase.mjs`):
- Faz `upsert` por `slug` (idempotente — pode ser executado novamente com segurança).
- Deixa o Postgres gerar os `id` (uuid) de cada produto — **não** reaproveita os ids
  textuais do JSON local, pois a coluna `products.id` é `uuid`.
- Usa o `id` real retornado pelo insert/upsert para popular `product_categories`,
  `product_images`, `product_measurements` e `product_options`.

Validação pós-seed esperada (ajuste conforme o catálogo atual):

```sql
select 'categories' t, count(*) from categories
union all select 'products', count(*) from products
union all select 'product_categories', count(*) from product_categories
union all select 'product_images', count(*) from product_images
union all select 'product_measurements', count(*) from product_measurements
union all select 'product_options', count(*) from product_options;
```

## 6. Buckets utilizados (Supabase Storage)

| Bucket | Público | Uso | Limite | MIME types permitidos |
|---|---|---|---|---|
| `product-images` | Sim | Upload de imagens de produtos pelo painel admin (`/api/admin/upload`) | 5 MB | `image/jpeg`, `image/jpg`, `image/png`, `image/webp` |

Criação via API REST do Storage (equivalente a criar pelo dashboard em
**Storage → New bucket**, marcando "Public bucket"):

```bash
curl -X POST "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/bucket" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id":"product-images",
    "name":"product-images",
    "public":true,
    "file_size_limit":5242880,
    "allowed_mime_types":["image/jpeg","image/jpg","image/png","image/webp"]
  }'
```

O código já referencia exatamente esse nome de bucket em
[`src/app/api/admin/upload/route.ts`](src/app/api/admin/upload/route.ts)
(`supabase.storage.from("product-images")`), tanto para o upload quanto para gerar a
`publicUrl`. Sem Supabase configurado, o upload cai num fallback local
(`public/uploads/`), usado apenas em desenvolvimento.

## 7. Políticas SQL do Storage

Como bucket público, a leitura via URL pública (`/storage/v1/object/public/...`) já
funciona independentemente de policies. Ainda assim, para clareza e defesa em
profundidade, aplicamos policies explícitas em `storage.objects`, versionadas em
[`supabase/storage.sql`](supabase/storage.sql) (idempotente, requer que o bucket
`product-images` já exista — ver seção 6):

```bash
PGPASSWORD='<senha-do-banco>' psql \
  "host=db.<project-ref>.supabase.co port=5432 dbname=postgres user=postgres sslmode=require" \
  -f supabase/storage.sql
```

Essas policies são específicas do bucket (`bucket_id = 'product-images'`), não
concedem acesso amplo a `storage.objects` como um todo.

## 8. Permissões / RLS (Postgres)

### RLS por tabela (`supabase/schema.sql`)
Todas as 6 tabelas de aplicação têm RLS habilitado com duas policies cada:
- **`Public read <tabela>`**: `select using (true)` — leitura pública, usada pelo
  catálogo (via `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **`Authenticated full <tabela>`**: `for all to authenticated using (true) with
  check (true)` — CRUD completo para o role `authenticated`.

### Grants mínimos (obrigatórios além das policies)
RLS e policies **não substituem** os grants básicos do Postgres — são camadas
independentes. Projetos novos do Supabase não concedem automaticamente privilégios
nas tabelas customizadas, o que causa erro `permission denied for table <x>` mesmo
com policies corretas. Por isso o schema aplica:

```sql
grant usage on schema public to anon, authenticated, service_role;

grant select on table
  categories, products, product_categories,
  product_images, product_measurements, product_options
to anon;

grant select, insert, update, delete on table
  categories, products, product_categories,
  product_images, product_measurements, product_options
to authenticated, service_role;
```

Escopo deliberadamente **restrito às 6 tabelas nomeadas** — evitar
`grant ... on all tables in schema public` ou `alter default privileges`, que
concederiam acesso amplo além do necessário.

`service_role` tem `BYPASSRLS=true` por padrão no Supabase, mas ainda assim precisa
dos grants acima — bypass de RLS não dispensa privilégios de tabela.

## 9. Configuração da Vercel

Variáveis a configurar nos 3 ambientes (Production, Preview, Development):

```bash
# Autentique-se antes: npx vercel login (se ainda não estiver logado)
cd <diretório do projeto>
set -a && source .env.local && set +a

for env in production preview development; do
  printf '%s' "$NEXT_PUBLIC_SUPABASE_URL"      | npx vercel env add NEXT_PUBLIC_SUPABASE_URL "$env" --force
  printf '%s' "$NEXT_PUBLIC_SUPABASE_ANON_KEY"  | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY "$env" --force
  printf '%s' "$SUPABASE_SERVICE_ROLE_KEY"      | npx vercel env add SUPABASE_SERVICE_ROLE_KEY "$env" --force
  printf '%s' "$ADMIN_USERNAME"                 | npx vercel env add ADMIN_USERNAME "$env" --force
  printf '%s' "$ADMIN_PASSWORD"                 | npx vercel env add ADMIN_PASSWORD "$env" --force
done
```

Confirme que as variáveis foram gravadas:

```bash
npx vercel env ls production
npx vercel env ls preview
npx vercel env ls development
```

## 10. Comandos de deploy

```bash
# Validações locais antes do deploy
npm run lint
npx tsc --noEmit
npm run build

# Deploy de produção (gera preview URL e faz alias para o domínio de produção)
npx vercel --prod
```

Após o deploy, confirme no output que o **Aliased** aponta para o domínio de
produção esperado (ex.: `https://jarv-sigma.vercel.app`) — já ocorreu de o alias
continuar apontando para um deployment antigo mesmo com o novo "Ready".

## 11. Checklist para recriar todo o ambiente do zero

- [ ] Criar novo projeto no Supabase (seção 3) e guardar a senha do Postgres.
- [ ] Copiar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
      `SUPABASE_SERVICE_ROLE_KEY` para `.env.local` (conferir os prefixos
      `sb_publishable_`/`sb_secret_` para não trocar os valores).
- [ ] Definir `ADMIN_USERNAME`/`ADMIN_PASSWORD` em `.env.local`.
- [ ] Aplicar `supabase/schema.sql` via `psql` (seção 4) — cria tabelas, RLS,
      policies e grants mínimos.
- [ ] Confirmar as 6 tabelas via `\dt` e que `products` está vazia.
- [ ] Rodar `npm run seed:supabase` (seção 5) e validar as contagens por tabela.
- [ ] Criar o bucket `product-images` público com os limites/MIME types corretos
      (seção 6).
- [ ] Aplicar `supabase/storage.sql` via `psql` (seção 7).
- [ ] Validar leitura pública: `select * from pg_policies where schemaname='storage'`
      deve listar as 2 policies do bucket.
- [ ] Rodar `npm run lint`, `npx tsc --noEmit` e `npm run build` localmente sem erros.
- [ ] Configurar as 5 variáveis de ambiente na Vercel para Production/Preview/Development
      (seção 9) e confirmar com `vercel env ls`.
- [ ] Rodar `npx vercel --prod` e confirmar o alias de produção (seção 10).
- [ ] Validar ponta a ponta em produção:
  - [ ] Catálogo público (`/produtos`) lista os produtos do Supabase.
  - [ ] Login do admin (`/admin/login`) funciona com `ADMIN_USERNAME`/`ADMIN_PASSWORD`.
  - [ ] Criar, editar, quick-edit e excluir um produto de teste — confirmar
        persistência no Postgres e depois reverter (excluir o produto de teste).
  - [ ] Upload de imagem de teste retorna URL pública válida (HTTP 200,
        `content-type: image/*`) — remover o arquivo de teste do bucket ao final.
  - [ ] Chamar as rotas de escrita (`POST/PATCH/DELETE /api/admin/**`) **sem** cookie
        de sessão e confirmar `401` em todas.
