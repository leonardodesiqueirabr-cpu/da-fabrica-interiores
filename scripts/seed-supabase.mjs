import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para semear o banco.");
}

const seedPath = path.join(process.cwd(), "src", "lib", "data", "local-seed.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  const { data: categories } = await supabase.from("categories").select("id, slug");
  const categoryBySlug = new Map((categories || []).map((item) => [item.slug, item.id]));

  for (const product of seed.products) {
    const { data: insertedProduct, error: upsertError } = await supabase
      .from("products")
      .upsert(
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          short_description: product.shortDescription,
          description: product.description,
          base_price: product.basePrice,
          featured: product.featured,
          best_seller: product.bestSeller,
          available: product.available,
          characteristics: product.characteristics,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (upsertError || !insertedProduct) {
      console.error(`Erro no produto ${product.name}:`, upsertError?.message);
      continue;
    }

    const productId = insertedProduct.id;

    await Promise.all([
      supabase.from("product_categories").delete().eq("product_id", productId),
      supabase.from("product_images").delete().eq("product_id", productId),
      supabase.from("product_options").delete().eq("product_id", productId),
      supabase.from("product_measurements").delete().eq("product_id", productId),
    ]);

    const categoryLinks = product.categories
      .map((slug) => categoryBySlug.get(slug))
      .filter(Boolean)
      .map((categoryId) => ({
        product_id: productId,
        category_id: categoryId,
      }));

    if (categoryLinks.length > 0) {
      await supabase.from("product_categories").insert(categoryLinks);
    }

    if (product.images.length > 0) {
      await supabase.from("product_images").insert(
        product.images.map((item, index) => ({
          product_id: productId,
          url: item.url,
          alt_text: item.alt,
          color_name: item.colorName || null,
          color_hex: item.colorHex || null,
          is_main: item.isMain,
          sort_order: item.sortOrder ?? index,
        })),
      );
    }

    if (product.measurements.length > 0) {
      await supabase.from("product_measurements").insert(
        product.measurements.map((item) => ({
          product_id: productId,
          measure_label: item.label,
          price: item.price,
          active: item.active,
        })),
      );
    }

    if (product.options.length > 0) {
      await supabase.from("product_options").insert(
        product.options.map((item) => ({
          product_id: productId,
          option_name: item.name,
          values: item.values,
        })),
      );
    }
  }

  console.log(`Seed concluido com ${seed.products.length} produtos.`);
}

run();
