import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import slugify from "slugify";

const rootDir = process.cwd();
const csvPath = path.join(rootDir, "catalog_products.csv");
const sourceAssetsDir = path.join(rootDir, "public", "source-assets");
const outputPath = path.join(rootDir, "src", "lib", "data", "local-seed.json");

const imageExt = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const categoryAlias = [
  { match: ["sofa"], slug: "sofas", label: "Sofas" },
  { match: ["cama"], slug: "camas", label: "Camas" },
  { match: ["colch"], slug: "colchoes", label: "Colchoes" },
  { match: ["sala", "estante"], slug: "sala", label: "Sala" },
  { match: ["mais-vendidos", "mais vendidos"], slug: "mais-vendidos", label: "Mais Vendidos" },
];

const knownColors = [
  "bege",
  "cinza",
  "cinza claro",
  "cinza escuro",
  "preto",
  "branco",
  "azul",
  "caramelo",
  "castanho",
  "camel",
  "vermelho",
];

function normalize(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSlug(value = "") {
  return slugify(value, { lower: true, strict: true, locale: "pt", trim: true });
}

function stripHtml(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function findCategory(raw = "") {
  const normalized = normalize(raw);
  for (const item of categoryAlias) {
    if (item.match.some((part) => normalized.includes(part))) {
      return item;
    }
  }
  return { slug: toSlug(raw || "geral"), label: raw || "Geral" };
}

function parseColorOptions(row) {
  const entries = [];
  const keys = Object.keys(row);

  for (const key of keys) {
    if (!key.startsWith("productOptionDescription")) continue;
    const maybeValue = row[key];
    const typeKey = key.replace("Description", "Type");
    if (row[typeKey] !== "COLOR" || !maybeValue) continue;

    for (const part of maybeValue.split(";")) {
      const [, color] = part.split(":");
      if (color) entries.push(color.trim());
    }
  }

  return Array.from(new Set(entries));
}

function parseDropdownOptions(row) {
  const entries = [];
  const keys = Object.keys(row);

  for (const key of keys) {
    if (!key.startsWith("productOptionDescription")) continue;
    const maybeValue = row[key];
    const typeKey = key.replace("Description", "Type");
    const nameKey = key.replace("Description", "Name");

    if (!maybeValue || row[typeKey] !== "DROP_DOWN") continue;

    entries.push({
      id: `${toSlug(row.handleId)}-${toSlug(row[nameKey] || "opcao")}`,
      productId: row.handleId,
      name: row[nameKey] || "Opcao",
      values: maybeValue
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  }

  return entries;
}

function parseCharacteristics(row) {
  const raw = row.additionalInfoDescription1 || "";
  return raw
    .replace(/<\/?ul>/g, "")
    .split("</li>")
    .map((item) => stripHtml(item))
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function parseMeasurements(variants, productId, basePrice) {
  if (!variants.length) {
    return [];
  }

  return variants
    .map((variant, index) => ({
      id: `${productId}-measure-${index + 1}`,
      productId,
      label: variant.productOptionDescription1 || variant.productOptionDescription2 || "Medida",
      price: Number.isFinite(Number(variant.price)) ? Number(variant.price) : basePrice,
      active: variant.visible !== "false",
    }))
    .filter((item) => item.label && item.label !== "Medida");
}

function detectColorFromFilename(filename) {
  const normalized = normalize(filename);
  const sorted = [...knownColors].sort((a, b) => b.length - a.length);
  return sorted.find((color) => normalized.includes(normalize(color)));
}

if (!fs.existsSync(csvPath)) {
  throw new Error("catalog_products.csv nao encontrado na raiz do projeto.");
}

if (!fs.existsSync(sourceAssetsDir)) {
  fs.mkdirSync(sourceAssetsDir, { recursive: true });
}

const allRootFiles = fs.readdirSync(rootDir);
const localImages = allRootFiles.filter((file) => imageExt.has(path.extname(file).toLowerCase()));

const csvContent = fs.readFileSync(csvPath, "utf8");
const rows = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  bom: true,
});

const productRows = rows.filter((row) => row.fieldType === "Product");

const products = [];
const categoriesSet = new Map();

for (const row of productRows) {
  const productId = row.handleId;
  const name = row.name?.trim();
  if (!name) continue;

  const normalizedName = normalize(name);
  const slug = toSlug(name);
  const basePrice = Number.isFinite(Number(row.price)) ? Number(row.price) : null;

  const relatedVariants = rows.filter(
    (candidate) => candidate.fieldType === "Variant" && candidate.handleId === productId,
  );

  const csvCategories = (row.collection || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(findCategory);

  for (const item of csvCategories) {
    categoriesSet.set(item.slug, { slug: item.slug, label: item.label });
  }

  const matchedFiles = localImages.filter((file) => {
    const nFile = normalize(path.parse(file).name);
    return nFile.includes(normalizedName) || normalizedName.includes(nFile);
  });

  const images = matchedFiles.map((file, index) => {
    const ext = path.extname(file).toLowerCase();
    const sanitized = `${slug}-${index + 1}${ext}`;
    const src = path.join(rootDir, file);
    const destination = path.join(sourceAssetsDir, sanitized);

    if (!fs.existsSync(destination)) {
      fs.copyFileSync(src, destination);
    }

    const colorName = detectColorFromFilename(file);

    return {
      id: `${productId}-img-${index + 1}`,
      productId,
      url: `/source-assets/${sanitized}`,
      alt: name,
      colorName,
      isMain: index === 0,
      sortOrder: index,
    };
  });

  const colorValues = Array.from(new Set([...parseColorOptions(row), ...images.map((img) => img.colorName).filter(Boolean)]));
  const categories = Array.from(new Set(csvCategories.map((item) => item.slug)));

  const bestSeller = categories.includes("mais-vendidos") || normalize(row.collection).includes("mais vendidos");
  const featured = normalize(row.collection).includes("novidades") || bestSeller;

  products.push({
    id: productId,
    slug,
    name,
    shortDescription: stripHtml(row.description || "").slice(0, 180),
    description: stripHtml(row.description || ""),
    basePrice,
    categories,
    featured,
    bestSeller,
    available: row.visible !== "false",
    characteristics: parseCharacteristics(row),
    colors: colorValues,
    images,
    measurements: parseMeasurements(relatedVariants, productId, basePrice),
    options: parseDropdownOptions(row),
  });
}

const logoPrimaryRaw = localImages.find((item) => normalize(item).includes("da fabrica"));
const logoSecondaryRaw = localImages.find((item) => item.includes("491844853_"));
const heroRaw = localImages.find((item) => normalize(item).includes("banner"));

const assets = {};

for (const [key, sourceFile] of [
  ["logoPrimary", logoPrimaryRaw],
  ["logoSecondary", logoSecondaryRaw],
  ["heroImage", heroRaw],
]) {
  if (!sourceFile) continue;
  const ext = path.extname(sourceFile).toLowerCase();
  const filename = `${key}${ext}`;
  const src = path.join(rootDir, sourceFile);
  const destination = path.join(sourceAssetsDir, filename);

  if (!fs.existsSync(destination)) {
    fs.copyFileSync(src, destination);
  }

  assets[key] = `/source-assets/${filename}`;
}

const output = {
  products,
  categories: Array.from(categoriesSet.values()),
  assets,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");

console.log(`Seed local gerado com ${products.length} produtos em ${outputPath}`);
