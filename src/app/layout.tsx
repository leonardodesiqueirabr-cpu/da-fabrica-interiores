import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteChrome } from "@/components/site-chrome";
import { getCatalogData } from "@/lib/data/catalog";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "@/lib/admin-auth";
import { getSiteUrl } from "@/lib/utils/site-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Móveis e Estofados | Da Fábrica Interiores",
    template: "%s | Da Fábrica Interiores",
  },
  description: "Loja premium de sofas, camas, colchoes e mobiliario de sala.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const catalog = await getCatalogData();
  const cookieStore = await cookies();
  const isAdminAuthenticated = isAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  return (
    <html lang="pt-PT">
      <body>
        <SiteChrome
          logoHeader={catalog.assets.logoPrimary || catalog.assets.logoSecondary}
          logoFooter={catalog.assets.logoSecondary || catalog.assets.logoPrimary}
          isAdminAuthenticated={isAdminAuthenticated}
        >
          {children}
        </SiteChrome>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
