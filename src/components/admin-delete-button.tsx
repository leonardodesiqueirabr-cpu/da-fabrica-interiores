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
      <span className="inline-flex items-center gap-2 text-xs">
        <span className="text-[var(--muted)]">Apagar &ldquo;{productName}&rdquo;?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="font-semibold text-red-600 hover:text-red-800 disabled:opacity-60"
        >
          {loading ? "A apagar…" : "Confirmar"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-red-500 hover:text-red-700 transition"
    >
      Apagar
    </button>
  );
}
