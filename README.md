# DA Fabrica Catalogo Premium

Aplicacao completa de catalogo/e-commerce sem checkout, focada em conversao por WhatsApp.

## Arquitetura

- Frontend: Next.js 15 + TypeScript + Tailwind CSS
- Dados: Supabase (Postgres + Auth + Storage)
- Fallback local: seed gerado automaticamente a partir de `catalog_products.csv` e imagens da pasta raiz
- Admin: area protegida em `/admin` com CRUD de produtos, categorias multiplas, variacoes, medidas/precos e upload

## Estrutura principal

- `src/app`: paginas publicas, produto, categorias, admin e APIs
- `src/components`: UI reutilizavel e formularios
- `src/lib/data`: camada de dados (Supabase + fallback local)
- `src/lib/supabase`: clientes browser/server/service role
- `scripts/generate-seed.mjs`: importa CSV + ficheiros existentes e gera seed local
- `scripts/seed-supabase.mjs`: envia seed local para o banco real
- `supabase/schema.sql`: esquema completo do banco

## Setup

1. Instalar dependencias:

```bash
npm install
```

2. Gerar seed local e copiar assets atuais para `public/source-assets`:

```bash
npm run prepare:assets
```

3. Criar `.env.local` a partir de `.env.example` e preencher:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`

4. No Supabase SQL Editor, executar `supabase/schema.sql`.

5. Criar bucket publico `product-images` no Supabase Storage.

6. Semear banco com produtos iniciais:

```bash
npm run seed:supabase
```

7. Rodar local:

```bash
npm run dev
```

## Funcionalidades entregues

- Homepage premium com destaque, mais vendidos, recomendados e CTA WhatsApp
- Paginas por categoria: sofas, camas, colchoes, sala, todos e mais vendidos
- Pagina individual com galeria, selecao de cor, medidas, opcoes e mensagem WhatsApp automatica
- Botao fixo de WhatsApp em todo o site
- Painel admin com autenticacao Supabase
- CRUD de produtos com:
  - categorias multiplas
  - flags de destaque e mais vendido
  - medidas com preco por variacao
  - opcoes customizadas por produto
  - associacao de imagem por cor
  - upload de imagem para Storage

## Observacao

Quando variaveis do Supabase nao estao configuradas, o site usa os dados locais gerados automaticamente dos ficheiros existentes da pasta.
