import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildWhatsAppUrl } from "@/lib/utils/whatsapp";
import type { CatalogData } from "@/types/catalog";
import type { HomepageContent, HomepageHeroSection, HomepageSectionKey, HomepageSelectionSection } from "@/types/homepage";

const FALLBACK_HERO_TEXT = {
  eyebrow: "Os Mais Vendidos",
  headline: "Conforto e design para transformar a sua casa",
  description: "Móveis bonitos que duram anos sem problema. Conforto que sua família vai aproveitar todo dia, com o design que você gosta.",
  ctaLabel: "Explorar colecao",
  ctaHref: "/produtos?from=/",
  imageAlt: "Ambiente premium",
} as const;

const FALLBACK_SELECTION_TEXT = {
  eyebrow: "Viver bem",
  subheadline: "Menos excesso. Mais elegância.",
  kicker: "Seleção",
  headline: "A sala que você deseja começa com a escolha certa",
  description: "Escolha agora entre os modelos mais procurados — converse com a gente e encontre a peça perfeita pra sua casa em minutos.",
  ctaLabel: "Falar com especialista",
  imageAlt: "Ambiente decorado",
} as const;

function buildFallbackContent(catalog: CatalogData): HomepageContent {
  const whatsappPhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "351915783035";
  const selectionImage = catalog.products[1]?.images[0]?.url || catalog.assets.heroImage || "";

  return {
    hero: {
      sectionKey: "hero",
      imageUrl: catalog.assets.heroImage || "",
      imageAlt: FALLBACK_HERO_TEXT.imageAlt,
      eyebrow: FALLBACK_HERO_TEXT.eyebrow,
      headline: FALLBACK_HERO_TEXT.headline,
      description: FALLBACK_HERO_TEXT.description,
      ctaLabel: FALLBACK_HERO_TEXT.ctaLabel,
      ctaHref: FALLBACK_HERO_TEXT.ctaHref,
      imageManaged: false,
    },
    selection: {
      sectionKey: "selection",
      imageUrl: selectionImage,
      imageAlt: FALLBACK_SELECTION_TEXT.imageAlt,
      eyebrow: FALLBACK_SELECTION_TEXT.eyebrow,
      subheadline: FALLBACK_SELECTION_TEXT.subheadline,
      kicker: FALLBACK_SELECTION_TEXT.kicker,
      headline: FALLBACK_SELECTION_TEXT.headline,
      description: FALLBACK_SELECTION_TEXT.description,
      ctaLabel: FALLBACK_SELECTION_TEXT.ctaLabel,
      ctaHref: buildWhatsAppUrl(whatsappPhone, "Ola, quero uma recomendacao personalizada para a minha sala."),
      imageManaged: false,
    },
  };
}

function mergeHeroSection(fallback: HomepageHeroSection, row?: Record<string, unknown>): HomepageHeroSection {
  if (!row) return fallback;

  return {
    sectionKey: "hero",
    imageUrl: typeof row.image_url === "string" && row.image_url.trim() ? row.image_url : fallback.imageUrl,
    imageAlt: typeof row.image_alt === "string" && row.image_alt.trim() ? row.image_alt : fallback.imageAlt,
    eyebrow: typeof row.eyebrow === "string" && row.eyebrow.trim() ? row.eyebrow : fallback.eyebrow,
    headline: typeof row.headline === "string" && row.headline.trim() ? row.headline : fallback.headline,
    description: typeof row.description === "string" && row.description.trim() ? row.description : fallback.description,
    ctaLabel: typeof row.cta_label === "string" && row.cta_label.trim() ? row.cta_label : fallback.ctaLabel,
    ctaHref: typeof row.cta_href === "string" && row.cta_href.trim() ? row.cta_href : fallback.ctaHref,
    imageManaged: typeof row.image_managed === "boolean" ? row.image_managed : fallback.imageManaged,
  };
}

function mergeSelectionSection(
  fallback: HomepageSelectionSection,
  row?: Record<string, unknown>,
): HomepageSelectionSection {
  if (!row) return fallback;

  return {
    sectionKey: "selection",
    imageUrl: typeof row.image_url === "string" && row.image_url.trim() ? row.image_url : fallback.imageUrl,
    imageAlt: typeof row.image_alt === "string" && row.image_alt.trim() ? row.image_alt : fallback.imageAlt,
    eyebrow: typeof row.eyebrow === "string" && row.eyebrow.trim() ? row.eyebrow : fallback.eyebrow,
    subheadline: typeof row.subheadline === "string" && row.subheadline.trim() ? row.subheadline : fallback.subheadline,
    kicker: typeof row.kicker === "string" && row.kicker.trim() ? row.kicker : fallback.kicker,
    headline: typeof row.headline === "string" && row.headline.trim() ? row.headline : fallback.headline,
    description: typeof row.description === "string" && row.description.trim() ? row.description : fallback.description,
    ctaLabel: typeof row.cta_label === "string" && row.cta_label.trim() ? row.cta_label : fallback.ctaLabel,
    ctaHref: typeof row.cta_href === "string" && row.cta_href.trim() ? row.cta_href : fallback.ctaHref,
    imageManaged: typeof row.image_managed === "boolean" ? row.image_managed : fallback.imageManaged,
  };
}

function isHomepageSectionsMissing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message || "").toLowerCase();
  return error.code === "42P01" || error.code === "PGRST204" || message.includes("homepage_sections");
}

export async function getHomepageContent(catalog: CatalogData): Promise<HomepageContent> {
  const fallback = buildFallbackContent(catalog);
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return fallback;
  }

  const { data, error } = await supabase
    .from("homepage_sections")
    .select("section_key,image_url,image_alt,eyebrow,kicker,subheadline,headline,description,cta_label,cta_href,image_managed");

  if (error) {
    if (!isHomepageSectionsMissing(error)) {
      console.warn("[homepage] Falha ao carregar homepage_sections:", error.message);
    }
    return fallback;
  }

  const byKey = new Map<HomepageSectionKey, Record<string, unknown>>();
  for (const row of data || []) {
    const key = row.section_key === "hero" || row.section_key === "selection" ? row.section_key : null;
    if (key) {
      byKey.set(key, row);
    }
  }

  return {
    hero: mergeHeroSection(fallback.hero, byKey.get("hero")),
    selection: mergeSelectionSection(fallback.selection, byKey.get("selection")),
  };
}

