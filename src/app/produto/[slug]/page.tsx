import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductConfigurator } from "@/components/product-configurator";
import { ProductsCarousel } from "@/components/products-carousel";
import { getCatalogData, getRecommendedProducts } from "@/lib/data/catalog";
import { buildBreadcrumbFromOrigin } from "@/lib/utils/breadcrumb";

type ProductPageParams = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProductPageParams): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getCatalogData();
  const product = catalog.products.find((item) => item.slug === slug);

  if (!product) {
    return { title: "Produto não encontrado" };
  }

  const description = product.shortDescription || product.description || undefined;
  const mainImage = product.images.find((image) => image.isMain) ?? product.images[0];

  return {
    title: product.name,
    description,
    alternates: {
      canonical: `/produto/${product.slug}`,
    },
    openGraph: {
      title: product.name,
      description,
      images: mainImage ? [{ url: mainImage.url, alt: mainImage.alt || product.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: mainImage ? [mainImage.url] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const catalog = await getCatalogData();
  const product = catalog.products.find((item) => item.slug === slug);

  if (!product) {
    notFound();
  }

  const recommendedProducts = getRecommendedProducts(catalog.products, product, 8);
  const fromRaw = resolvedSearchParams.from;
  const fromPath =
    typeof fromRaw === "string"
      ? fromRaw
      : Array.isArray(fromRaw) && typeof fromRaw[0] === "string"
        ? fromRaw[0]
        : undefined;
  const breadcrumbItems = buildBreadcrumbFromOrigin(fromPath, product.name);

  return (
    <div className="container-shell pt-16 pb-20 md:pt-20 md:pb-24 lg:pt-24 lg:pb-28">
      <nav className="mb-4 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
        {breadcrumbItems.map((item, index) => (
          <span key={`${item.label}-${index}`}>
            {index > 0 ? <span className="mx-2">/</span> : null}

            {item.href && index < breadcrumbItems.length - 1 ? (
              <Link href={item.href} className="transition hover:text-[var(--foreground)]">
                {item.label}
              </Link>
            ) : (
              <span className={index === breadcrumbItems.length - 1 ? "text-[var(--foreground)]" : undefined}>
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      <ProductConfigurator product={product} />

      {recommendedProducts.length > 0 ? (
        <section className="mt-20 space-y-6 border-t border-[var(--border)] pt-12">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Sugestões</p>
            <h2 className="text-3xl font-semibold md:text-4xl">Produtos recomendados</h2>
          </div>

          <ProductsCarousel products={recommendedProducts} />
        </section>
      ) : null}
    </div>
  );
}
