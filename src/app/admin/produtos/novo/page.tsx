import Link from "next/link";
import { AdminProductForm } from "@/components/admin-product-form";

export default function NewProductPage() {
  return (
    <section className="container-shell py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Novo produto</h1>
        <Link href="/admin" className="text-sm text-[var(--muted)] underline-offset-4 hover:underline">
          Voltar
        </Link>
      </div>

      <AdminProductForm mode="create" />
    </section>
  );
}
