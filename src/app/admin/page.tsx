import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCatalogData } from "@/lib/data/catalog";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "@/lib/admin-auth";
import { AdminProductsTable } from "@/components/admin-products-table";

export default async function AdminPage() {
  const cookieStore = await cookies();
  if (!isAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  const catalog = await getCatalogData();
  const totalProducts = catalog.products.length;
  const totalCategories = new Set(catalog.products.flatMap((item) => item.categories)).size;
  const totalFeatured = catalog.products.filter((item) => item.featured).length;
  const totalBestSellers = catalog.products.filter((item) => item.bestSeller).length;

  return (
    <section className="container-shell py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">Painel administrativo</p>
          <h1 className="mt-1 text-3xl font-semibold">Da Fábrica</h1>
        </div>
        <div className="flex gap-3">
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-semibold transition hover:border-red-300 hover:text-red-600"
            >
              Sair
            </button>
          </form>
          <Link
            href="/admin/produtos/novo"
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
          >
            + Novo produto
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Produtos", value: totalProducts, color: "text-[var(--foreground)]" },
          { label: "Categorias ativas", value: totalCategories, color: "text-[var(--foreground)]" },
          { label: "Em destaque", value: totalFeatured, color: "text-amber-600" },
          { label: "Mais vendidos", value: totalBestSellers, color: "text-orange-600" },
        ].map((item) => (
          <article
            key={item.label}
            className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <p className="text-xs uppercase tracking-[0.15em] text-[var(--muted)]">{item.label}</p>
            <p className={`text-4xl font-semibold ${item.color}`}>{item.value}</p>
          </article>
        ))}
      </div>

      {/* Quick links */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/produtos"
          target="_blank"
          className="rounded-full border border-[var(--border)] px-4 py-2 text-xs font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Ver catálogo público ↗
        </Link>
        <Link
          href="/mais-vendidos"
          target="_blank"
          className="rounded-full border border-[var(--border)] px-4 py-2 text-xs font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Ver mais vendidos ↗
        </Link>
      </div>

      {/* Product table */}
      <div className="mt-8">
        <AdminProductsTable products={catalog.products} />
      </div>
    </section>
  );
}
