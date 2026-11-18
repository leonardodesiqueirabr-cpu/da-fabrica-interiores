// Partilhado entre o tracker (cliente), o coletor (/api/analytics) e o admin.

export const ANALYTICS_ENDPOINT = "/api/analytics";

export type AnalyticsEventType = "pageview" | "whatsapp_click";
/** product = botão da página do produto · float = botão flutuante · other = restantes CTAs. */
export type WhatsAppSource = "product" | "float" | "other";

export const WHATSAPP_SOURCE_ATTR = "data-wa-source";

// Só páginas públicas conhecidas são contadas (evita lixo, admin e APIs).
const TRACKABLE_PATH = /^\/(?:produtos|mais-vendidos|categorias\/[^/]+|produto\/[^/]+)?$/;

export function normalizeTrackedPath(rawPath: string): string | null {
  const path = rawPath.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path.length > 200 || !TRACKABLE_PATH.test(path)) return null;
  return path;
}

export function getProductSlugFromPath(path: string): string | null {
  const match = /^\/produto\/([^/]+)$/.exec(path);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export const ANALYTICS_PERIODS = [7, 30, 90] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];
