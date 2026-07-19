"use client";

import { type TouchEvent, type WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/types/catalog";
import { buildProductMessage, buildWhatsAppUrl } from "@/lib/utils/whatsapp";

interface ProductConfiguratorProps {
  product: Product;
}

const whatsappPhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "351915783035";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

const COLOR_HEX: Record<string, string> = {
  branco: "#f5f5f5",
  preto: "#1a1a1a",
  cinza: "#9e9e9e",
  "cinza claro": "#c8c8c8",
  "cinza escuro": "#5a5a5a",
  bege: "#d4c5a9",
  camel: "#c19a6b",
  caramelo: "#b5651d",
  castanho: "#6f4e37",
  azul: "#4a7ab5",
  rosa: "#e8a0b0",
  amarelo: "#f5d060",
  vermelho: "#c0392b",
  cambrian: "#7a8a6e",
};

export function ProductConfigurator({ product }: ProductConfiguratorProps) {
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || "");
  const [selectedMeasure, setSelectedMeasure] = useState(product.measurements[0]?.label || "");
  const [selectedImageId, setSelectedImageId] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    Object.fromEntries(product.options.map((item) => [item.name, item.values[0] || ""])),
  );
  const touchStartXRef = useRef<number | null>(null);
  const wheelAccumulatorRef = useRef(0);
  const wheelResetTimerRef = useRef<number | null>(null);

  const sideOption = useMemo(() => {
    for (const val of Object.values(selectedOptions)) {
      if (val === "Lado Direito") return "Direito";
      if (val === "Lado Esquerdo") return "Esquerdo";
    }
    return undefined;
  }, [selectedOptions]);

  const orderedImages = useMemo(() => {
    return [...product.images].sort((a, b) => {
      const colorA = (a.colorName || "zz-sem-cor").toLowerCase();
      const colorB = (b.colorName || "zz-sem-cor").toLowerCase();
      if (colorA !== colorB) {
        return colorA.localeCompare(colorB, "pt");
      }

      const sideA = (a.sideLabel || "").toLowerCase();
      const sideB = (b.sideLabel || "").toLowerCase();
      if (sideA !== sideB) {
        return sideA.localeCompare(sideB, "pt");
      }

      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  }, [product.images]);

  const visibleImages = useMemo(() => {
    const color = selectedColor.trim().toLowerCase();
    if (!color) {
      return orderedImages;
    }

    return orderedImages.filter((image) => (image.colorName || "").toLowerCase() === color);
  }, [orderedImages, selectedColor]);

  const selectedImage = useMemo(() => {
    if (visibleImages.length === 0) {
      return null;
    }

    if (selectedImageId) {
      const manual = visibleImages.find((img) => img.id === selectedImageId);
      if (manual) {
        return manual;
      }
    }

    const preferredMain = visibleImages.find((item) => item.isMain);
    if (preferredMain) {
      return preferredMain;
    }

    if (sideOption) {
      const bySide = visibleImages.find((img) => img.sideLabel === sideOption);
      if (bySide) {
        return bySide;
      }
    }

    return visibleImages[0];
  }, [selectedImageId, sideOption, visibleImages]);

  const selectedImageIndex = useMemo(() => {
    if (!selectedImage) {
      return -1;
    }

    return visibleImages.findIndex((image) => image.id === selectedImage.id);
  }, [selectedImage, visibleImages]);

  const applyImageSelection = (image: Product["images"][number]) => {
    setSelectedImageId(image.id);
  };

  const navigateImage = (direction: "prev" | "next") => {
    if (visibleImages.length <= 1) {
      return;
    }

    const currentIndex = selectedImageIndex >= 0 ? selectedImageIndex : 0;
    const delta = direction === "prev" ? -1 : 1;
    const nextIndex = (currentIndex + delta + visibleImages.length) % visibleImages.length;
    applyImageSelection(visibleImages[nextIndex]);
  };

  useEffect(() => {
    return () => {
      if (wheelResetTimerRef.current != null) {
        window.clearTimeout(wheelResetTimerRef.current);
      }
    };
  }, []);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current == null) {
      return;
    }

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = touchEndX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(deltaX) < 48) {
      return;
    }

    navigateImage(deltaX > 0 ? "prev" : "next");
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    let horizontalIntent = 0;
    if (Math.abs(event.deltaX) >= Math.abs(event.deltaY) * 0.6) {
      horizontalIntent = event.deltaX;
    } else if (event.shiftKey && Math.abs(event.deltaY) > 0) {
      horizontalIntent = event.deltaY;
    }

    if (Math.abs(horizontalIntent) < 4) {
      return;
    }

    wheelAccumulatorRef.current += horizontalIntent;

    if (wheelResetTimerRef.current != null) {
      window.clearTimeout(wheelResetTimerRef.current);
    }

    wheelResetTimerRef.current = window.setTimeout(() => {
      wheelAccumulatorRef.current = 0;
      wheelResetTimerRef.current = null;
    }, 180);

    if (Math.abs(wheelAccumulatorRef.current) < 35) {
      return;
    }

    navigateImage(wheelAccumulatorRef.current > 0 ? "next" : "prev");
    wheelAccumulatorRef.current = 0;
  };

  const chosenMeasure = product.measurements.find((item) => item.label === selectedMeasure);
  const priceLabel = chosenMeasure?.price
    ? `${chosenMeasure.price.toFixed(0)} EUR`
    : product.basePrice
      ? `${product.basePrice.toFixed(0)} EUR`
      : undefined;
  const productUrl = `${siteUrl}/produto/${product.slug}`;

  const message = buildProductMessage({
    productName: product.name,
    color: selectedColor || undefined,
    measure: selectedMeasure || undefined,
    options: Object.values(selectedOptions).filter(Boolean),
    priceLabel,
    productUrl,
  });

  return (
    <section className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-5">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-[var(--surface-soft)] md:aspect-[4/3] lg:h-[620px] lg:aspect-auto">
          {selectedImage ? (
            <div
              className="relative h-full w-full"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              style={{ touchAction: "pan-y" }}
            >
              <Image src={selectedImage.url} alt={selectedImage.alt} fill className="object-cover rounded-3xl" />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">Sem imagem</div>
          )}

          {visibleImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => navigateImage("prev")}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-[var(--foreground)] shadow transition hover:bg-white"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => navigateImage("next")}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-[var(--foreground)] shadow transition hover:bg-white"
                aria-label="Próxima imagem"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-10">
        <div className="space-y-4 border-b border-[var(--border)] pb-8">
          <h1 className="text-5xl font-semibold">{product.name}</h1>
          <p className="text-sm leading-relaxed text-[var(--muted)]">{product.description}</p>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold uppercase tracking-wide">Configurar produto</h2>

          {product.colors.length > 0 && (
            <div className="space-y-3 text-sm">
              <span className="font-medium">
                Cor{selectedColor ? (
                  <span className="ml-2 font-normal capitalize text-[var(--muted)]">{selectedColor}</span>
                ) : null}
              </span>
              <div className="flex flex-wrap gap-3 pt-1">
                {product.colors.map((color) => {
                  const lowerColor = color.toLowerCase();
                  const imageForColor = orderedImages.find((image) => image.colorName?.toLowerCase() === lowerColor);
                  const colorHex = imageForColor?.colorHex;
                  const isSelected = selectedColor.toLowerCase() === lowerColor;

                  return (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      onClick={() => {
                        setSelectedColor(isSelected ? "" : color);
                        setSelectedImageId("");
                      }}
                      className={`size-5 rounded-full border-2 transition ${
                        isSelected
                          ? "border-[var(--foreground)] scale-110"
                          : "border-transparent hover:border-[var(--muted)]"
                      }`}
                      style={{ backgroundColor: colorHex || COLOR_HEX[lowerColor] || "#d9d4cd" }}
                    />
                  );
                })}
              </div>
              <p className="text-xs text-[var(--muted)]">Toque novamente na cor selecionada para ver todas as imagens.</p>
            </div>
          )}

          {product.measurements.length > 0 && (
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Medida</span>
              <select
                value={selectedMeasure}
                onChange={(event) => setSelectedMeasure(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
              >
                {product.measurements.map((measure) => (
                  <option key={measure.id} value={measure.label}>
                    {measure.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {product.options.map((option) => (
            <label key={option.id} className="block space-y-2 text-sm">
              <span className="font-medium">{option.name}</span>
              <select
                value={selectedOptions[option.name] || ""}
                onChange={(event) => {
                  const newVal = event.target.value;
                  setSelectedOptions((old) => ({ ...old, [option.name]: newVal }));
                  if (newVal === "Lado Direito" || newVal === "Lado Esquerdo") {
                    setSelectedImageId("");
                  }
                }}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
              >
                {option.values.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <div className="border-t border-[var(--border)] pt-5">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
              {chosenMeasure?.price ? "Preço para a medida selecionada" : "Preço base"}
            </p>
            <p className="mt-1 text-3xl font-bold text-[var(--accent)]">
              {chosenMeasure?.price
                ? `${chosenMeasure.price.toFixed(0)} EUR`
                : product.basePrice
                  ? `${product.basePrice.toFixed(0)} EUR`
                  : "Consultar Preço"}
            </p>
          </div>

          <Link
            href={buildWhatsAppUrl(whatsappPhone, message)}
            target="_blank"
            className="inline-flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[var(--accent-strong)]"
          >
            Solicitar informações pelo WhatsApp
          </Link>
        </div>

        {product.characteristics.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Caracteristicas tecnicas</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
              {product.characteristics.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
