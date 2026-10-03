"use client";

import { useEffect } from "react";
import type { Product } from "@/types/catalog";
import { X } from "lucide-react";
import { ProductConfigurator } from "@/components/product-configurator";

interface AdminProductPreviewModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

export function AdminProductPreviewModal({ product, open, onClose }: AdminProductPreviewModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [open]);

  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/55 p-3 sm:p-5 lg:p-8" onClick={onClose}>
      <div
        className="relative mx-auto h-[90vh] w-[90vw] max-w-[1600px] overflow-hidden rounded-2xl bg-[var(--background)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-1.5 text-sm font-semibold text-[var(--foreground)] shadow-md transition hover:bg-white"
        >
          <X size={16} />
          Fechar
        </button>
        <div className="h-full overflow-y-auto overscroll-contain p-2 pt-11 sm:p-3 sm:pt-12">
          <div className="container-shell pb-6 pt-3 sm:pb-8 sm:pt-4">
            <ProductConfigurator product={product} />
          </div>
        </div>
      </div>
    </div>
  );
}
