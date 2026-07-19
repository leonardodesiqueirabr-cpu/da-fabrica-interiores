"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

interface SiteHeaderProps {
  logoSrc?: string;
  showAdminButton?: boolean;
}

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/categorias/sofas", label: "Sofas" },
  { href: "/categorias/camas", label: "Camas" },
  { href: "/categorias/colchoes", label: "Colchoes" },
  { href: "/categorias/sala", label: "Sala" },
  { href: "/produtos", label: "Todos os Produtos" },
];

export function SiteHeader({ logoSrc, showAdminButton = false }: SiteHeaderProps) {
  const pathname = usePathname();
  const [isHidden, setIsHidden] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const lastScrollY = useRef(0);

  const withFrom = (href: string) => {
    if (!pathname || href === pathname) {
      return href;
    }

    return {
      pathname: href,
      query: { from: pathname },
    };
  };

  useEffect(() => {
    const onScroll = () => {
      if (isMenuOpen) {
        return;
      }

      const currentScrollY = window.scrollY;
      const difference = currentScrollY - lastScrollY.current;

      if (Math.abs(difference) < 4) {
        return;
      }

      if (difference > 0 && currentScrollY > 120) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 bg-[var(--accent)] transition-transform duration-300 ${isHidden ? "-translate-y-full" : "translate-y-0"}`}
    >
      <div className="container-shell flex h-24 items-center">
        <Link href="/" className="flex items-center gap-3">
          {logoSrc ? (
            <Image src={logoSrc} alt="DA Fabrica" width={204} height={82} className="h-[4.5rem] w-auto object-contain" />
          ) : (
            <span className="text-xl font-semibold tracking-tight text-white">DA Fabrica</span>
          )}
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <nav className="hidden items-center gap-6 text-sm text-white lg:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={withFrom(item.href)} className="transition hover:opacity-70">
                {item.label}
              </Link>
            ))}
          </nav>

          {showAdminButton ? (
            <Link
              href="/admin"
              className="hidden rounded-full border border-white/60 px-4 py-2 text-xs font-medium uppercase tracking-wide text-white transition hover:bg-white/20 sm:inline-flex"
            >
              Admin
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => setIsMenuOpen((old) => !old)}
            className="inline-flex items-center justify-center rounded-full border border-white/60 p-2 text-white transition hover:bg-white/20 lg:hidden"
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="absolute inset-x-0 top-full z-50 border-t border-white/20 bg-[var(--accent)] shadow-xl lg:hidden">
          <nav className="container-shell flex flex-col py-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={withFrom(item.href)}
                onClick={() => setIsMenuOpen(false)}
                className="border-b border-white/15 py-3 text-sm font-medium uppercase tracking-wide text-white last:border-b-0"
              >
                {item.label}
              </Link>
            ))}

            {showAdminButton ? (
              <Link
                href="/admin"
                onClick={() => setIsMenuOpen(false)}
                className="mt-3 inline-flex w-fit rounded-full border border-white/60 px-4 py-2 text-xs font-medium uppercase tracking-wide text-white"
              >
                Admin
              </Link>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
}
