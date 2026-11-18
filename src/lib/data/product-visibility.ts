import type { Product, ProductImage } from "@/types/catalog";

function bySortOrder(a: ProductImage, b: ProductImage) {
  return (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER);
}

/**
 * Versão pública de um produto (site e pré-visualização do admin):
 * - remove imagens ocultas;
 * - se a principal estiver oculta, a primeira imagem visível passa a capa;
 * - retira do seletor as cores cujas imagens associadas estão todas ocultas
 *   (cores sem nenhuma imagem associada mantêm-se).
 * Os dados guardados não são alterados.
 */
export function toPublicProduct(product: Product): Product {
  const hasHidden = product.images.some((image) => image.isHidden);
  if (!hasHidden) return product;

  const visibleImages = product.images.filter((image) => !image.isHidden).sort(bySortOrder);
  const mainId = (visibleImages.find((image) => image.isMain) ?? visibleImages[0])?.id;
  const images = visibleImages.map((image) => ({ ...image, isMain: image.id === mainId }));

  const colorIdsWithImages = new Set(product.images.map((image) => image.colorId).filter(Boolean));
  const colorIdsWithVisibleImages = new Set(images.map((image) => image.colorId).filter(Boolean));
  const colors = product.colors.filter(
    (color) => !colorIdsWithImages.has(color.id) || colorIdsWithVisibleImages.has(color.id),
  );

  return { ...product, images, colors };
}

/** Capa pública: principal visível, ou a primeira imagem visível. */
export function getCoverImage(product: Product): ProductImage | undefined {
  const visible = product.images.filter((image) => !image.isHidden);
  return visible.find((image) => image.isMain) ?? [...visible].sort(bySortOrder)[0];
}
