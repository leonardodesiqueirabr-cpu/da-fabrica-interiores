export function buildWhatsAppUrl(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

// Mensagens gerais reutilizadas pelo botao flutuante e pelo CTA da seccao de destaque.
export const WHATSAPP_ASSISTANT_MESSAGE = "Olá, quero ajuda para escolher o melhor mobiliário.";
export const WHATSAPP_STORE_INFO_MESSAGE = "Olá, gostaria de informações sobre os produtos da loja.";

export function buildProductMessage(input: {
  productName: string;
  color?: string;
  measure?: string;
  options?: string[];
  productUrl?: string;
  priceLabel?: string;
}) {
  const detailParts = [
    input.color ? `na cor ${input.color}` : null,
    input.measure ? `medida ${input.measure}` : null,
    ...(input.options ?? []).filter(Boolean).map((item) => item.toLowerCase()),
  ].filter(Boolean);

  const details = detailParts.length > 0 ? `, ${detailParts.join(", ")}` : "";
  const baseMessage = `Olá, gostaria de informações sobre o ${input.productName}${details}.`;
  const withPrice = input.priceLabel ? `${baseMessage} Preço de referência: ${input.priceLabel}.` : baseMessage;

  if (!input.productUrl) {
    return withPrice;
  }

  return `${withPrice} Link do produto: ${input.productUrl}`;
}
