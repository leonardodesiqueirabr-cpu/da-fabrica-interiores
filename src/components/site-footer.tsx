"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SiteFooterProps {
  logoSrc?: string;
}

export function SiteFooter({ logoSrc }: SiteFooterProps) {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  const withFrom = (href: string) => {
    if (!pathname || href === pathname) {
      return href;
    }

    return {
      pathname: href,
      query: { from: pathname },
    };
  };

  const institucionalLinks = [
    { href: "/", label: "Inicio" },
    { href: "/produtos", label: "Todos os produtos" },
    { href: "/mais-vendidos", label: "Mais vendidos" },
  ];

  const categoriasLinks = [
    { href: "/categorias/sofas", label: "Sofas" },
    { href: "/categorias/camas", label: "Camas" },
    { href: "/categorias/colchoes", label: "Colchoes" },
    { href: "/categorias/sala", label: "Sala" },
  ];

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="container-shell py-14">
        <div className="flex flex-col gap-5 border-b border-[var(--border)] pb-8 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt="DA Fabrica"
                width={220}
                height={92}
                className="h-auto w-[190px] max-w-full object-contain"
              />
            ) : null}
            <p className="max-w-xl text-sm leading-relaxed text-[var(--muted)]">
              Moveis e estofados para transformar o seu ambiente com conforto, estilo e atendimento personalizado.
            </p>
          </div>
        </div>

        <div className="grid gap-10 pt-8 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]">Institucional</h3>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              {institucionalLinks.map((item) => (
                <li key={item.href}>
                  <Link href={withFrom(item.href)} className="transition hover:text-[var(--foreground)]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]">Categorias</h3>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              {categoriasLinks.map((item) => (
                <li key={item.href}>
                  <Link href={withFrom(item.href)} className="transition hover:text-[var(--foreground)]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]">Atendimento</h3>
            <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
              <li>Segunda a Sabado: 09h as 19h</li>
              <li>Orcamentos e suporte via WhatsApp</li>
              <li>Entrega e montagem sob consulta</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--border)] pt-5">
          <div className="flex flex-col gap-3 text-xs text-[var(--muted)] md:flex-row md:items-center md:justify-between">
            <p>© 2026 By DA FABRICA. Desenvolvido por VisualLine.</p>
            <p>Pagamento facilitado e atendimento personalizado.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
