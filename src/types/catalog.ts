export type CategorySlug =
  | "sofas"
  | "camas"
  | "colchoes"
  | "sala"
  | "todos"
  | "mais-vendidos";

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  alt: string;
  colorName?: string;
  colorHex?: string;
  sideLabel?: string;
  isMain: boolean;
  sortOrder: number;
}

export interface ProductMeasurement {
  id: string;
  productId: string;
  label: string;
  price: number | null;
  active: boolean;
}

export interface ProductOption {
  id: string;
  productId: string;
  name: string;
  values: string[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  basePrice: number | null;
  categories: string[];
  featured: boolean;
  bestSeller: boolean;
  available: boolean;
  characteristics: string[];
  colors: string[];
  images: ProductImage[];
  measurements: ProductMeasurement[];
  options: ProductOption[];
}

export interface CatalogData {
  products: Product[];
  categories: {
    slug: Exclude<CategorySlug, "todos">;
    label: string;
  }[];
  assets: {
    logoPrimary?: string;
    logoSecondary?: string;
    heroImage?: string;
  };
}
