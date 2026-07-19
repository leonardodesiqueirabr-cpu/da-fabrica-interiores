import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ADMIN_CATEGORIES } from "@/lib/data/categories";
import { productPayloadSchema } from "@/lib/data/admin-schemas";
import { syncProductWorkspace } from "@/lib/assets/product-workspaces";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const supabase = getSupabaseServiceClient();

  const parsed = productPayloadSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalido.", issues: parsed.error.issues }, { status: 400 });
  }

  const payload = parsed.data;
  let productId: string;

  // Se Supabase está configurado, usar banco de dados
  if (supabase) {
    const { data: insertedProduct, error: insertError } = await supabase
      .from("products")
      .insert({
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
      .select("id")
      .single();

    if (insertError || !insertedProduct) {
      return NextResponse.json({ error: insertError?.message || "Erro ao criar produto." }, { status: 500 });
    }

    productId = insertedProduct.id;

    const categoryRows = payload.categories
      .map((slug) => ADMIN_CATEGORIES.find((item) => item.slug === slug))
      .filter((item): item is (typeof ADMIN_CATEGORIES)[number] => Boolean(item));

    if (categoryRows.length > 0) {
      const { data: categoriesInDb } = await supabase.from("categories").select("id, slug").in(
        "slug",
        categoryRows.map((item) => item.slug),
      );

      const linkRows = (categoriesInDb || []).map((cat) => ({
        product_id: insertedProduct.id,
        category_id: cat.id,
      }));

      if (linkRows.length > 0) {
        await supabase.from("product_categories").insert(linkRows);
      }
    }

    if (payload.images.length > 0) {
      await supabase.from("product_images").insert(
        payload.images.map((item, index) => ({
          product_id: insertedProduct.id,
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
          product_id: insertedProduct.id,
          option_name: item.name,
          values: item.values,
        })),
      );
    }

    if (payload.measurements.length > 0) {
      await supabase.from("product_measurements").insert(
        payload.measurements.map((item) => ({
          product_id: insertedProduct.id,
          measure_label: item.label,
          price: item.price,
          active: item.active,
        })),
      );
    }
  } else {
    // Supabase não configurado, usar fallback local
    productId = randomUUID();
  }

  // Sincronizar arquivo local (funciona com ou sem Supabase)
  try {
    await syncProductWorkspace(productId, payload);
  } catch (workspaceError) {
    const message = workspaceError instanceof Error ? workspaceError.message : "Erro ao criar pasta do produto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: productId });
}
