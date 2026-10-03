"use client";

import Image from "next/image";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { Product } from "@/types/catalog";
import { ADMIN_CATEGORIES } from "@/lib/data/categories";
import { AdminProductActions } from "@/components/admin-product-actions";
import { AdminProductPreviewModal } from "@/components/admin-product-preview-modal";

interface AdminProductsTableProps {
  products: Product[];
}

type VisibilityFilter = "all" | "published" | "hidden";

const categoryLabels = new Map(ADMIN_CATEGORIES.map((category) => [category.slug, category.label]));

export function AdminProductsTable({ products }: AdminProductsTableProps) {
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(products.flatMap((product) => product.categories))).sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt");

    return products.filter((product) => {
      const matchesSearch = query.length === 0 || product.name.toLocaleLowerCase("pt").includes(query);
      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "published" ? product.isPublished : !product.isPublished);
      const matchesCategory = categoryFilter === "all" || product.categories.includes(categoryFilter);

      return matchesSearch && matchesVisibility && matchesCategory;
    });
  }, [categoryFilter, products, search, visibilityFilter]);

  const filters: { value: VisibilityFilter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "published", label: "Publicados" },
    { value: "hidden", label: "Ocultos" },
  ];

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-[#e8e8eb] bg-white shadow-[0_2px_8px_rgba(20,20,25,0.025)]">
        <div className="flex flex-col gap-4 border-b border-[#eeeeef] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#92959b]" />
            <input
              type="search"
              aria-label="Pesquisar produtos pelo nome"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar produto..."
              className="h-10 w-full rounded-lg border border-[#e7e7e9] bg-[#fbfbfc] pl-9 pr-3 text-sm outline-none transition placeholder:text-[#a0a2a7] focus:border-[#f2a064] focus:bg-white focus:ring-2 focus:ring-[#f47b20]/10"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex w-fit rounded-lg bg-[#f4f4f5] p-1" aria-label="Filtrar por visibilidade">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={visibilityFilter === filter.value}
                  onClick={() => setVisibilityFilter(filter.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    visibilityFilter === filter.value
                      ? "bg-white text-[#24262a] shadow-sm"
                      : "text-[#777b82] hover:text-[#34373c]"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <label className="flex h-9 items-center gap-2 rounded-lg border border-[#e7e7e9] bg-white px-3 text-sm text-[#555960]">
              <SlidersHorizontal size={15} className="text-[#92959b]" />
              <span className="sr-only">Filtrar por categoria</span>
              <select
                aria-label="Filtrar por categoria"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="max-w-[180px] bg-transparent text-sm outline-none"
              >
                <option value="all">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabels.get(category) ?? category}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 text-xs text-[#858990] sm:px-5">
          <span>
            {filteredProducts.length} {filteredProducts.length === 1 ? "produto" : "produtos"}
          </span>
          {search || visibilityFilter !== "all" || categoryFilter !== "all" ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setVisibilityFilter("all");
                setCategoryFilter("all");
              }}
              className="font-medium text-[#d96512] hover:text-[#b94e08]"
            >
              Limpar filtros
            </button>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#fafafb] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#858990]">
              <tr className="border-y border-[#eeeeef]">
                <th className="px-4 py-3 font-semibold sm:px-5">Produto</th>
                <th className="px-4 py-3 font-semibold sm:px-5">Categoria</th>
                <th className="px-4 py-3 font-semibold sm:px-5">Preço</th>
                <th className="px-4 py-3 font-semibold sm:px-5">Visibilidade</th>
                <th className="px-4 py-3 text-right font-semibold sm:px-5">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f1]">
              {filteredProducts.map((product) => {
                const mainImage = product.images.find((image) => image.isMain) ?? product.images[0];

                return (
                  <tr key={product.id} className="transition hover:bg-[#fcfcfd]">
                    <td className="min-w-[250px] px-4 py-3 sm:px-5">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewProduct(product);
                          setIsPreviewOpen(true);
                        }}
                        className="flex items-center gap-3 text-left"
                      >
                        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#f2f2f3]">
                          {mainImage?.url ? (
                            <Image
                              src={mainImage.url}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-cover"
                            />
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-[#292b30]">{product.name}</span>
                          <span className="mt-1 flex flex-wrap gap-1.5">
                            {product.featured ? (
                              <span className="rounded bg-[#fff4e9] px-1.5 py-0.5 text-[10px] font-medium text-[#b95b17]">
                                Destaque
                              </span>
                            ) : null}
                            {product.bestSeller ? (
                              <span className="rounded bg-[#f3f3f4] px-1.5 py-0.5 text-[10px] font-medium text-[#666a71]">
                                Mais vendido
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#666a71] sm:px-5">
                      {product.categories.map((category) => categoryLabels.get(category) ?? category).join(", ") || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-[#454950] sm:px-5">
                      {product.basePrice ? `€ ${product.basePrice.toFixed(0)}` : "Consultar"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                      {product.isPublished ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf5ee] px-2.5 py-1 text-[11px] font-medium text-[#39764e]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#57986d]" />
                          Publicado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f0f1] px-2.5 py-1 text-[11px] font-medium text-[#686c73]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#96999f]" />
                          Oculto
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      <AdminProductActions product={product} />
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center">
                    <p className="text-sm font-medium text-[#4d5158]">Nenhum produto encontrado</p>
                    <p className="mt-1 text-xs text-[#898c92]">Altere a pesquisa ou os filtros para ver resultados.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <AdminProductPreviewModal
        product={previewProduct}
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </>
  );
}
