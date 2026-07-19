import Link from "next/link";
import { AllProductsCatalog } from "@/components/all-products-catalog";
import { getCatalogData } from "@/lib/data/catalog";
import { buildBreadcrumbFromOrigin } from "@/lib/utils/breadcrumb";

export default async function BestSellersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const catalog = await getCatalogData();
  const fromRaw = resolvedSearchParams.from;
  const fromPath =
    typeof fromRaw === "string"
      ? fromRaw
      : Array.isArray(fromRaw) && typeof fromRaw[0] === "string"
        ? fromRaw[0]
        : undefined;
  const breadcrumbItems = buildBreadcrumbFromOrigin(fromPath, "Mais vendidos");

  return (
    <section className="container-shell pt-14 pb-28">
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

      <h1 className="text-5xl font-semibold">Mais vendidos</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        Veja os produtos com maior procura e melhor aceitação para comprar com confiança e acertar na primeira
        escolha.
      </p>
      <AllProductsCatalog
        products={catalog.products}
        categories={catalog.categories}
        initialOnlyBestSellers
        compactGrid
        compactGridDesktopFour
      />
    </section>
  );
}
