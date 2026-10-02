"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AdminDeleteButtonProps {
  productId: string;
  productName: string;
}

export function AdminDeleteButton({ productId, productName }: AdminDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Erro ao apagar");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao apagar");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="space-y-2 rounded-lg bg-red-50 p-3">
        <p className="text-xs leading-relaxed text-[#6d4141]">
          Apagar &ldquo;{productName}&rdquo;? Esta ação não pode ser anulada.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="text-xs font-semibold text-red-700 hover:text-red-900 disabled:opacity-60"
          >
            {loading ? "A apagar…" : "Confirmar"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="text-xs font-medium text-[#74777d] hover:text-[#34373c]"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
    >
      Apagar
    </button>
  );
}
