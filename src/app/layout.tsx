import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { getCatalogData } from "@/lib/data/catalog";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "@/lib/admin-auth";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://da-fabrica-interiores.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
        <SiteHeader logoSrc={catalog.assets.logoPrimary || catalog.assets.logoSecondary} showAdminButton={isAdminAuthenticated} />
        <main>{children}</main>
        <SiteFooter logoSrc={catalog.assets.logoSecondary || catalog.assets.logoPrimary} />
        <WhatsAppFloat />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
