"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/types/catalog";

interface AdminProductPreviewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AdminProductPreviewModal({ product, isOpen, onClose }: AdminProductPreviewModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!isOpen || !product) return null;

  const currentImage = product.images[currentImageIndex] || product.images[0];

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold">Resumo do Produto</h2>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto px-3 py-5 space-y-6">
          {/* Product Image - Square with Navigation */}
          {currentImage && currentImage.url && (
            <div className="space-y-3">
              <div className="relative h-72 w-96 mx-auto overflow-hidden rounded-lg bg-[var(--surface-soft)]">
                <Image
                  src={currentImage.url}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Image Navigation */}
              {product.images.length > 1 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={handlePrevImage}
                    className="rounded-lg bg-[var(--surface-soft)] p-2 text-[var(--foreground)] hover:bg-[var(--border)] transition"
                  >
                    ←
                  </button>
                  <span className="text-xs text-[var(--muted)]">
                    {currentImageIndex + 1} / {product.images.length}
                  </span>
                  <button
                    onClick={handleNextImage}
                    className="rounded-lg bg-[var(--surface-soft)] p-2 text-[var(--foreground)] hover:bg-[var(--border)] transition"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Product Name */}
          <div>
            <h3 className="text-lg font-semibold">{product.name}</h3>
          </div>

          {/* Price */}
          <div>
            <p className="text-sm text-[var(--muted)]">Preço Base</p>
            <p className="text-lg font-semibold text-[var(--accent)]">
              {product.basePrice ? `€ ${product.basePrice.toFixed(2)}` : "Consultar"}
            </p>
          </div>

          {/* Categories */}
          {product.categories.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-[var(--muted)]">Categorias</p>
              <div className="flex flex-wrap gap-2">
                {product.categories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-medium text-[var(--foreground)]"
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <p className="mb-2 text-sm text-[var(--muted)]">Estado</p>
            <div className="flex gap-2">
              {product.available ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Disponível
                </span>
              ) : (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                  Indisponível
                </span>
              )}
              {product.featured && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  Destaque
                </span>
              )}
              {product.bestSeller && (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  Mais vendido
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div>
              <p className="mb-2 text-sm text-[var(--muted)]">Descrição</p>
              <p className="text-sm leading-relaxed text-[var(--foreground)]">{product.description}</p>
            </div>
          )}

          {/* Colors */}
          {product.colors.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-[var(--muted)]">Cores</p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <span key={color} className="text-xs px-2 py-1 rounded bg-[var(--surface-soft)]">
                    {color}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Images count */}
          {product.images.length > 1 && (
            <div>
              <p className="text-sm text-[var(--muted)]">
                {product.images.length} imagens disponíveis
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-center text-sm font-semibold text-white hover:bg-[var(--accent)]/90"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
