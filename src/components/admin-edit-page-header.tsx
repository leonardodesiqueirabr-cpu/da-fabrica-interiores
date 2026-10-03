"use client";

import Link from "next/link";
import { ArrowLeft, Eye, Save } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/types/catalog";
import { AdminProductPreviewModal } from "@/components/admin-product-preview-modal";

interface AdminEditPageHeaderProps {
  product: Product;
}

export function AdminEditPageHeader({ product }: AdminEditPageHeaderProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-[#e7e7e9] pb-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.13em] text-[#888c92]">Catálogo de produtos</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#222428] sm:text-3xl">Editar produto</h1>
          <p className="mt-1 truncate text-sm text-[#777b82]">{product.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            form="admin-product-form"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f47b20] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#dd6818]"
          >
            <Save size={16} />
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e5e5e8] bg-white px-3.5 text-sm font-medium text-[#44484f] transition hover:border-[#f2a064] hover:text-[#d96512]"
          >
            <Eye size={16} />
            Pré-visualizar
          </button>
          <Link
            href="/admin"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e5e5e8] bg-white px-3.5 text-sm font-medium text-[#44484f] transition hover:bg-[#f5f5f6]"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </div>
      </div>
      <AdminProductPreviewModal product={product} open={previewOpen} onClose={() => setPreviewOpen(false)} />
    </>
  );
}
