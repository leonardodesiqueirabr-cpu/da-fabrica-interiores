"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Product } from "@/types/catalog";
import { ProductCard } from "./product-card";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductsCarouselProps {
  products: Product[];
  title?: string;
  description?: string;
  ctaText?: string;
  ctaHref?: string;
}

export function ProductsCarousel({ products }: ProductsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const renderedProducts = useMemo(() => {
    if (products.length <= 1) {
      return products;
    }

    return [...products, ...products, ...products];
  }, [products]);

  const jumpWithoutAnimation = (nextScrollLeft: number) => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const previousBehavior = container.style.scrollBehavior;
    container.style.scrollBehavior = "auto";
    container.scrollLeft = nextScrollLeft;
    container.style.scrollBehavior = previousBehavior || "smooth";
  };

  const centerInfiniteTrack = useCallback(() => {
    const container = scrollRef.current;
    if (!container || products.length <= 1) {
      return;
    }

    const segmentWidth = container.scrollWidth / 3;
    if (segmentWidth > 0) {
      jumpWithoutAnimation(segmentWidth);
    }
  }, [products.length]);

  useEffect(() => {
    if (products.length <= 1) {
      return;
    }

    requestAnimationFrame(() => {
      centerInfiniteTrack();
    });
  }, [centerInfiniteTrack, renderedProducts.length, products.length]);

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container || products.length <= 1) {
      return;
    }

    const segmentWidth = container.scrollWidth / 3;
    if (segmentWidth <= 0) {
      return;
    }

    const threshold = Math.max(48, container.clientWidth * 0.2);

    if (container.scrollLeft < segmentWidth - threshold) {
      jumpWithoutAnimation(container.scrollLeft + segmentWidth);
      return;
    }

    if (container.scrollLeft > segmentWidth * 2 - threshold) {
      jumpWithoutAnimation(container.scrollLeft - segmentWidth);
    }
  }, [products.length]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (container) {
      const firstCard = container.firstElementChild as HTMLElement | null;
      const cardWidth = firstCard?.getBoundingClientRect().width ?? container.clientWidth;
      const gap = 20;
      const scrollAmount = Math.max(cardWidth + gap, container.clientWidth * 0.85);
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative group">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-5 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollBehavior: "smooth" }}
      >
        {renderedProducts.map((product, index) => (
          <div key={`${product.id}-${index}`} className="flex-shrink-0 w-[62%] sm:w-[calc(50%_-_0.625rem)] lg:w-[calc(25%_-_0.9375rem)]">
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {products.length > 1 && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/3 z-10 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg hover:bg-[var(--surface)] transition opacity-0 group-hover:opacity-100 duration-200"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {products.length > 1 && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/3 z-10 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg hover:bg-[var(--surface)] transition opacity-0 group-hover:opacity-100 duration-200"
          aria-label="Próximo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
