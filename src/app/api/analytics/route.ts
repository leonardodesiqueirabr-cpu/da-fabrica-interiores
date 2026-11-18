import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "@/lib/admin-auth";
import { getProductSlugFromPath, normalizeTrackedPath } from "@/lib/analytics/shared";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

// Recolha leve e sem cookies: não guarda IP, user agent nem query strings.
// Só grava em produção (VERCEL_ENV=production) ou com ANALYTICS_ENABLED=true;
// ANALYTICS_ENABLED=false desliga a recolha em qualquer ambiente.

const eventSchema = z.object({
  type: z.enum(["pageview", "whatsapp_click"]),
  path: z.string().min(1).max(400),
  source: z.enum(["product", "float", "other"]).optional(),
});

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pingdom|monitor/i;
// Janela em que o mesmo visitante/página/evento é considerado duplicado
// (refresh imediato, duplo clique, re-render, retry).
const DEDUPE_WINDOW_MS = 10_000;

function isCollectionEnabled() {
  const flag = process.env.ANALYTICS_ENABLED;
  if (flag === "false") return false;
  if (flag === "true") return true;
  return process.env.VERCEL_ENV === "production";
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function noContent() {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  if (!isCollectionEnabled()) return noContent();

  const userAgent = request.headers.get("user-agent") || "";
  if (!userAgent || BOT_UA.test(userAgent)) return noContent();

  // Apenas pedidos do próprio site.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  let originHost = "";
  try {
    originHost = origin ? new URL(origin).host : "";
  } catch {
    return noContent();
  }
  if (!originHost || !host || originHost !== host) return noContent();

  // Sessões de administrador não contam.
  const cookieStore = await cookies();
  if (isAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) return noContent();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noContent();
  }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return noContent();

  const path = normalizeTrackedPath(parsed.data.path);
  if (!path) return noContent();

  const supabase = getSupabaseServiceClient();
  if (!supabase) return noContent();

  const eventType = parsed.data.type;
  const source = eventType === "whatsapp_click" ? parsed.data.source ?? "other" : null;
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || request.headers.get("x-real-ip") || "";
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.ANALYTICS_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  // Hash diário: muda todos os dias, não é reversível e não é guardado com IP/UA.
  const visitorHash = sha256(`${salt}|${day}|${ip}|${userAgent}`).slice(0, 32);

  const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
  let recentQuery = supabase
    .from("analytics_events")
    .select("id", { head: true, count: "exact" })
    .eq("visitor_hash", visitorHash)
    .eq("event_type", eventType)
    .eq("path", path)
    .gte("created_at", since);
  recentQuery = source ? recentQuery.eq("source", source) : recentQuery.is("source", null);
  const { count, error: recentError } = await recentQuery;
  if (recentError || (count ?? 0) > 0) return noContent();

  const bucket = Math.floor(Date.now() / DEDUPE_WINDOW_MS);
  const { error } = await supabase.from("analytics_events").upsert(
    {
      event_type: eventType,
      path,
      product_slug: getProductSlugFromPath(path),
      source,
      visitor_hash: visitorHash,
      dedupe_key: sha256(`${visitorHash}|${eventType}|${path}|${source ?? ""}|${bucket}`),
    },
    { onConflict: "dedupe_key", ignoreDuplicates: true },
  );

  if (error) {
    console.warn("[analytics] Falha ao gravar evento:", error.message);
  }

  return noContent();
}
