const DEFAULT_SITE_URL = "https://dafabricainteriores.com";

// Fonte unica da URL publica do site; nunca deve resolver para vercel.app em producao.
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, "");
}

export function buildProductUrl(slug: string): string {
  return `${getSiteUrl()}/produto/${slug}`;
}
