import localSeed from "@/lib/data/local-seed.json";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toSlug } from "@/lib/utils/text";
import type { CatalogData, Product } from "@/types/catalog";

const categoryMap: Record<string, string> = {
  sofas: "Sofas",
  camas: "Camas",
  colchoes: "Colchoes",
  sala: "Sala",
  "mais-vendidos": "Mais Vendidos",
};

function mapCategory(name: string): string {
  const normalized = toSlug(name);
  if (normalized.includes("sofa")) return "sofas";
  if (normalized.includes("cama")) return "camas";
  if (normalized.includes("colch")) return "colchoes";
  if (normalized.includes("sala") || normalized.includes("estante")) return "sala";
  if (normalized.includes("mais-vendidos") || normalized.includes("mais-vendido")) return "mais-vendidos";
  return normalized;
}

function mapSupabaseToProduct(row: any): Product {
  const images = (row.product_images ?? []).map((item: any) => ({
    id: item.id,
    productId: row.id,
    url: item.url,
    alt: item.alt_text || row.name,
    colorName: item.color_name || undefined,
    colorHex: item.color_hex || undefined,
    isMain: item.is_main,
    sortOrder: item.sort_order,
  }));

  const options = (row.product_options ?? []).map((item: any) => ({
    id: item.id,
    productId: row.id,
    name: item.option_name,
    values: item.values || [],
  }));

  const measurements = (row.product_measurements ?? []).map((item: any) => ({
    id: item.id,
    productId: row.id,
    label: item.measure_label,
    price: item.price,
    active: item.active,
  }));

  const categories = (row.product_categories ?? []).map((item: any) => item.categories?.slug).filter(Boolean);

  const colors: string[] = Array.from(
    new Set(images.map((item: any) => item.colorName).filter((value: unknown): value is string => Boolean(value))),
  );

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description || "",
    description: row.description || "",
    basePrice: row.base_price,
    categories,
    featured: row.featured,
    bestSeller: row.best_seller,
    available: row.available,
    characteristics: row.characteristics || [],
    colors,
    images,
    measurements,
    options,
  };
}

function resolveHomeAssetUrl(baseName: string, fallback?: string) {
  const allowedExtensions = new Set([
    "png",
    "jpg",
    "jpeg",
    "webp",
    "gif",
    "avif",
    "svg",
    "bmp",
    "ico",
    "tif",
    "tiff",
  ]);

  const homeDir = path.join(process.cwd(), "public", "Home");

  try {
    const match = readdirSync(homeDir).find((entry) => {
      const parsed = path.parse(entry);
      return parsed.name === baseName && allowedExtensions.has(parsed.ext.slice(1).toLowerCase());
    });

    if (match) {
      return `/Home/${match}`;
    }
  } catch {
    // fall through to explicit candidates
  }

  const candidates = Array.from(allowedExtensions).map((ext) => `/Home/${baseName}.${ext}`);

  for (const assetPath of candidates) {
    const absolutePath = path.join(process.cwd(), "public", assetPath.replace(/^\//, ""));
    if (existsSync(absolutePath)) {
      return assetPath;
    }
  }

  return fallback;
}

function resolveProductImageUrl(assetUrl: string) {
  if (!assetUrl.startsWith("/")) {
    return assetUrl;
  }

  const [rawPathname, rawQuery = ""] = assetUrl.split("?");
  const decodedPathname = decodeURIComponent(rawPathname);
  const normalizedPathname = decodedPathname.normalize("NFC");
  const absolutePath = path.join(process.cwd(), "public", normalizedPathname.replace(/^\//, ""));

  if (existsSync(absolutePath)) {
    return rawQuery ? `${normalizedPathname}?${rawQuery}` : normalizedPathname;
  }

  const directoryPath = path.dirname(normalizedPathname);
  const targetFileName = path.basename(normalizedPathname);
  const directoryAbsolutePath = path.join(process.cwd(), "public", directoryPath.replace(/^\//, ""));

  let entries: string[] = [];

  try {
    entries = readdirSync(directoryAbsolutePath);
  } catch {
    return assetUrl;
  }

  const targetNfc = targetFileName.normalize("NFC").toLowerCase();
  const targetNfd = targetFileName.normalize("NFD").toLowerCase();

  const matchedEntry = entries.find((entry) => {
    const entryLower = entry.toLowerCase();
    return entryLower === targetFileName.toLowerCase() || entry.normalize("NFC").toLowerCase() === targetNfc || entry.normalize("NFD").toLowerCase() === targetNfd;
  });

  if (!matchedEntry) {
    return assetUrl;
  }

  const resolved = `${directoryPath}/${matchedEntry}`.replace(/\\/g, "/");
  return rawQuery ? `${resolved}?${rawQuery}` : resolved;
}

function withResolvedProductImageUrls(catalog: CatalogData): CatalogData {
  return {
    ...catalog,
    products: catalog.products.map((product) => ({
      ...product,
      images: product.images.map((image) => ({
        ...image,
        url: resolveProductImageUrl(image.url),
      })),
    })),
  };
}

function withResolvedHomeAssets(catalog: CatalogData): CatalogData {
  const catalogWithResolvedProductImages = withResolvedProductImageUrls(catalog);

  return {
    ...catalogWithResolvedProductImages,
    assets: {
      ...catalogWithResolvedProductImages.assets,
      logoPrimary: resolveHomeAssetUrl("logotipo-principal", catalogWithResolvedProductImages.assets.logoPrimary),
      logoSecondary: resolveHomeAssetUrl("logotipo-secundario", catalogWithResolvedProductImages.assets.logoSecondary),
      heroImage: resolveHomeAssetUrl("banner-inicial", catalogWithResolvedProductImages.assets.heroImage),
    },
  };
}

export const getCatalogData = cache(async function getCatalogData(): Promise<CatalogData> {
  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return withResolvedHomeAssets(localSeed as CatalogData);
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      slug,
      name,
      short_description,
      description,
      base_price,
      featured,
      best_seller,
      available,
      characteristics,
      product_images(id, url, alt_text, color_name, color_hex, is_main, sort_order),
      product_options(id, option_name, values),
      product_measurements(id, measure_label, price, active),
      product_categories(categories(slug))
      `,
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    return withResolvedHomeAssets(localSeed as CatalogData);
  }

  const products = data.map(mapSupabaseToProduct);
  const categories = Array.from(
    new Set(products.flatMap((product) => product.categories.map((name) => mapCategory(name)))),
  )
    .filter((slug) => slug !== "todos")
    .map((slug) => ({ slug: slug as any, label: categoryMap[slug] ?? slug }));

  return withResolvedHomeAssets({
    products,
    categories,
    assets: (localSeed as CatalogData).assets,
  });
});

export async function getProductBySlug(slug: string) {
  const catalog = await getCatalogData();
  return catalog.products.find((product) => product.slug === slug) ?? null;
}

export function filterProductsByCategory(products: Product[], categorySlug: string) {
  if (categorySlug === "todos") {
    return products;
  }

  if (categorySlug === "mais-vendidos") {
    return products.filter((product) => product.bestSeller || product.categories.includes("mais-vendidos"));
  }

  return products.filter((product) => product.categories.includes(categorySlug));
}

export function getFeaturedProducts(products: Product[]) {
  const featured = products.filter((product) => product.featured);
  const featuredBeds = featured.filter((product) => product.categories.includes("camas"));
  const featuredOthers = featured.filter((product) => !product.categories.includes("camas"));

  const prioritized = [...featuredBeds.slice(0, 4), ...featuredOthers, ...featuredBeds.slice(4)];
  const uniqueById = Array.from(new Map(prioritized.map((product) => [product.id, product])).values());

  return uniqueById.slice(0, 8);
}

export function getBestSellerProducts(products: Product[]) {
  return products.filter((product) => product.bestSeller).slice(0, 8);
}

export function getRecommendedProducts(products: Product[], currentProduct: Product, limit = 8) {
  const sameCategory = products.filter(
    (product) =>
      product.id !== currentProduct.id &&
      product.categories.some((category) => currentProduct.categories.includes(category)),
  );
  const bestSellers = products.filter((product) => product.id !== currentProduct.id && product.bestSeller);
  const featured = products.filter((product) => product.id !== currentProduct.id && product.featured);
  const allOthers = products.filter((product) => product.id !== currentProduct.id);

  const orderedCandidates = [...sameCategory, ...bestSellers, ...featured, ...allOthers];
  const seen = new Set<string>();
  const recommended: Product[] = [];

  for (const product of orderedCandidates) {
    if (seen.has(product.id)) {
      continue;
    }

    seen.add(product.id);
    recommended.push(product);

    if (recommended.length >= limit) {
      break;
    }
  }

  return recommended;
}
