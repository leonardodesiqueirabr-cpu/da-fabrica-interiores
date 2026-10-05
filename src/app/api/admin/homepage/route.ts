import { NextResponse } from "next/server";
import { homepageSectionUpdateSchema } from "@/lib/data/admin-schemas";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { requireAdminSession } from "@/lib/admin-session";

export async function PATCH(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase não configurado neste ambiente de deploy. Defina as variáveis do Supabase para usar o admin." },
      { status: 500 },
    );
  }

  const parsed = homepageSectionUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido.", issues: parsed.error.issues }, { status: 400 });
  }

  const { sectionKey, section } = parsed.data;

  const row = {
    section_key: sectionKey,
    image_url: section.imageUrl,
    image_alt: section.imageAlt,
    eyebrow: section.eyebrow,
    kicker: section.kicker || null,
    subheadline: section.subheadline || null,
    headline: section.headline,
    description: section.description,
    cta_label: section.ctaLabel,
    cta_href: section.ctaHref,
    image_managed: section.imageManaged,
  };

  const { error } = await supabase.from("homepage_sections").upsert(row, { onConflict: "section_key" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

