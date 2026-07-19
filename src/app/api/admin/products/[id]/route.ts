import { nextTick } from "node:process";
import { rmdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { ADMIN_CATEGORIES } from "@/lib/data/categories";
import { productPayloadSchema } from "@/lib/data/admin-schemas";
import { syncProductWorkspace } from "@/lib/assets/product-workspaces";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabaseServiceClient();

  const { id } = await params;
  const parsed = productPayloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido.", issues: parsed.error.issues }, { status: 400 });
  }

  const payload = parsed.data;

  // Se Supabase está configurado, usar banco de dados
  if (supabase) {
    const { error: updateError } = await supabase
      .from("products")
      .update({
        name: payload.name,
        slug: payload.slug,
        short_description: payload.shortDescription,
        description: payload.description,
        base_price: payload.basePrice,
        featured: payload.featured,
        best_seller: payload.bestSeller,
        available: payload.available,
        characteristics: payload.characteristics,
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await Promise.all([
      supabase.from("product_categories").delete().eq("product_id", id),
      supabase.from("product_images").delete().eq("product_id", id),
      supabase.from("product_options").delete().eq("product_id", id),
      supabase.from("product_measurements").delete().eq("product_id", id),
    ]);

    const categoryRows = payload.categories
      .map((slug) => ADMIN_CATEGORIES.find((item) => item.slug === slug))
      .filter((item): item is (typeof ADMIN_CATEGORIES)[number] => Boolean(item));

    if (categoryRows.length > 0) {
      const { data: categoriesInDb } = await supabase.from("categories").select("id, slug").in(
        "slug",
        categoryRows.map((item) => item.slug),
      );

      const linkRows = (categoriesInDb || []).map((cat) => ({
        product_id: id,
        category_id: cat.id,
      }));

      if (linkRows.length > 0) {
        await supabase.from("product_categories").insert(linkRows);
      }
    }

    if (payload.images.length > 0) {
      await supabase.from("product_images").insert(
        payload.images.map((item, index) => ({
          product_id: id,
          url: item.url,
          alt_text: item.alt || payload.name,
          color_name: item.colorName || null,
          color_hex: item.colorHex || null,
          is_main: item.isMain ?? index === 0,
          sort_order: item.sortOrder ?? index,
        })),
      );
    }

    if (payload.options.length > 0) {
      await supabase.from("product_options").insert(
        payload.options.map((item) => ({
          product_id: id,
          option_name: item.name,
          values: item.values,
        })),
      );
    }

    if (payload.measurements.length > 0) {
      await supabase.from("product_measurements").insert(
        payload.measurements.map((item) => ({
          product_id: id,
          measure_label: item.label,
          price: item.price,
          active: item.active,
        })),
      );
    }
  }

  // Sincronizar arquivo local (funciona com ou sem Supabase)
  try {
    await syncProductWorkspace(id, payload);
  } catch (workspaceError) {
    const message = workspaceError instanceof Error ? workspaceError.message : "Erro ao atualizar pasta do produto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = getSupabaseServiceClient();
  const { id } = await params;

  // Se Supabase está configurado, usar banco de dados
  if (supabase) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
