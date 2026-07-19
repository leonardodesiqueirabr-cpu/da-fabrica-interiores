"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types/catalog";
import { AdminDeleteButton } from "@/components/admin-delete-button";
import { AdminQuickEditModal } from "@/components/admin-quick-edit-modal";
import { AdminProductPreviewModal } from "@/components/admin-product-preview-modal";

interface AdminProductsTableProps {
  products: Product[];
}

export function AdminProductsTable({ products }: AdminProductsTableProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleQuickEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handlePreview = (product: Product) => {
    setPreviewProduct(product);
    setIsPreviewOpen(true);
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--muted)]">
              <th className="px-5 py-3 font-semibold">Imagem</th>
              <th className="px-5 py-3 font-semibold">Produto</th>
              <th className="px-5 py-3 font-semibold">Categorias</th>
              <th className="px-5 py-3 font-semibold">Preço base</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 font-semibold">Etiquetas</th>
              <th className="px-5 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const mainImage = product.images.find((img) => img.isMain) || product.images[0];
              return (
                <tr
                  key={product.id}
                  className="border-b border-[var(--border)]/60 transition last:border-b-0 hover:bg-[var(--surface-soft)]"
                >
                  {/* Image */}
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handlePreview(product)}
                      className="relative h-12 w-12 overflow-hidden rounded-lg bg-[var(--surface-soft)] hover:opacity-80 transition"
                    >
                      {mainImage && mainImage.url ? (
                        <Image
                          src={mainImage.url}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : null}
                    </button>
                  </td>

                  {/* Name */}
                  <td className="px-5 py-3 font-medium">
                    <button
                      onClick={() => handlePreview(product)}
                      className="text-[var(--foreground)] hover:opacity-70 transition"
                    >
                      {product.name}
                    </button>
                  </td>

                  {/* Categories */}
                  <td className="px-5 py-3 text-[var(--muted)]">{product.categories.join(", ") || "—"}</td>

                  {/* Price */}
                  <td className="px-5 py-3 tabular-nums text-[var(--muted)]">
                    {product.basePrice ? `€ ${product.basePrice.toFixed(0)}` : "Consultar"}
                  </td>

                  {/* Availability */}
                  <td className="px-5 py-3">
                    {product.available ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        Disponível
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                        Indisponível
                      </span>
                    )}
                  </td>

                  {/* Tags */}
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {product.featured && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Destaque
                        </span>
                      )}
                      {product.bestSeller && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                          Mais vendido
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleQuickEdit(product)}
                        className="text-xs font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
                      >
                        Edição Rápida
                      </button>
                      <Link
                        href={`/admin/produtos/${product.id}`}
                        className="text-xs font-semibold text-[var(--muted)] underline-offset-4 hover:underline hover:text-[var(--foreground)]"
                      >
                        Editar
                      </Link>
                      <AdminDeleteButton productId={product.id} productName={product.name} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quick Edit Modal */}
      {selectedProduct && (
        <AdminQuickEditModal
          product={selectedProduct}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Preview Modal */}
      <AdminProductPreviewModal
        product={previewProduct}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </>
  );
}
