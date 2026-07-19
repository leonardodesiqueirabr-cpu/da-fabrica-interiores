import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { toSlug } from "@/lib/utils/text";
import type { ProductPayload } from "@/lib/data/admin-schemas";

const PRODUCTS_ROOT = path.join(process.cwd(), "public", "produtos");
const INDEX_FILE = path.join(PRODUCTS_ROOT, ".folders-index.json");

interface ProductFolderIndex {
  [productId: string]: string;
}

async function ensureProductsRoot() {
  await mkdir(PRODUCTS_ROOT, { recursive: true });
}

async function readIndex(): Promise<ProductFolderIndex> {
  await ensureProductsRoot();

  try {
    const content = await readFile(INDEX_FILE, "utf-8");
    const parsed = JSON.parse(content) as ProductFolderIndex;
    return parsed;
  } catch {
    return {};
  }
}

async function writeIndex(index: ProductFolderIndex) {
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2), "utf-8");
}

function getFolderFromName(name: string) {
  const folder = toSlug(name).trim();
  return folder || "produto-sem-nome";
}

function getUniqueFolderName(desiredFolder: string, index: ProductFolderIndex, productId: string) {
  const used = new Set(Object.values(index));

  if (!used.has(desiredFolder)) {
    return desiredFolder;
  }

  const shortId = productId.slice(0, 8);
  const withId = `${desiredFolder}-${shortId}`;

  if (!used.has(withId)) {
    return withId;
  }

  let counter = 2;
  while (used.has(`${withId}-${counter}`)) {
    counter += 1;
  }

  return `${withId}-${counter}`;
}

async function writeProductSnapshot(folderName: string, productId: string, payload: ProductPayload) {
  const productDir = path.join(PRODUCTS_ROOT, folderName);
  await mkdir(productDir, { recursive: true });

  const snapshot = {
    productId,
    name: payload.name,
    slug: payload.slug,
    updatedAt: new Date().toISOString(),
    data: payload,
  };

  await writeFile(path.join(productDir, "produto.json"), JSON.stringify(snapshot, null, 2), "utf-8");
}

async function folderExists(folderName: string) {
  try {
    await stat(path.join(PRODUCTS_ROOT, folderName));
    return true;
  } catch {
    return false;
  }
}

export async function syncProductWorkspace(productId: string, payload: ProductPayload) {
  const index = await readIndex();
  const existingFolder = index[productId];
  const desiredFolder = getFolderFromName(payload.name);

  if (!existingFolder) {
    const folderName = getUniqueFolderName(desiredFolder, index, productId);
    index[productId] = folderName;
    await writeIndex(index);
    await writeProductSnapshot(folderName, productId, payload);
    return;
  }

  let targetFolder = existingFolder;

  if (existingFolder !== desiredFolder) {
    const withoutCurrent = { ...index };
    delete withoutCurrent[productId];

    targetFolder = getUniqueFolderName(desiredFolder, withoutCurrent, productId);
    const oldPath = path.join(PRODUCTS_ROOT, existingFolder);
    const newPath = path.join(PRODUCTS_ROOT, targetFolder);

    if (await folderExists(existingFolder)) {
      await rename(oldPath, newPath);
    }

    index[productId] = targetFolder;
    await writeIndex(index);
  }

  await writeProductSnapshot(targetFolder, productId, payload);
}
