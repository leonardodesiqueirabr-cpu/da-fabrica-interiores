import Image from "next/image";
import Link from "next/link";
import type { HomepageHeroSection } from "@/types/homepage";

interface HomeHeroSectionProps {
  content: HomepageHeroSection;
}

export function HomeHeroSection({ content }: HomeHeroSectionProps) {
  const isExternal = /^https?:\/\//i.test(content.ctaHref);

  return (
    <section className="relative min-h-[86svh] overflow-hidden md:min-h-[86vh]">
      {content.imageUrl ? (
        <Image src={content.imageUrl} alt={content.imageAlt || "Ambiente premium"} fill priority className="object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[var(--surface-soft)]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />

      <div className="container-shell relative z-10 flex min-h-[86svh] items-end pb-16 md:min-h-[86vh]">
        <div className="max-w-2xl space-y-6 text-white fade-up">
          <p className="text-xs uppercase tracking-[0.2em] text-white/80">{content.eyebrow}</p>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">{content.headline}</h1>
          <p className="max-w-xl text-sm leading-relaxed text-white/85 md:text-base">{content.description}</p>
          <Link
            href={content.ctaHref}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noreferrer" : undefined}
            className="inline-flex rounded-full bg-[var(--accent)] px-7 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[var(--accent-strong)]"
          >
            {content.ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

