import Image from "next/image";
import Link from "next/link";
import type { HomepageSelectionSection } from "@/types/homepage";

interface HomeSelectionSectionProps {
  content: HomepageSelectionSection;
}

export function HomeSelectionSection({ content }: HomeSelectionSectionProps) {
  const isExternal = /^https?:\/\//i.test(content.ctaHref);

  return (
    <section className="section-gap grid gap-6 lg:grid-cols-2">
      <div className="relative min-h-[520px] overflow-hidden bg-[var(--surface-soft)]">
        {content.imageUrl ? <Image src={content.imageUrl} alt={content.imageAlt || "Ambiente decorado"} fill className="object-cover" /> : null}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-8 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-white/80">{content.eyebrow}</p>
          <h3 className="mt-3 text-2xl font-semibold">{content.subheadline}</h3>
        </div>
      </div>
      <div className="container-shell flex items-center">
        <div className="max-w-xl space-y-5 py-12">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{content.kicker}</p>
          <h2 className="text-4xl font-semibold">{content.headline}</h2>
          <p className="text-sm leading-relaxed text-[var(--muted)]">{content.description}</p>
          <Link
            href={content.ctaHref}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noreferrer" : undefined}
            className="inline-flex rounded-full bg-[var(--accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--accent-strong)]"
          >
            {content.ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

