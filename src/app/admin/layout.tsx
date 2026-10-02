import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "@/lib/admin-auth";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const isAuthenticated = isAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-[#202124]">
      <header className="border-b border-[#e8e8eb] bg-white">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8 2xl:px-10">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f47b20] text-sm font-bold text-white">
              DF
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight">Da Fábrica</span>
              <span className="block text-xs text-[#777b82]">Administração</span>
            </span>
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
      {children}
    </div>
  );
}
