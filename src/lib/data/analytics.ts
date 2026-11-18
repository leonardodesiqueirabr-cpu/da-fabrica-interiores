import { getSupabaseServiceClient } from "@/lib/supabase/service";
import type { AnalyticsPeriod } from "@/lib/analytics/shared";

export interface AnalyticsSummary {
  collectionStartedAt: string | null;
  since: string;
  pageviews: number;
  visitors: number;
  clicksProduct: number;
  clicksFloat: number;
  clicksOther: number;
  topPages: { path: string; views: number; visitors: number }[];
  topProducts: { slug: string; views: number; visitors: number }[];
  clicksByProduct: { slug: string; productClicks: number; floatClicks: number; total: number }[];
}

export type AnalyticsResult =
  | { ok: true; summary: AnalyticsSummary }
  | { ok: false; reason: "not-configured" | "not-migrated" | "error"; message?: string };

const toNumber = (value: unknown) => (typeof value === "number" ? value : Number(value) || 0);

/** Só para uso em páginas do admin (usa service_role). */
export async function getAnalyticsSummary(periodDays: AnalyticsPeriod): Promise<AnalyticsResult> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return { ok: false, reason: "not-configured" };

  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc("analytics_summary", { p_since: since });

  if (error) {
    const missing =
      error.code === "PGRST202" || error.code === "42883" || error.code === "42P01" || /analytics_/.test(error.message);
    return { ok: false, reason: missing ? "not-migrated" : "error", message: error.message };
  }

  const raw = (data ?? {}) as Record<string, any>;
  return {
    ok: true,
    summary: {
      collectionStartedAt: raw.collection_started_at ?? null,
      since,
      pageviews: toNumber(raw.pageviews),
      visitors: toNumber(raw.visitors),
      clicksProduct: toNumber(raw.clicks_product),
      clicksFloat: toNumber(raw.clicks_float),
      clicksOther: toNumber(raw.clicks_other),
      topPages: (raw.top_pages ?? []).map((row: any) => ({
        path: String(row.path),
        views: toNumber(row.views),
        visitors: toNumber(row.visitors),
      })),
      topProducts: (raw.top_products ?? []).map((row: any) => ({
        slug: String(row.slug),
        views: toNumber(row.views),
        visitors: toNumber(row.visitors),
      })),
      clicksByProduct: (raw.clicks_by_product ?? []).map((row: any) => ({
        slug: String(row.slug),
        productClicks: toNumber(row.product_clicks),
        floatClicks: toNumber(row.float_clicks),
        total: toNumber(row.total),
      })),
    },
  };
}
