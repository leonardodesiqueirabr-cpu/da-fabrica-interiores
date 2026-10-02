import { notFound } from "next/navigation";
import { AdminProductForm } from "@/components/admin-product-form";
import { AdminEditPageHeader } from "@/components/admin-edit-page-header";
import { getCatalogData } from "@/lib/data/catalog";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const catalog = await getCatalogData();
  const product = catalog.products.find((item) => item.id === id);

  if (!product) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 2xl:px-10">
      <AdminEditPageHeader product={product} />
      <div className="mt-6 sm:mt-7">
        <AdminProductForm mode="edit" product={product} />
      </div>
    </section>
  );
}
