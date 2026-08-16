"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Product } from "@/types/catalog";
import { encodeProductImageUrl } from "@/lib/utils/image-url";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const pathname = usePathname();
  const mainImage = product.images.find((item) => item.isMain) ?? product.images[0];
  const imageUrl = mainImage?.url ? encodeProductImageUrl(mainImage.url) : "";
  const productHref = pathname
    ? {
        pathname: `/produto/${product.slug}`,
        query: { from: pathname },
      }
    : `/produto/${product.slug}`;

  return (
    <article className="space-y-3">
      <Link href={productHref} className="block aspect-square overflow-hidden rounded-xl bg-[var(--surface-soft)]">
        {mainImage ? (
          <Image
            src={imageUrl}
            alt={mainImage.alt}
            width={1000}
            height={1000}
            unoptimized
            className="h-full w-full rounded-xl object-cover transition duration-700 hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-[var(--muted)]">Sem imagem</div>
        )}
      </Link>

      <div className="space-y-2 pb-2">
        <h3 className="text-xl font-medium tracking-tight">{product.name}</h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">{product.shortDescription || product.description}</p>
        <div className="flex items-center justify-between pt-2">
          <p className="text-base font-bold text-[var(--accent)]">
            {product.measurements.length > 0
              ? (() => {
                  const prices = product.measurements.map((m) => m.price).filter((p): p is number => p != null && p > 0);
                  const min = prices.length ? Math.min(...prices) : null;
                  return min ? `A partir de ${min.toFixed(0)} EUR` : (product.basePrice ? `${product.basePrice.toFixed(0)} EUR` : "Consultar Preço");
                })()
              : product.basePrice ? `${product.basePrice.toFixed(0)} EUR` : "Consultar Preço"}
          </p>
          <Link
            href={productHref}
            className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)] transition hover:opacity-70"
          >
            Ver detalhes
          </Link>
        </div>
      </div>
    </article>
  );
}
