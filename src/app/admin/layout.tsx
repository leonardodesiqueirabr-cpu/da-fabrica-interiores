import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "@/lib/admin-auth";
import { getCatalogData } from "@/lib/data/catalog";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const isAuthenticated = isAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const { assets } = await getCatalogData();
  const logoSrc = assets.logoSecondary || assets.logoPrimary;

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f8] text-[#202124]">
      <header className="border-b border-[#e8e8eb] bg-white">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8 2xl:px-10">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            {logoSrc ? (
              <Image src={logoSrc} alt="Da Fábrica Interiores" width={128} height={128} className="h-[72px] w-[72px] shrink-0 object-contain sm:h-24 sm:w-24" priority />
            ) : (
              <span className="text-sm font-semibold tracking-tight">Da Fábrica</span>
            )}
            <span className="h-6 w-px shrink-0 bg-[#e5e5e8]" aria-hidden="true" />
            <span className="truncate text-sm font-medium text-[#44484f]">Administração</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-lg border border-[#e5e5e8] px-3.5 py-2 text-sm font-medium text-[#44484f] transition hover:border-[#f47b20] hover:text-[#d96512]"
            >
              Ver site
            </Link>
            {isAuthenticated ? (
              <form action="/api/admin/logout" method="post">
                <button
                  type="submit"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-[#777b82] transition hover:bg-[#f4f4f5] hover:text-[#202124]"
                >
                  Sair
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="mt-10 border-t border-[#ececef]">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col items-center gap-3 px-4 py-8 text-xs text-[#9a9da3] sm:px-6 lg:px-8 2xl:px-10">
          {logoSrc ? (
            <Image src={logoSrc} alt="Da Fábrica Interiores" width={120} height={120} className="h-24 w-24 object-contain" />
          ) : null}
          <p>© 2026 By DA FABRICA. Desenvolvido por VisualLine.</p>
        </div>
      </footer>
    </div>
  );
}
