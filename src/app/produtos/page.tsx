import Link from "next/link";
import type { Metadata } from "next";
import { AllProductsCatalog } from "@/components/all-products-catalog";
import { getCatalogData } from "@/lib/data/catalog";
import { buildBreadcrumbFromOrigin } from "@/lib/utils/breadcrumb";

export const metadata: Metadata = {
  title: "Todos os produtos",
  description: "Compare linhas, preços e diferenciais para encontrar o mobiliário ideal com o melhor equilíbrio entre design, conforto e valor.",
  alternates: {
    canonical: "/produtos",
  },
  openGraph: {
    title: "Todos os produtos",
    description: "Compare linhas, preços e diferenciais para encontrar o mobiliário ideal com o melhor equilíbrio entre design, conforto e valor.",
  },
  twitter: {
    card: "summary",
    title: "Todos os produtos",
    description: "Compare linhas, preços e diferenciais para encontrar o mobiliário ideal com o melhor equilíbrio entre design, conforto e valor.",
  },
};

export default async function AllProductsPage({
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
  const breadcrumbItems = buildBreadcrumbFromOrigin(fromPath, "Todos os produtos");

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

      <h1 className="text-5xl font-semibold">Todos os produtos</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        Compare linhas, preços e diferenciais para encontrar o mobiliário ideal com o melhor equilíbrio entre design,
        conforto e valor.
      </p>
      <AllProductsCatalog products={catalog.products} categories={catalog.categories} compactGrid compactGridDesktopFour />
    </section>
  );
}
