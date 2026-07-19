import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/utils/whatsapp";

const whatsappPhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "351915783035";

export function WhatsAppFloat() {
  return (
    <Link
      href={buildWhatsAppUrl(whatsappPhone, "Ola, gostaria de informacoes sobre os produtos da loja.")}
      target="_blank"
      className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-[#1e1e1e] px-5 py-3 text-sm font-semibold text-white shadow-2xl transition hover:-translate-y-1"
    >
      <MessageCircle className="size-4" />
      Falar pelo WhatsApp
    </Link>
  );
}
