"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/types/catalog";

interface CatalogCategory {
  slug: string;
  label: string;
}

interface AllProductsCatalogProps {
  products: Product[];
  categories: CatalogCategory[];
  initialSelectedCategories?: string[];
  initialOnlyBestSellers?: boolean;
  lockInitialCategories?: boolean;
  compactGrid?: boolean;
  compactGridLooseVerticalGap?: boolean;
  compactGridDesktopFour?: boolean;
}

type SortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc";

export function AllProductsCatalog({
  products,
  categories,
  initialSelectedCategories = [],
  initialOnlyBestSellers = false,
  lockInitialCategories = false,
  compactGrid = false,
  compactGridLooseVerticalGap = false,
  compactGridDesktopFour = false,
}: AllProductsCatalogProps) {
  const pricedProducts = useMemo(() => products.filter((item) => typeof item.basePrice === "number"), [products]);
  const minAvailablePrice = useMemo(
    () => (pricedProducts.length ? Math.floor(Math.min(...pricedProducts.map((item) => item.basePrice as number))) : 0),
    [pricedProducts],
  );
  const maxAvailablePrice = useMemo(
    () => (pricedProducts.length ? Math.ceil(Math.max(...pricedProducts.map((item) => item.basePrice as number))) : 0),
    [pricedProducts],
  );

  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialSelectedCategories);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [onlyBestSellers, setOnlyBestSellers] = useState(initialOnlyBestSellers);
  const [minPrice, setMinPrice] = useState<number>(minAvailablePrice);
  const [maxPrice, setMaxPrice] = useState<number>(maxAvailablePrice);
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");

  const currentCategoryLabels = useMemo(
    () =>
      categories
        .filter((category) => selectedCategories.includes(category.slug))
        .map((category) => category.label),
    [categories, selectedCategories],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const matchesSearch =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        product.shortDescription.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query);

      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.some((category) => product.categories.includes(category));

      const matchesAvailability = !onlyAvailable || product.available;
      const matchesFeatured = !onlyFeatured || product.featured;
      const matchesBestSellers = !onlyBestSellers || product.bestSeller;

      const productPrice = product.basePrice;
      const matchesPrice =
        productPrice == null ||
        ((minAvailablePrice === maxAvailablePrice || productPrice >= minPrice) &&
          (minAvailablePrice === maxAvailablePrice || productPrice <= maxPrice));

      return (
        matchesSearch &&
        matchesCategory &&
        matchesAvailability &&
        matchesFeatured &&
        matchesBestSellers &&
        matchesPrice
      );
    });

    const sorted = [...filtered];

    if (sortBy === "name-asc") {
      sorted.sort((a, b) => a.name.localeCompare(b.name, "pt"));
    }

    if (sortBy === "name-desc") {
      sorted.sort((a, b) => b.name.localeCompare(a.name, "pt"));
    }

    if (sortBy === "price-asc") {
      sorted.sort((a, b) => (a.basePrice ?? Number.MAX_SAFE_INTEGER) - (b.basePrice ?? Number.MAX_SAFE_INTEGER));
    }

    if (sortBy === "price-desc") {
      sorted.sort((a, b) => (b.basePrice ?? -1) - (a.basePrice ?? -1));
    }

    return sorted;
  }, [
    maxAvailablePrice,
    maxPrice,
    minAvailablePrice,
    minPrice,
    onlyAvailable,
    onlyBestSellers,
    onlyFeatured,
    products,
    search,
    selectedCategories,
    sortBy,
  ]);

  const clearFilters = () => {
    setSearch("");
    setSelectedCategories(initialSelectedCategories);
    setOnlyAvailable(false);
    setOnlyFeatured(false);
    setOnlyBestSellers(initialOnlyBestSellers);
    setMinPrice(minAvailablePrice);
    setMaxPrice(maxAvailablePrice);
    setSortBy("name-asc");
  };

  const hasActiveFilters =
    search.length > 0 ||
    selectedCategories.join("|") !== initialSelectedCategories.join("|") ||
    onlyAvailable ||
    onlyFeatured ||
    onlyBestSellers !== initialOnlyBestSellers ||
    minPrice !== minAvailablePrice ||
    maxPrice !== maxAvailablePrice ||
    sortBy !== "name-asc";

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[280px_1fr]">
      <aside className="h-fit space-y-6 pr-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">Filtros</h2>
          {hasActiveFilters ? (
            <button type="button" onClick={clearFilters} className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
              Limpar
            </button>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="search-products" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Pesquisar produto
          </label>
          <input
            id="search-products"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, descrição..."
            className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Categoria</p>
          {lockInitialCategories ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm">
              {currentCategoryLabels.length > 0 ? currentCategoryLabels.join(", ") : "Categoria atual"}
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => (
                <label key={category.slug} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.slug)}
                    onChange={(event) =>
                      setSelectedCategories((old) =>
                        event.target.checked ? [...old, category.slug] : old.filter((item) => item !== category.slug),
                      )
                    }
                  />
                  {category.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Estado</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyAvailable} onChange={(event) => setOnlyAvailable(event.target.checked)} />
              Apenas disponíveis
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyFeatured} onChange={(event) => setOnlyFeatured(event.target.checked)} />
              Em destaque
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyBestSellers}
                onChange={(event) => setOnlyBestSellers(event.target.checked)}
              />
              Mais vendidos
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Preço</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-[var(--muted)]">
              <span>Mínimo</span>
              <input
                type="number"
                min={minAvailablePrice}
                max={maxPrice}
                value={minPrice}
                onChange={(event) => setMinPrice(Number(event.target.value || minAvailablePrice))}
                className="w-full rounded-lg border border-[var(--border)] px-2 py-2 text-sm text-[var(--foreground)]"
              />
            </label>
            <label className="space-y-1 text-xs text-[var(--muted)]">
              <span>Máximo</span>
              <input
                type="number"
                min={minPrice}
                max={maxAvailablePrice}
                value={maxPrice}
                onChange={(event) => setMaxPrice(Number(event.target.value || maxAvailablePrice))}
                className="w-full rounded-lg border border-[var(--border)] px-2 py-2 text-sm text-[var(--foreground)]"
              />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="sort-products" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Ordenar por
          </label>
          <select
            id="sort-products"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOption)}
            className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
          >
            <option value="name-asc">Nome (A-Z)</option>
            <option value="name-desc">Nome (Z-A)</option>
            <option value="price-asc">Preço (menor para maior)</option>
            <option value="price-desc">Preço (maior para menor)</option>
          </select>
        </div>
      </aside>

      <div>
        <div className="mb-6 flex items-center justify-between border-b border-[var(--border)] pb-4">
          <p className="text-sm text-[var(--muted)]">
            {filteredProducts.length} {filteredProducts.length === 1 ? "produto" : "produtos"} encontrados
          </p>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-6 py-14 text-center">
            <p className="text-base font-medium">Nenhum produto encontrado com os filtros selecionados.</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Experimente limpar os filtros para ver mais resultados.</p>
          </div>
        ) : (
          <div
            className={
              compactGrid
                ? compactGridLooseVerticalGap
                  ? `grid grid-cols-2 gap-x-2 gap-y-5 sm:gap-x-3 sm:gap-y-6${compactGridDesktopFour ? " lg:grid-cols-4" : ""}`
                  : `grid grid-cols-2 gap-2 sm:gap-3${compactGridDesktopFour ? " lg:grid-cols-4" : ""}`
                : "grid gap-6 md:grid-cols-2 xl:grid-cols-3"
            }
          >
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
