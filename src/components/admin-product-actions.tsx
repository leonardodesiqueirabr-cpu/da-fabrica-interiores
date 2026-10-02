"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Eye, EyeOff, LoaderCircle, MoreHorizontal, Pencil } from "lucide-react";
import type { Product } from "@/types/catalog";
import { AdminDeleteButton } from "@/components/admin-delete-button";
import { AdminQuickEditModal } from "@/components/admin-quick-edit-modal";

interface AdminProductActionsProps {
  product: Product;
}

export function AdminProductActions({ product }: AdminProductActionsProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleVisibility() {
    setSavingVisibility(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/${product.id}/quick-edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !product.isPublished }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Não foi possível alterar a visibilidade.");
      }

      setMenuOpen(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Não foi possível alterar a visibilidade.");
    } finally {
      setSavingVisibility(false);
    }
  }

  const menuItemClass =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#3f4349] transition hover:bg-[#f5f5f6]";

  return (
    <>
      <div className="relative flex items-center justify-end gap-2">
        <Link
          href={`/admin/produtos/${product.id}`}
          className="rounded-lg bg-[#f47b20] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#dd6818]"
        >
          Editar
        </Link>
        <button
          type="button"
          aria-label={`Mais ações para ${product.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((open) => !open);
            setError(null);
          }}
          className="grid h-9 w-9 place-items-center rounded-lg border border-[#e7e7e9] text-[#656970] transition hover:bg-[#f5f5f6] hover:text-[#202124]"
        >
          <MoreHorizontal size={18} />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-11 z-20 w-56 rounded-xl border border-[#e8e8eb] bg-white p-1.5 shadow-[0_12px_40px_rgba(20,20,25,0.12)]"
          >
            <button
              type="button"
              role="menuitem"
              className={menuItemClass}
              onClick={() => {
                setMenuOpen(false);
                setQuickEditOpen(true);
              }}
            >
              <Pencil size={15} className="text-[#777b82]" />
              Edição rápida
            </button>
            <Link
              href={`/produto/${product.slug}`}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              className={menuItemClass}
              onClick={() => setMenuOpen(false)}
            >
              <ExternalLink size={15} className="text-[#777b82]" />
              Ver no site
            </Link>
            <button
              type="button"
              role="menuitem"
              disabled={savingVisibility}
              className={menuItemClass}
              onClick={toggleVisibility}
            >
              {savingVisibility ? (
                <LoaderCircle size={15} className="animate-spin text-[#777b82]" />
              ) : product.isPublished ? (
                <EyeOff size={15} className="text-[#777b82]" />
              ) : (
                <Eye size={15} className="text-[#777b82]" />
              )}
              {product.isPublished ? "Ocultar" : "Publicar"}
            </button>
            <div className="my-1 border-t border-[#eeeeef]" />
            <AdminDeleteButton productId={product.id} productName={product.name} />
            {error ? <p className="px-3 pb-2 pt-1 text-xs text-red-600">{error}</p> : null}
          </div>
        ) : null}
      </div>

      <AdminQuickEditModal
        key={product.id}
        product={product}
        isOpen={quickEditOpen}
        onClose={() => setQuickEditOpen(false)}
      />
    </>
  );
}
