import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminProductForm } from "@/components/admin-product-form";
import { getCatalogData } from "@/lib/data/catalog";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const catalog = await getCatalogData();
  const product = catalog.products.find((item) => item.id === id);

  if (!product) {
    notFound();
  }

  return (
    <section className="container-shell py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Editar produto</h1>
        <Link href="/admin" className="text-sm text-[var(--muted)] underline-offset-4 hover:underline">
          Voltar
        </Link>
      </div>

      <AdminProductForm mode="edit" product={product} />
    </section>
  );
}
