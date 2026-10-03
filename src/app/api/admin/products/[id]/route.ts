import { NextResponse } from "next/server";
import { ADMIN_CATEGORIES } from "@/lib/data/categories";
import { productUpdateSchema } from "@/lib/data/admin-schemas";
import { syncProductWorkspace } from "@/lib/assets/product-workspaces";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { requireAdminSession } from "@/lib/admin-session";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  const supabase = getSupabaseServiceClient();
  const isReadOnlyRuntime = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  const { id } = await params;
  const parsed = productUpdateSchema.safeParse(await request.json());
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
        characteristics: payload.characteristics,
        ...(payload.isPublished !== undefined && { is_published: payload.isPublished }),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await Promise.all([
      supabase.from("product_categories").delete().eq("product_id", id),
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

    const { data: existingColorRows, error: existingColorsError } = await supabase
      .from("product_colors")
      .select("id")
      .eq("product_id", id);
    if (existingColorsError) {
      return NextResponse.json({ error: existingColorsError.message }, { status: 500 });
    }

    const existingColorIds = new Set((existingColorRows || []).map((row) => row.id));
    const colorIdMap = new Map<string, string>();
    const normalizedColors = payload.colors.map((color, index) => ({
      id: color.id || null,
      name: color.name.trim(),
      hex: color.hex || null,
      position: color.position ?? index,
    }));

    const colorUpdates = normalizedColors.filter((color) => color.id && existingColorIds.has(color.id));
    for (const color of colorUpdates) {
      const { error: updateColorError } = await supabase
        .from("product_colors")
        .update({
          name: color.name,
          hex: color.hex,
          position: color.position,
        })
        .eq("id", color.id!)
        .eq("product_id", id);

      if (updateColorError) {
        return NextResponse.json({ error: updateColorError.message }, { status: 500 });
      }
      colorIdMap.set(color.id!, color.id!);
    }

    const colorsToInsert = normalizedColors.filter((color) => !color.id || !existingColorIds.has(color.id));
    for (const color of colorsToInsert) {
      const { data: insertedColor, error: insertColorError } = await supabase
        .from("product_colors")
        .insert({
          product_id: id,
          name: color.name,
          hex: color.hex,
          position: color.position,
        })
        .select("id")
        .single();

      if (insertColorError || !insertedColor) {
        return NextResponse.json({ error: insertColorError?.message || "Erro ao inserir cor." }, { status: 500 });
      }

      if (color.id) {
        colorIdMap.set(color.id, insertedColor.id);
      }
      colorIdMap.set(insertedColor.id, insertedColor.id);
    }

    const payloadColorIds = new Set(
      normalizedColors
        .map((color) => (color.id ? colorIdMap.get(color.id) || color.id : null))
        .filter((colorId): colorId is string => Boolean(colorId)),
    );
    const removedColorIds = Array.from(existingColorIds).filter((colorId) => !payloadColorIds.has(colorId));

    if (removedColorIds.length > 0) {
      const { error: detachColorError } = await supabase
        .from("product_images")
        .update({ color_id: null })
        .in("color_id", removedColorIds)
        .eq("product_id", id);
      if (detachColorError) {
        return NextResponse.json({ error: detachColorError.message }, { status: 500 });
      }

      const { error: deleteColorError } = await supabase.from("product_colors").delete().in("id", removedColorIds).eq("product_id", id);
      if (deleteColorError) {
        return NextResponse.json({ error: deleteColorError.message }, { status: 500 });
      }
    }

    const colorsByResolvedId = new Map<string, { name: string; hex: string | null }>();
    for (const color of normalizedColors) {
      const resolvedId = color.id ? colorIdMap.get(color.id) || color.id : null;
      if (resolvedId) {
        colorsByResolvedId.set(resolvedId, { name: color.name, hex: color.hex });
      }
    }

    const { data: existingImageRows, error: existingImagesError } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", id);

    if (existingImagesError) {
      return NextResponse.json({ error: existingImagesError.message }, { status: 500 });
    }

    const existingImageIds = new Set((existingImageRows || []).map((row) => row.id));
    const normalizedImages = payload.images.map((item, index) => {
      const resolvedColorId = item.colorId ? colorIdMap.get(item.colorId) || (existingColorIds.has(item.colorId) ? item.colorId : null) : null;
      const mappedColor = resolvedColorId ? colorsByResolvedId.get(resolvedColorId) : null;
      return {
        id: item.id,
        url: item.url,
        alt_text: item.alt || payload.name,
        color_id: resolvedColorId,
        color_name: mappedColor?.name || item.colorName || null,
        color_hex: mappedColor?.hex || item.colorHex || null,
        is_main: item.isMain ?? index === 0,
        sort_order: item.sortOrder ?? index,
      };
    });

    const payloadImageIds = new Set(normalizedImages.map((item) => item.id).filter((item): item is string => Boolean(item)));

    const invalidImageIds = normalizedImages
      .map((item) => item.id)
      .filter((imageId): imageId is string => Boolean(imageId) && !existingImageIds.has(imageId));
    if (invalidImageIds.length > 0) {
      return NextResponse.json({ error: "Existem imagens inválidas no pedido de atualização." }, { status: 400 });
    }

    const imageUpdates = normalizedImages.filter(
      (item): item is Omit<(typeof normalizedImages)[number], "id"> & { id: string } => Boolean(item.id),
    );
    const imageInserts = normalizedImages
      .filter((item) => !item.id)
      .map((item) => ({
        product_id: id,
        url: item.url,
        alt_text: item.alt_text,
        color_id: item.color_id,
        color_name: item.color_name,
        color_hex: item.color_hex,
        is_main: item.is_main,
        sort_order: item.sort_order,
      }));

    const removedImageIds = Array.from(existingImageIds).filter((imageId) => !payloadImageIds.has(imageId));

    for (const image of imageUpdates) {
      const { error: updateImageError } = await supabase
        .from("product_images")
        .update({
          url: image.url,
          alt_text: image.alt_text,
          color_id: image.color_id,
          color_name: image.color_name,
          color_hex: image.color_hex,
          is_main: image.is_main,
          sort_order: image.sort_order,
        })
        .eq("id", image.id)
        .eq("product_id", id);

      if (updateImageError) {
        return NextResponse.json({ error: updateImageError.message }, { status: 500 });
      }
    }

    if (imageInserts.length > 0) {
      const { error: insertImageError } = await supabase.from("product_images").insert(imageInserts);
      if (insertImageError) {
        return NextResponse.json({ error: insertImageError.message }, { status: 500 });
      }
    }

    if (removedImageIds.length > 0) {
      const { error: deleteImageError } = await supabase.from("product_images").delete().in("id", removedImageIds).eq("product_id", id);
      if (deleteImageError) {
        return NextResponse.json({ error: deleteImageError.message }, { status: 500 });
      }
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

  if (!supabase && isReadOnlyRuntime) {
    return NextResponse.json(
      { error: "Supabase não configurado neste ambiente de deploy. Defina as variáveis do Supabase para usar o admin." },
      { status: 500 },
    );
  }

  // Em produção (Supabase ativo), o filesystem pode ser read-only.
  // Mantemos sincronização local apenas no fallback sem Supabase.
  if (!supabase) {
    try {
      await syncProductWorkspace(id, payload);
    } catch (workspaceError) {
      const message = workspaceError instanceof Error ? workspaceError.message : "Erro ao atualizar pasta do produto.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

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
