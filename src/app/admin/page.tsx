import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCatalogData } from "@/lib/data/catalog";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "@/lib/admin-auth";
import { AdminProductsTable } from "@/components/admin-products-table";
import { Eye, EyeOff, FilePenLine, Package, Star } from "lucide-react";

export default async function AdminPage() {
  const cookieStore = await cookies();
  if (!isAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  const catalog = await getCatalogData();
  const totalProducts = catalog.products.length;
  const totalPublished = catalog.products.filter((item) => item.isPublished).length;
  const totalHidden = totalProducts - totalPublished;
  const totalFeatured = catalog.products.filter((item) => item.featured).length;

  return (
    <section className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <h1 className="text-2xl font-semibold tracking-tight text-[#222428] sm:text-3xl">Produtos</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/homepage"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e5e5e8] bg-white px-4 text-sm font-medium text-[#44484f] transition hover:border-[#f2a064] hover:text-[#d96512]"
          >
            <FilePenLine size={16} />
            Editar Homepage
          </Link>
          <Link
            href="/admin/produtos/novo"
            className="inline-flex h-10 items-center rounded-lg bg-[#f47b20] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#dd6818]"
          >
            + Novo produto
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Produtos", value: totalProducts, icon: Package, iconClass: "bg-[#f4f4f5] text-[#666a71]" },
          { label: "Publicados", value: totalPublished, icon: Eye, iconClass: "bg-[#eaf5ee] text-[#39764e]" },
          { label: "Ocultos", value: totalHidden, icon: EyeOff, iconClass: "bg-[#f0f0f1] text-[#686c73]" },
          { label: "Em destaque", value: totalFeatured, icon: Star, iconClass: "bg-[#fff4e9] text-[#b95b17]" },
        ].map((item) => (
          <article
            key={item.label}
            className="flex items-center justify-between rounded-xl border border-[#e8e8eb] bg-white p-5 shadow-[0_2px_8px_rgba(20,20,25,0.025)]"
          >
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#858990]">{item.label}</p>
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-[#25272b]">{item.value}</p>
            </div>
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${item.iconClass}`}>
              <item.icon size={19} strokeWidth={1.8} />
            </span>
          </article>
        ))}
      </div>

      <div className="mt-7">
        <AdminProductsTable products={catalog.products} />
      </div>
    </section>
  );
}
