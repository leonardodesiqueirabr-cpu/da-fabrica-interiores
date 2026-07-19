"use client";

import { useState } from "react";
import type { Product } from "@/types/catalog";
import { ADMIN_CATEGORIES } from "@/lib/data/categories";

interface AdminQuickEditModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdminQuickEditModal({ product, isOpen, onClose, onSuccess }: AdminQuickEditModalProps) {
  const [name, setName] = useState(product.name);
  const [basePrice, setBasePrice] = useState(product.basePrice?.toString() || "");
  const [available, setAvailable] = useState(product.available);
  const [categories, setCategories] = useState<string[]>(product.categories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name,
        basePrice: basePrice ? Number(basePrice) : null,
        available,
        categories,
      };

      const response = await fetch(`/api/admin/products/${product.id}/quick-edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Erro ao salvar");

      onSuccess?.();
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-lg">
        {/* Header */}
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-lg font-semibold">Edição Rápida</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{product.name}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          {/* Name */}
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Nome do produto</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
          </label>

          {/* Price */}
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Preço base (€)</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">€</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </div>
          </label>

          {/* Availability */}
          <label className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 text-sm">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            <span className="font-medium">Disponível para compra</span>
          </label>

          {/* Categories */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Categorias</p>
            <div className="grid gap-2 grid-cols-2">
              {ADMIN_CATEGORIES.map((cat) => (
                <label
                  key={cat.slug}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition ${
                    categories.includes(cat.slug)
                      ? "border-[var(--accent)] bg-[var(--accent)]/5"
                      : "border-[var(--border)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={categories.includes(cat.slug)}
                    onChange={(e) =>
                      setCategories((prev) =>
                        e.target.checked ? [...prev, cat.slug] : prev.filter((c) => c !== cat.slug),
                      )
                    }
                    className="accent-[var(--accent)]"
                  />
                  {cat.label}
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-[var(--border)] py-2.5 text-sm font-semibold transition hover:border-[var(--border)]/60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-60"
            >
              {loading ? "A guardar…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
