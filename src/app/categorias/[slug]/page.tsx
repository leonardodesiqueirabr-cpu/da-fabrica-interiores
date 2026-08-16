import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { AllProductsCatalog } from "@/components/all-products-catalog";
import { getCatalogData } from "@/lib/data/catalog";
import { buildBreadcrumbFromOrigin } from "@/lib/utils/breadcrumb";

const titleMap: Record<string, string> = {
  sofas: "Sofas",
  camas: "Camas",
  colchoes: "Colchoes",
  sala: "Sala",
  "mais-vendidos": "Mais vendidos",
};

const categoryMetadata: Record<string, { title: string; description: string }> = {
  sofas: { title: "Sofás", description: "Sofás e sofás-cama para compor a sua sala com conforto e estilo." },
  camas: { title: "Camas", description: "Camas, packs de cama e bases para o seu quarto." },
  colchoes: { title: "Colchões", description: "Colchões para complementar o seu conjunto de cama." },
  sala: { title: "Sala", description: "Mobiliário e complementos para a sua sala." },
  "mais-vendidos": { title: "Mais vendidos", description: "Os modelos mais procurados pelos nossos clientes." },
};

type CategoryPageParams = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: CategoryPageParams): Promise<Metadata> {
  const { slug } = await params;
  const meta = categoryMetadata[slug];

  if (!meta) {
    return {};
  }

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/categorias/${slug}`,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
    },
    twitter: {
      card: "summary",
      title: meta.title,
      description: meta.description,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  if (!titleMap[slug]) {
    notFound();
  }

  const catalog = await getCatalogData();
  const fromRaw = resolvedSearchParams.from;
  const fromPath =
    typeof fromRaw === "string"
      ? fromRaw
      : Array.isArray(fromRaw) && typeof fromRaw[0] === "string"
        ? fromRaw[0]
        : undefined;
  const breadcrumbItems = buildBreadcrumbFromOrigin(fromPath, titleMap[slug]);

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

      <h1 className="text-5xl font-semibold">{titleMap[slug]}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        Explore os modelos mais procurados em {titleMap[slug].toLowerCase()} e refine por preço, disponibilidade e
        destaque para decidir com mais rapidez.
      </p>
      <AllProductsCatalog
        products={catalog.products}
        categories={catalog.categories}
        initialSelectedCategories={[slug]}
        lockInitialCategories
        compactGrid
        compactGridLooseVerticalGap
        compactGridDesktopFour
      />
    </section>
  );
}
