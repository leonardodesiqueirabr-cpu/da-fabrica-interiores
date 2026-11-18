"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Produtos", match: (path: string) => path === "/admin" || path.startsWith("/admin/produtos") },
  { href: "/admin/homepage", label: "Homepage", match: (path: string) => path.startsWith("/admin/homepage") },
  { href: "/admin/estatisticas", label: "Estatísticas", match: (path: string) => path.startsWith("/admin/estatisticas") },
];

export function AdminNav() {
  const pathname = usePathname() || "";

  return (
    <nav aria-label="Secções do administrador" className="border-b border-[#e8e8eb] bg-white">
      <div className="mx-auto flex w-full max-w-[1600px] gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8 2xl:px-10">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
                active
                  ? "border-[#f47b20] text-[#202124]"
                  : "border-transparent text-[#777b82] hover:text-[#202124]"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
