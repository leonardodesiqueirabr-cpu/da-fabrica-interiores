import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminHomepageForm } from "@/components/admin-homepage-form";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "@/lib/admin-auth";
import { getPublishedCatalogData } from "@/lib/data/catalog";
import { getHomepageContent } from "@/lib/data/homepage";

export default async function AdminHomepagePage() {
  const cookieStore = await cookies();
  if (!isAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  const catalog = await getPublishedCatalogData();
  const homepageContent = await getHomepageContent(catalog);

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 2xl:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e7e7e9] pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#222428] sm:text-3xl">Homepage</h1>
          <p className="mt-1 text-sm text-[#777b82]">Edite rapidamente os conteúdos principais da página inicial.</p>
        </div>
        <Link
          href="/admin"
          className="inline-flex h-10 items-center rounded-lg border border-[#e5e5e8] bg-white px-3.5 text-sm font-medium text-[#44484f] transition hover:bg-[#f5f5f6]"
        >
          Produtos
        </Link>
      </div>

      <AdminHomepageForm initialContent={homepageContent} />
    </section>
  );
}

