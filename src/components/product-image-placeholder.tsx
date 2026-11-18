import { ImageOff } from "lucide-react";

/** Mostrado quando um produto não tem nenhuma imagem visível. */
export function ProductImagePlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="Imagem indisponível"
      className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--surface-soft)] text-[var(--muted)] ${className}`}
    >
      <ImageOff className="size-7 opacity-60" strokeWidth={1.5} aria-hidden="true" />
      <span className="text-xs uppercase tracking-[0.14em]">Imagem indisponível</span>
    </div>
  );
}

export function SoldOutBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-[var(--border)] bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--foreground)] ${className}`}
    >
      Esgotado
    </span>
  );
}
