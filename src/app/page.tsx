import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/product-card";
import { ProductsCarousel } from "@/components/products-carousel";
import { getBestSellerProducts, getCatalogData, getFeaturedProducts } from "@/lib/data/catalog";
import { buildWhatsAppUrl, WHATSAPP_STORE_INFO_MESSAGE } from "@/lib/utils/whatsapp";

const whatsappPhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "351915783035";

export default async function HomePage() {
  const catalog = await getCatalogData();
  const bestSellers = getBestSellerProducts(catalog.products);
  const bestSellersPreview = bestSellers.slice(0, 6);
  const bestSellerIds = new Set(bestSellersPreview.map((product) => product.id));

  const featuredPool = getFeaturedProducts(catalog.products).filter((product) => !bestSellerIds.has(product.id));
  const fallbackPool = catalog.products.filter(
    (product) => !bestSellerIds.has(product.id) && !featuredPool.some((item) => item.id === product.id),
  );
  const featured = [...featuredPool, ...fallbackPool].slice(0, 8);

  const bestSellersKey = bestSellersPreview.map((product) => product.id).join("-") || "empty";
  const featuredKey = featured.map((product) => product.id).join("-") || "empty";
  const environmentImageA = catalog.products[1]?.images[0]?.url || catalog.assets.heroImage;
  const promotionalBanner = "/Home/banner-publicidade.png";

  return (
    <div className="pb-24">
      <section className="relative min-h-[86svh] overflow-hidden md:min-h-[86vh]">
        {catalog.assets.heroImage ? (
          <Image src={catalog.assets.heroImage} alt="Ambiente premium" fill priority className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[var(--surface-soft)]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />

        <div className="container-shell relative z-10 flex min-h-[86svh] items-end pb-16 md:min-h-[86vh]">
          <div className="max-w-2xl space-y-6 text-white fade-up">
            <p className="text-xs uppercase tracking-[0.2em] text-white/80">Os Mais Vendidos</p>
            <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
              Conforto e design para transformar a sua casa
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-white/85 md:text-base">
              Móveis bonitos que duram anos sem problema. Conforto que sua família vai aproveitar todo dia, com o design que você gosta.
            </p>
            <Link
              href={{ pathname: "/produtos", query: { from: "/" } }}
              className="inline-flex rounded-full bg-[var(--accent)] px-7 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[var(--accent-strong)]"
            >
              Explorar colecao
            </Link>
          </div>
        </div>
      </section>

      <section className="container-shell section-gap">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { slug: "sofas", title: "Sofás" },
            { slug: "camas", title: "Camas" },
            { slug: "colchoes", title: "Colchões" },
          ].map((category) => (
            <Link
              key={category.slug}
              href={{ pathname: `/categorias/${category.slug}`, query: { from: "/" } }}
              className="group space-y-3 border-t border-[var(--border)] pt-6"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Categoria</p>
              <h2 className="text-3xl font-semibold">{category.title}</h2>
              <p className="text-sm text-[var(--muted)]">Os modelos mais escolhidos pelos clientes: confortáveis, bonitos e que envelhecem bem.</p>
              <span className="inline-flex text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Explorar</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-shell section-gap space-y-8">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Mais vendidos</p>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <h2 className="text-4xl font-semibold">Peças de maior procura</h2>
            <Link
              href={{ pathname: "/mais-vendidos", query: { from: "/" } }}
              className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]"
            >
              Ver coleção completa
            </Link>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            Os mais escolhidos pelos nossos clientes — peças confortáveis, bonitas e que se mantêm bem com o tempo.
          </p>
        </div>
        <ProductsCarousel key={bestSellersKey} products={bestSellersPreview} />
      </section>

      <section className="section-gap grid gap-6 lg:grid-cols-2">
        <div className="relative min-h-[520px] overflow-hidden bg-[var(--surface-soft)]">
          {environmentImageA ? (
            <Image src={environmentImageA} alt="Ambiente decorado" fill className="object-cover" />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-8 text-white">
            <p className="text-xs uppercase tracking-[0.18em] text-white/80">Viver bem</p>
            <h3 className="mt-3 text-2xl font-semibold">Menos excesso. Mais elegância.</h3>
          </div>
        </div>
        <div className="container-shell flex items-center">
          <div className="max-w-xl space-y-5 py-12">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Seleção</p>
            <h2 className="text-4xl font-semibold">A sala que você deseja começa com a escolha certa</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Escolha agora entre os modelos mais procurados — converse com a gente e encontre a peça perfeita pra sua casa em minutos.
            </p>
            <Link
              href={buildWhatsAppUrl(whatsappPhone, "Ola, quero uma recomendacao personalizada para a minha sala.")}
              target="_blank"
              className="inline-flex rounded-full bg-[var(--accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--accent-strong)]"
            >
              Falar com especialista
            </Link>
          </div>
        </div>
      </section>

      <section className="container-shell section-gap space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 className="text-4xl font-semibold">Produtos em destaque</h2>
          <Link
            href={{ pathname: "/produtos", query: { from: "/" } }}
            className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]"
          >
            Ver todos os produtos
          </Link>
        </div>
        <ProductsCarousel key={featuredKey} products={featured} />
      </section>

      <section className="container-shell section-gap">
        <Link
          href={{ pathname: "/produtos", query: { from: "/" } }}
          className="group block overflow-hidden border border-[var(--border)] bg-[var(--surface-soft)]"
        >
          <div className="relative h-[280px] w-full md:h-[320px]">
            {promotionalBanner ? (
              <Image
                src={promotionalBanner}
                alt="Ambiente de sala com sofa premium"
                fill
                className="object-cover transition duration-500 group-hover:scale-[1.02]"
              />
            ) : null}

            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent" />

            <div className="relative z-10 flex h-full items-center px-6 md:px-12">
              <div className="max-w-xl space-y-3 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80">Colecao em destaque</p>
                <h2 className="text-2xl font-bold leading-tight md:text-4xl">
                  Sua sala com cara de showroom.
                </h2>
                <p className="max-w-lg text-sm leading-relaxed text-white/90 md:text-base">
                  Linhas sofisticadas, toque premium e acabamento impecável para elevar o padrão do seu espaço.
                </p>
                <span className="inline-flex items-center rounded-full border border-white/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition group-hover:bg-white group-hover:text-[var(--accent)]">
                  Descobrir agora
                </span>
              </div>
            </div>
          </div>
        </Link>
      </section>

      <section className="relative left-1/2 mt-44 mb-0 w-screen -translate-x-1/2 border-t border-[var(--border)] bg-[var(--accent)] text-white">
        <div className="container-shell flex min-h-[62vh] flex-col items-center justify-center px-6 py-16 text-center">
          <h2 className="text-4xl font-semibold">Pronto para transformar o seu ambiente?</h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/85">
            Tenha apoio de especialistas para escolher o modelo ideal e comprar com segurança, rapidez e total confiança.
          </p>
          <Link
            href={buildWhatsAppUrl(whatsappPhone, WHATSAPP_STORE_INFO_MESSAGE)}
            target="_blank"
            className="mt-9 inline-flex rounded-full bg-white px-7 py-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)] transition hover:bg-white/90"
          >
            Falar pelo WhatsApp
          </Link>
        </div>
      </section>
    </div>
  );
}
