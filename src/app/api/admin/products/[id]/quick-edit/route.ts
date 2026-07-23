import { quickEditProductSchema } from "@/lib/data/admin-schemas";
import { ADMIN_CATEGORIES } from "@/lib/data/categories";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireAdminSession } from "@/lib/admin-session";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isReadOnlyRuntime = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  try {
    const payload = await request.json();

    // Validate payload
    const validatedPayload = quickEditProductSchema.parse(payload);

    const supabase = getSupabaseServiceClient();

    if (!supabase && isReadOnlyRuntime) {
      return Response.json(
        { error: "Supabase não configurado neste ambiente de deploy. Defina as variáveis do Supabase para usar o admin." },
        { status: 500 },
      );
    }

    // Em produção (Supabase ativo), atualizar no banco para evitar EROFS.
    if (supabase) {
      const { error: updateError } = await supabase
        .from("products")
        .update({
          name: validatedPayload.name,
          base_price: validatedPayload.basePrice,
          available: validatedPayload.available,
        })
        .eq("id", id);

      if (updateError) {
        return Response.json({ error: updateError.message }, { status: 500 });
      }

      await supabase.from("product_categories").delete().eq("product_id", id);

      const categoryRows = validatedPayload.categories
        .map((slug) => ADMIN_CATEGORIES.find((item) => item.slug === slug))
        .filter((item): item is (typeof ADMIN_CATEGORIES)[number] => Boolean(item));

      if (categoryRows.length > 0) {
        const { data: categoriesInDb, error: categoriesError } = await supabase
          .from("categories")
          .select("id, slug")
          .in(
            "slug",
            categoryRows.map((item) => item.slug),
          );

        if (categoriesError) {
          return Response.json({ error: categoriesError.message }, { status: 500 });
        }

        const linkRows = (categoriesInDb || []).map((cat) => ({
          product_id: id,
          category_id: cat.id,
        }));

        if (linkRows.length > 0) {
          const { error: linkError } = await supabase.from("product_categories").insert(linkRows);
          if (linkError) {
            return Response.json({ error: linkError.message }, { status: 500 });
          }
        }
      }

      return Response.json({ ok: true });
    }

    // Find the product slug from the id
    const foldersIndexPath = join(process.cwd(), "public", "produtos", ".folders-index.json");
    const foldersIndex = JSON.parse(readFileSync(foldersIndexPath, "utf-8")) as Record<string, string>;
    
    const slug = foldersIndex[id];
    if (!slug) {
      return Response.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    // Read the product JSON file
    const productJsonPath = join(process.cwd(), "public", "produtos", slug, "produto.json");
    const productFile = JSON.parse(readFileSync(productJsonPath, "utf-8")) as any;

    // Update only the editable fields in the data object
    productFile.data.name = validatedPayload.name;
    productFile.data.basePrice = validatedPayload.basePrice;
    productFile.data.available = validatedPayload.available;
    productFile.data.categories = validatedPayload.categories;
    
    // Also update top-level name
    productFile.name = validatedPayload.name;

    // Update timestamp
    productFile.updatedAt = new Date().toISOString();

    // Write back to file
    writeFileSync(productJsonPath, JSON.stringify(productFile, null, 2), "utf-8");

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Error in quick-edit:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Erro ao salvar" },
      { status: 400 }
    );
  }
}
