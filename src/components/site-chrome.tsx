"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppFloat } from "@/components/whatsapp-float";

interface SiteChromeProps {
  children: React.ReactNode;
  logoHeader?: string;
  logoFooter?: string;
  isAdminAuthenticated: boolean;
}

export function SiteChrome({ children, logoHeader, logoFooter, isAdminAuthenticated }: SiteChromeProps) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return <main>{children}</main>;
  }

  return (
    <>
      <SiteHeader logoSrc={logoHeader} showAdminButton={isAdminAuthenticated} />
      <main>{children}</main>
      <SiteFooter logoSrc={logoFooter} />
      <WhatsAppFloat />
    </>
  );
}
