"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  ANALYTICS_ENDPOINT,
  type AnalyticsEventType,
  normalizeTrackedPath,
  WHATSAPP_SOURCE_ATTR,
  type WhatsAppSource,
} from "@/lib/analytics/shared";

let lastPageviewPath: string | null = null;

function isTrackingAllowed() {
  if (typeof window === "undefined") return false;
  const { hostname, pathname } = window.location;
  if (pathname.startsWith("/admin")) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname.endsWith(".local")) {
    return false;
  }
  // Respeita as preferências de privacidade do navegador.
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl === true || nav.doNotTrack === "1") return false;
  return true;
}

function sendEvent(type: AnalyticsEventType, path: string, source?: WhatsAppSource) {
  if (!isTrackingAllowed()) return;
  const body = JSON.stringify({ type, path, source });
  try {
    if (navigator.sendBeacon?.(ANALYTICS_ENDPOINT, new Blob([body], { type: "application/json" }))) return;
  } catch {
    // fallback abaixo
  }
  fetch(ANALYTICS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * Recolha leve de estatísticas (sem cookies nem identificadores no dispositivo):
 * - uma visualização por mudança de página;
 * - cliques em links do WhatsApp (wa.me), com a origem indicada em data-wa-source.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const path = pathname ? normalizeTrackedPath(pathname) : null;
    if (!path || path === lastPageviewPath) return;
    lastPageviewPath = path;
    sendEvent("pageview", path);
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>('a[href*="wa.me/"], a[href*="api.whatsapp.com"]');
      if (!link) return;
      const path = normalizeTrackedPath(window.location.pathname);
      if (!path) return;
      const rawSource = link.getAttribute(WHATSAPP_SOURCE_ATTR);
      const source: WhatsAppSource = rawSource === "product" || rawSource === "float" ? rawSource : "other";
      sendEvent("whatsapp_click", path, source);
    }

    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  return null;
}
