"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Eye, Save } from "lucide-react";
import { toSlug } from "@/lib/utils/text";
import type { Product } from "@/types/catalog";
import { ADMIN_CATEGORIES } from "@/lib/data/categories";
import { AdminProductPreviewModal } from "@/components/admin-product-preview-modal";

interface AdminProductFormProps {
  mode: "create" | "edit";
  product?: Product;
}

interface EditableImage {
  id?: string;
  url: string;
  alt: string;
  colorId?: string | null;
  colorName?: string;
  colorHex?: string;
  isMain: boolean;
  uploading?: boolean;
}

interface EditableColor {
  id: string;
  name: string;
  hex: string;
  position: number;
}

interface EditableMeasure {
  label: string;
  price: string;
  active: boolean;
}

interface EditableOption {
  name: string;
  values: string;
}

const TEMP_COLOR_ID_PREFIX = "temp-color-";

function toColorHexValue(hex?: string | null) {
  if (!hex) return "#cccccc";
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : "#cccccc";
}

function shouldUseSubtleBorder(hex?: string | null) {
  const safeHex = toColorHexValue(hex);
  const r = parseInt(safeHex.slice(1, 3), 16);
  const g = parseInt(safeHex.slice(3, 5), 16);
  const b = parseInt(safeHex.slice(5, 7), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.86;
}

function toColorKey(value?: string | null) {
  return (value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeInitialColors(product?: Product): EditableColor[] {
  if (!product) return [];
  if (product.colors.length > 0) {
    return product.colors
      .map((color, index) => ({
        id: color.id,
        name: color.name,
        hex: toColorHexValue(color.hex),
        position: color.position ?? index,
      }))
      .sort((a, b) => a.position - b.position);
  }

  const fallbackColors = new Map<string, EditableColor>();
  product.images.forEach((image) => {
    if (!image.colorName) return;
    const key = `${toColorKey(image.colorName)}::${toColorHexValue(image.colorHex)}`;
    if (fallbackColors.has(key)) return;
    fallbackColors.set(key, {
      id: `${TEMP_COLOR_ID_PREFIX}${toColorKey(image.colorName)}-${fallbackColors.size + 1}`,
      name: image.colorName,
      hex: toColorHexValue(image.colorHex),
      position: fallbackColors.size,
    });
  });

  return Array.from(fallbackColors.values());
}

export function AdminProductForm({ mode, product }: AdminProductFormProps) {
  const router = useRouter();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);
  const [draggedColorIndex, setDraggedColorIndex] = useState<number | null>(null);
  const [dragOverColorIndex, setDragOverColorIndex] = useState<number | null>(null);
  const [isColorEditorOpen, setIsColorEditorOpen] = useState(false);
  const [draftColors, setDraftColors] = useState<EditableColor[]>([]);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);

  const [name, setName] = useState(product?.name || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const [description, setDescription] = useState(product?.description || "");
  const [basePrice, setBasePrice] = useState(product?.basePrice?.toString() || "");
  const [characteristicsText, setCharacteristicsText] = useState((product?.characteristics || []).join("\n"));
  const [featured, setFeatured] = useState(product?.featured || false);
  const [bestSeller, setBestSeller] = useState(product?.bestSeller || false);
  const [isPublished, setIsPublished] = useState(product?.isPublished ?? true);
  const [categories, setCategories] = useState<string[]>(product?.categories || []);
  const initialColors = useMemo(() => normalizeInitialColors(product), [product]);
  const initialColorByName = useMemo(
    () => new Map(initialColors.map((color) => [toColorKey(color.name), color.id])),
    [initialColors],
  );
  const [colors, setColors] = useState<EditableColor[]>(initialColors);
  const [images, setImages] = useState<EditableImage[]>(
    product?.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      colorId: img.colorId ?? (img.colorName ? initialColorByName.get(toColorKey(img.colorName)) ?? null : null),
      colorName: img.colorName,
      colorHex: img.colorHex,
      isMain: img.isMain,
    })) || [],
  );
  const [measurements] = useState<EditableMeasure[]>(
    product?.measurements.map((m) => ({
      label: m.label,
      price: m.price?.toString() || "",
      active: m.active,
    })) || [{ label: "", price: "", active: true }],
  );
  const [options] = useState<EditableOption[]>(
    product?.options.map((o) => ({ name: o.name, values: o.values.join(", ") })) || [],
  );

  const canSubmit = useMemo(
    () => Boolean(name.trim() && slug.trim() && categories.length > 0),
    [name, slug, categories.length],
  );

  const previewProduct: Product = useMemo(() => {
    const normalizedColors = colors
      .map((color, index) => ({
        id: color.id,
        productId: product?.id || "preview",
        name: color.name.trim(),
        hex: color.hex?.trim() || null,
        position: index,
      }))
      .filter((color) => color.name.length > 0);
    const colorsById = new Map(normalizedColors.map((color) => [color.id, color]));

    return {
      id: product?.id || "preview",
      slug: slug || "preview",
      name: name || product?.name || "Produto sem nome",
      shortDescription: description || "",
      description: description || "",
      basePrice: basePrice ? Number(basePrice) : null,
      categories,
      featured,
      bestSeller,
      isPublished,
      available: true,
      characteristics: characteristicsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      colors: normalizedColors,
      images: images
        .filter((img) => img.url.trim())
        .map((img, idx) => {
          const mappedColor = img.colorId ? colorsById.get(img.colorId) : null;
          return {
            id: img.id || `preview-image-${idx}`,
            productId: product?.id || "preview",
            url: img.url,
            alt: img.alt || name || product?.name || "Imagem do produto",
            colorId: img.colorId || null,
            colorName: mappedColor?.name || img.colorName,
            colorHex: mappedColor?.hex || img.colorHex,
            isMain: img.isMain,
            sortOrder: idx,
          };
        }),
      measurements: measurements
        .filter((m) => m.label.trim())
        .map((m, idx) => ({
          id: `preview-measure-${idx}`,
          productId: product?.id || "preview",
          label: m.label,
          price: m.price ? Number(m.price) : null,
          active: m.active,
        })),
      options: options
        .filter((o) => o.name.trim())
        .map((o, idx) => ({
          id: `preview-option-${idx}`,
          productId: product?.id || "preview",
          name: o.name,
          values: o.values
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        })),
    };
  }, [
    basePrice,
    bestSeller,
    categories,
    characteristicsText,
    colors,
    description,
    featured,
    images,
    isPublished,
    measurements,
    name,
    options,
    product?.id,
    product?.name,
    slug,
  ]);

  async function uploadFile(file: File, previousUrl?: string): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    if (previousUrl) {
      formData.append("previousUrl", previousUrl);
    }
    const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
    const result = (await response.json()) as { url?: string; error?: string };
    if (!response.ok) throw new Error(result.error || "Erro no upload");
    return { url: result.url! };
  }

  async function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!fileArray.length) return;

    const startIndex = images.length;
    const placeholders: EditableImage[] = fileArray.map((_, i) => ({
      url: "",
      alt: "",
      isMain: startIndex + i === 0,
      uploading: true,
    }));
    setImages((prev) => [...prev, ...placeholders]);

    await Promise.all(
      fileArray.map(async (file, i) => {
        try {
          const url = await uploadFile(file);
          setImages((prev) =>
            prev.map((img, idx) => (idx === startIndex + i ? { ...img, url: url.url, uploading: false } : img)),
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erro no upload");
          setImages((prev) => prev.filter((_, idx) => idx !== startIndex + i));
        }
      }),
    );
  }

  function openReplaceFilePicker(index: number) {
    replaceIndexRef.current = index;
    replaceInputRef.current?.click();
  }

  async function handleReplaceFile(file: File, index: number) {
    const currentImage = images[index];
    if (!currentImage?.url.trim()) return;

    setError(null);
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, uploading: true } : img)));

    try {
      const { url } = await uploadFile(file, currentImage.url);
      setImages((prev) => prev.map((img, i) => (i === index ? { ...img, url, uploading: false } : img)));
    } catch (err) {
      setImages((prev) => prev.map((img, i) => (i === index ? { ...img, uploading: false } : img)));
      setError(err instanceof Error ? err.message : "Erro ao substituir imagem");
    }
  }

  function moveImage(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    setImages((prev) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.length || toIndex >= prev.length) {
        return prev;
      }
      const reordered = [...prev];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      return reordered;
    });
  }

  function addColor() {
    setDraftColors((prev) => [
      ...prev,
      {
        id: `${TEMP_COLOR_ID_PREFIX}${crypto.randomUUID()}`,
        name: "",
        hex: "#cccccc",
        position: prev.length,
      },
    ]);
  }

  function updateColor(index: number, updater: (color: EditableColor) => EditableColor) {
    setDraftColors((prev) => prev.map((color, i) => (i === index ? updater(color) : color)));
  }

  function removeColor(index: number) {
    const colorToRemove = draftColors[index];
    if (!colorToRemove) return;

    const associatedCount = images.filter((image) => image.colorId === colorToRemove.id).length;
    if (associatedCount > 0) {
      const confirmed = window.confirm(
        `A cor "${colorToRemove.name || "sem nome"}" está associada a ${associatedCount} imagem(ns). Deseja desassociar essas imagens e remover a cor?`,
      );
      if (!confirmed) return;
    }

    setDraftColors((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((color, position) => ({
          ...color,
          position,
        })),
    );
  }

  function moveDraftColor(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    setDraftColors((prev) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.length || toIndex >= prev.length) {
        return prev;
      }
      const reordered = [...prev];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      return reordered.map((color, position) => ({
        ...color,
        position,
      }));
    });
  }

  function openColorEditor() {
    setDraftColors(colors.map((color, index) => ({ ...color, position: color.position ?? index })));
    setIsColorEditorOpen(true);
  }

  function saveColorEditor() {
    const removedColorIds = colors
      .map((color) => color.id)
      .filter((id) => !draftColors.some((draft) => draft.id === id));

    if (removedColorIds.length > 0) {
      setImages((prev) =>
        prev.map((image) =>
          image.colorId && removedColorIds.includes(image.colorId)
            ? { ...image, colorId: null }
            : image,
        ),
      );
    }

    setColors(
      draftColors.map((color, index) => ({
        ...color,
        position: index,
      })),
    );
    setDraggedColorIndex(null);
    setDragOverColorIndex(null);
    setIsColorEditorOpen(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setError("Preencha o nome, slug e pelo menos uma categoria antes de gravar.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const normalizedColors = colors
        .map((color, index) => ({
          id: color.id,
          name: color.name.trim(),
          hex: color.hex?.trim() || null,
          position: index,
        }))
        .filter((color) => color.name.length > 0);
      const colorsById = new Map(normalizedColors.map((color) => [color.id, color]));

      const payload = {
        name,
        slug,
        shortDescription: description,
        description,
        basePrice: basePrice ? Number(basePrice) : null,
        featured,
        bestSeller,
        isPublished,
        characteristics: characteristicsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        categories,
        colors: normalizedColors,
        images: images
          .filter((img) => img.url.trim())
          .map((img, idx) => ({
            id: img.id,
            url: img.url,
            alt: img.alt || name,
            colorId: img.colorId || null,
            colorName: img.colorId ? colorsById.get(img.colorId)?.name || null : null,
            colorHex: img.colorId ? colorsById.get(img.colorId)?.hex || null : null,
            isMain: img.isMain,
            sortOrder: idx,
          })),
        measurements: measurements
          .filter((m) => m.label.trim())
          .map((m) => ({ label: m.label, price: m.price ? Number(m.price) : null, active: m.active })),
        options: options
          .filter((o) => o.name.trim())
          .map((o) => ({
            name: o.name,
            values: o.values
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
          })),
      };

      const endpoint = mode === "create" ? "/api/admin/products" : `/api/admin/products/${product?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string; issues?: Array<{ path: string[]; message: string }> };
      
      if (!response.ok) {
        if (data.issues && data.issues.length > 0) {
          const details = data.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
          throw new Error(`${data.error || "Erro ao salvar"}\n\n${details}`);
        }
        throw new Error(data.error || "Erro ao salvar");
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form id="admin-product-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-5 border-b border-[#e7e7e9] pb-5 md:flex-row md:items-end md:justify-between">
        <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-[#222428] sm:text-3xl">
          {name || product?.name || "Novo produto"}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f47b20] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#dd6818] disabled:opacity-60"
          >
            <Save size={16} />
            {loading ? "A gravar…" : mode === "create" ? "Criar produto" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e5e5e8] bg-white px-3.5 text-sm font-medium text-[#44484f] transition hover:border-[#f2a064] hover:text-[#d96512]"
          >
            <Eye size={16} />
            Pré-visualizar
          </button>
          <Link
            href="/admin"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e5e5e8] bg-white px-3.5 text-sm font-medium text-[#44484f] transition hover:bg-[#f5f5f6]"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-transparent">
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,0.95fr)] lg:gap-5 xl:gap-6">
            <div className="min-w-0 space-y-4 lg:space-y-5">
            {/* ── Informações ── */}
            <section className="space-y-4 rounded-xl border border-[#e9e9ec] bg-white p-4 sm:space-y-5 sm:p-5">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-[#292b30]">Informações principais</h2>
                <p className="mt-1 text-xs text-[#858990]">Nome, descrição e detalhes apresentados no catálogo.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm md:col-span-2">
                  <span className="text-xs font-semibold text-[#555960]">Nome do produto *</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!product) setSlug(toSlug(e.target.value));
                    }}
                    placeholder="Ex: Sofá London 3 lugares"
                    className="w-full rounded-lg border border-[#e5e5e8] bg-[#fcfcfd] px-3.5 py-2.5 text-sm text-[#292b30] outline-none transition placeholder:text-[#a0a2a7] focus:border-[#f2a064] focus:bg-white focus:ring-2 focus:ring-[#f47b20]/10"
                  />
                </label>
                <input type="hidden" value={slug} readOnly />
              </div>

              <label className="block space-y-1.5 text-sm">
                <span className="text-xs font-semibold text-[#555960]">Descrição do produto</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Ex: Estrutura robusta em madeira, tecido de alta durabilidade, almofadas removíveis..."
                  className="w-full resize-y rounded-lg border border-[#e5e5e8] bg-[#fcfcfd] px-3.5 py-2.5 text-sm text-[#292b30] outline-none transition placeholder:text-[#a0a2a7] focus:border-[#f2a064] focus:bg-white focus:ring-2 focus:ring-[#f47b20]/10"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="text-xs font-semibold text-[#555960]">Preço de venda (€)</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">€</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="0,00"
                      className="w-full rounded-lg border border-[#e5e5e8] bg-[#fcfcfd] py-2.5 pl-8 pr-3 text-sm text-[#292b30] outline-none transition placeholder:text-[#a0a2a7] focus:border-[#f2a064] focus:bg-white focus:ring-2 focus:ring-[#f47b20]/10"
                    />
                  </div>
                </label>
              </div>

              <label className="block space-y-1.5 text-sm">
                <span className="text-xs font-semibold text-[#555960]">Pontos de destaque do produto</span>
                <p className="text-xs text-[var(--muted)]">Escreva um ponto por linha. Aparecem como lista na página do produto.</p>
                <textarea
                  value={characteristicsText}
                  onChange={(e) => setCharacteristicsText(e.target.value)}
                  rows={3}
                  placeholder={"Estrutura em madeira maciça\nTecido anti-manchas certificado\nAlmofadas removíveis e laváveis"}
                  className="w-full resize-y rounded-lg border border-[#e5e5e8] bg-[#fcfcfd] px-3.5 py-2.5 text-sm text-[#292b30] outline-none transition placeholder:text-[#a0a2a7] focus:border-[#f2a064] focus:bg-white focus:ring-2 focus:ring-[#f47b20]/10"
                />
              </label>

            </section>

            <section className="space-y-3.5 rounded-xl border border-[#e9e9ec] bg-white p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-[#292b30]">Cores disponíveis</h2>
                  <p className="mt-1 text-xs text-[#858990]">Defina as cores do produto para associar às imagens.</p>
                </div>
                <button
                  type="button"
                  onClick={openColorEditor}
                  className="shrink-0 rounded-lg border border-[#e7e7e9] px-3 py-2 text-xs font-semibold text-[#555960] transition hover:border-[#f2a064] hover:text-[#d96512]"
                >
                  Editar
                </button>
              </div>

              {colors.length > 0 ? (
                <div className="flex flex-wrap items-start gap-3">
                  {colors.map((color) => (
                    <div key={color.id} className="flex w-[74px] flex-col items-center gap-1 text-center">
                      <span
                        className={`h-6 w-6 rounded-full ${shouldUseSubtleBorder(color.hex) ? "border border-[#dfe1e6]" : ""}`}
                        style={{ backgroundColor: toColorHexValue(color.hex) }}
                        title={`${color.name || "Sem nome"} · ${toColorHexValue(color.hex)}`}
                      />
                      <span className="w-full truncate text-[11px] text-[#6f737b]">{color.name || "Sem nome"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#858990]">Nenhuma cor cadastrada.</p>
              )}
            </section>

            {/* ── Imagens ── */}
            <section className="space-y-3.5 rounded-xl border border-[#e9e9ec] bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-[#292b30]">Imagens</h2>
                  <p className="mt-1 text-xs text-[#858990]">
                  Arraste ficheiros para a área abaixo ou clique para selecionar. Pode enviar várias imagens de uma vez.
                  </p>
                </div>
                {images.length ? <span className="text-xs text-[#858990]">{images.length} imagens</span> : null}
              </div>

              {/* Drop zone */}
              <div
                ref={dropZoneRef}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) setDragActive(false);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragActive(false);
                  await handleFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex min-h-[76px] cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-3 transition sm:justify-start ${
                  dragActive
                    ? "border-[#f47b20] bg-[#fff7f0]"
                    : "border-[#dedee1] bg-[#fcfcfd] hover:border-[#f2a064] hover:bg-[#fffaf6]"
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f2f3]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-[#777b82]"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-[#44484f]">
                    {dragActive ? "Solte as imagens aqui" : "Arraste imagens ou clique para selecionar"}
                  </p>
                  <p className="mt-1 text-xs text-[#858990]">JPG, PNG ou WEBP · Máx. 5 MB por imagem</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    if (e.target.files?.length) await handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  const selectedIndex = replaceIndexRef.current;
                  if (file && selectedIndex !== null) {
                    await handleReplaceFile(file, selectedIndex);
                  }
                  replaceIndexRef.current = null;
                  e.target.value = "";
                }}
              />

              {/* Image grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
                  {images.map((img, index) => (
                    <div
                      key={img.id ?? `${img.url}-${index}`}
                      onDragOver={(e) => {
                        if (draggedImageIndex === null || draggedImageIndex === index) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverImageIndex(index);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggedImageIndex === null || draggedImageIndex === index) {
                          setDraggedImageIndex(null);
                          setDragOverImageIndex(null);
                          return;
                        }
                        moveImage(draggedImageIndex, index);
                        setDraggedImageIndex(null);
                        setDragOverImageIndex(null);
                      }}
                      className={`min-w-0 overflow-hidden rounded-md border bg-white transition ${
                        draggedImageIndex === index
                          ? "border-[#f2a064] opacity-75"
                          : dragOverImageIndex === index
                            ? "border-[#f2a064] ring-2 ring-[#f47b20]/25"
                            : "border-[#ededf0]"
                      }`}
                    >
                      {/* Preview */}
                      <div className="group relative aspect-[16/10] w-full overflow-hidden bg-[#f2f2f3]">
                        {img.uploading ? (
                          <div className="flex h-full items-center justify-center">
                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#f47b20] border-t-transparent" />
                          </div>
                        ) : img.url ? (
                          <Image src={img.url} alt={img.alt || "Imagem do produto"} fill className="object-cover" />
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-sm font-bold text-white transition hover:bg-red-600"
                        >
                          ×
                        </button>

                        {img.isMain && (
                          <span className="absolute left-2 top-2 rounded-full bg-[#f47b20] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                            Principal
                          </span>
                        )}

                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation();
                            setDraggedImageIndex(index);
                            setDragOverImageIndex(index);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", String(index));
                          }}
                          onDragEnd={() => {
                            setDraggedImageIndex(null);
                            setDragOverImageIndex(null);
                          }}
                          className="absolute left-2 bottom-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/55 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100 focus-visible:opacity-100"
                          title="Arrastar para reordenar"
                          aria-label="Arrastar para reordenar"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-4 w-4"
                          >
                            <path d="M7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm0 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9-13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm1 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
                          </svg>
                        </button>

                        {!img.uploading && img.url ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openReplaceFilePicker(index);
                            }}
                            className="absolute bottom-2 left-11 rounded-md bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            Substituir imagem
                          </button>
                        ) : null}
                      </div>

                      <div className="space-y-2 p-2 md:p-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="min-w-0 flex-1">
                            <select
                              value={img.colorId || ""}
                              onChange={(e) => {
                                const value = e.target.value || null;
                                setImages((prev) => prev.map((item, i) => (i === index ? { ...item, colorId: value } : item)));
                              }}
                              className="w-full rounded-md border border-[#e8e8eb] bg-white px-2 py-1.5 text-xs text-[#37393e] outline-none focus:border-[#f2a064]"
                            >
                              <option value="">Sem associação</option>
                              {colors
                                .filter((color) => color.name.trim())
                                .map((color) => (
                                  <option key={color.id} value={color.id}>
                                    ● {color.name}
                                  </option>
                                ))}
                            </select>
                          </div>

                          <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-[11px] text-[#555960]">
                            <input
                              type="checkbox"
                              checked={img.isMain}
                              onChange={(e) =>
                                setImages((prev) =>
                                  prev.map((item, i) => ({ ...item, isMain: i === index ? e.target.checked : false })),
                                )
                              }
                              className="h-3.5 w-3.5 accent-[var(--accent)]"
                            />
                            Principal
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isColorEditorOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
                  <div className="w-full max-w-[700px] rounded-2xl border border-[#ebedf0] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
                    <div className="relative pr-8">
                      <h3 className="text-[32px] font-semibold tracking-tight text-[#1f2430]">Editar cores</h3>
                      <p className="mt-1 text-[15px] text-[#7a7f88]">Adicione, edite ou remova as cores disponíveis do produto.</p>
                      <button
                        type="button"
                        onClick={() => setIsColorEditorOpen(false)}
                        className="absolute -right-1 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-[28px] leading-none text-[#9ca1aa] transition hover:bg-[#f3f4f6] hover:text-[#596070]"
                      >
                        ×
                      </button>
                    </div>

                    <div className="mt-5 border-t border-[#eff1f4]">
                      {draftColors.length > 0 ? (
                        <div className="divide-y divide-[#eff1f4]">
                          {draftColors.map((color, index) => (
                            <div
                              key={color.id}
                              draggable
                              onDragStart={() => {
                                setDraggedColorIndex(index);
                                setDragOverColorIndex(index);
                              }}
                              onDragOver={(e) => {
                                if (draggedColorIndex === null || draggedColorIndex === index) return;
                                e.preventDefault();
                                setDragOverColorIndex(index);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedColorIndex === null || draggedColorIndex === index) {
                                  setDraggedColorIndex(null);
                                  setDragOverColorIndex(null);
                                  return;
                                }
                                moveDraftColor(draggedColorIndex, index);
                                setDraggedColorIndex(null);
                                setDragOverColorIndex(null);
                              }}
                              onDragEnd={() => {
                                setDraggedColorIndex(null);
                                setDragOverColorIndex(null);
                              }}
                              className={`grid grid-cols-[24px_36px_minmax(0,1fr)_170px_28px] items-center gap-3 py-3 ${
                                draggedColorIndex === index
                                  ? "opacity-65"
                                  : dragOverColorIndex === index
                                    ? "bg-[#fbfbfc]"
                                    : ""
                              }`}
                            >
                              <button
                                type="button"
                                draggable
                                onDragStart={() => {
                                  setDraggedColorIndex(index);
                                  setDragOverColorIndex(index);
                                }}
                                className="inline-flex h-6 w-6 cursor-grab items-center justify-center rounded text-[#9ea4ad] active:cursor-grabbing"
                                aria-label="Reordenar cor"
                                title="Reordenar cor"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                  <path d="M7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm0 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9-13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm1 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
                                </svg>
                              </button>
                              <label
                                className={`relative h-9 w-9 shrink-0 cursor-pointer rounded-full ${
                                  shouldUseSubtleBorder(color.hex) ? "border border-[#dfe1e6]" : ""
                                }`}
                                title="Cor"
                              >
                                <span
                                  className="absolute inset-0 rounded-full"
                                  style={{ backgroundColor: toColorHexValue(color.hex) }}
                                />
                                <input
                                  type="color"
                                  value={toColorHexValue(color.hex)}
                                  onChange={(e) => updateColor(index, (current) => ({ ...current, hex: e.target.value }))}
                                  className="absolute inset-0 cursor-pointer opacity-0"
                                  aria-label="Selecionar cor"
                                />
                              </label>
                              <input
                                value={color.name}
                                onChange={(e) => updateColor(index, (current) => ({ ...current, name: e.target.value }))}
                                placeholder="Nome da cor"
                                className="h-10 min-w-0 rounded-xl border border-[#e6e8ed] bg-white px-3 text-sm text-[#343a46] outline-none transition focus:border-[#f2a064] focus:ring-2 focus:ring-[#f47b20]/10"
                              />
                              <div className="relative">
                                <span
                                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-[#dfe2e7]"
                                  style={{ backgroundColor: toColorHexValue(color.hex) }}
                                />
                                <input
                                  value={toColorHexValue(color.hex)}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (/^#[0-9A-Fa-f]{6}$/.test(value) || value === "") {
                                      updateColor(index, (current) => ({ ...current, hex: value || "#cccccc" }));
                                    }
                                  }}
                                  placeholder="#cccccc"
                                  maxLength={7}
                                  className="h-10 w-full rounded-xl border border-[#e6e8ed] bg-white py-2 pl-8 pr-3 text-sm font-medium text-[#596070] outline-none transition focus:border-[#f2a064] focus:ring-2 focus:ring-[#f47b20]/10"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeColor(index)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[22px] leading-none text-[#9da2ab] transition hover:bg-[#f5f5f6] hover:text-red-600"
                                aria-label="Remover cor"
                                title="Remover cor"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="py-4 text-sm text-[#858990]">Nenhuma cor cadastrada.</p>
                      )}
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={addColor}
                        className="rounded-xl border border-[#e7e9ee] bg-white px-4 py-2.5 text-sm font-medium text-[#4c5563] transition hover:border-[#cfd5dd]"
                      >
                        + Adicionar cor
                      </button>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsColorEditorOpen(false)}
                          className="rounded-xl border border-[#e7e9ee] bg-white px-5 py-2.5 text-sm font-medium text-[#4c5563] transition hover:border-[#cfd5dd]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={saveColorEditor}
                          className="rounded-xl bg-[#f47b20] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#dd6818]"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            </div>

              <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:space-y-5">
                <section className="space-y-3.5 rounded-xl border border-[#e9e9ec] bg-white p-4 sm:p-5">
                  <div>
                    <h2 className="text-sm font-semibold text-[#292b30]">Organização</h2>
                    <p className="mt-1 text-xs text-[#858990]">Escolha onde o produto aparece no catálogo.</p>
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#777b82]">Categorias *</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ADMIN_CATEGORIES.map((cat) => (
                        <label
                          key={cat.slug}
                          className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-md border px-2 py-2 text-xs transition ${
                            categories.includes(cat.slug)
                              ? "border-[#f1d1ba] bg-[#fffaf6] font-medium text-[#8e572f]"
                              : "border-[#ededf0] text-[#555960] hover:border-[#d7d7da] hover:bg-[#fcfcfd]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={categories.includes(cat.slug)}
                            onChange={(e) =>
                              setCategories((prev) =>
                                e.target.checked ? [...prev, cat.slug] : prev.filter((c) => c !== cat.slug),
                              )
                            }
                            className="h-3.5 w-3.5 shrink-0 accent-[#e98a47]"
                          />
                          {cat.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="space-y-3.5 rounded-xl border border-[#e9e9ec] bg-white p-4 sm:p-5">
                  <div>
                    <h2 className="text-sm font-semibold text-[#292b30]">Visibilidade e etiquetas</h2>
                    <p className="mt-1 text-xs text-[#858990]">Controle o estado e a apresentação no site.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#777b82]">Visibilidade</p>
                    <div className="grid grid-cols-2 rounded-lg bg-[#f3f3f4] p-1">
                      {[
                        { value: true, label: "Publicado" },
                        { value: false, label: "Oculto" },
                      ].map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          aria-pressed={isPublished === option.value}
                          onClick={() => setIsPublished(option.value)}
                          className={`rounded-md px-2 py-2 text-xs font-semibold transition ${
                            isPublished === option.value
                              ? option.value
                                ? "bg-white text-[#39764e] shadow-sm"
                                : "bg-white text-[#555960] shadow-sm"
                              : "text-[#858990] hover:text-[#555960]"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-[#eeeeef] pt-3">
                    {[
                      { label: "Destaque", value: featured, onChange: setFeatured },
                      { label: "Mais vendido", value: bestSeller, onChange: setBestSeller },
                    ].map((item) => (
                      <label
                        key={item.label}
                        className="flex cursor-pointer items-center justify-between rounded-lg px-1 py-2 text-sm text-[#44484f]"
                      >
                        <span>{item.label}</span>
                        <input
                          type="checkbox"
                          checked={item.value}
                          onChange={(e) => item.onChange(e.target.checked)}
                          className="h-4 w-4 accent-[#f47b20]"
                        />
                      </label>
                    ))}
                  </div>
                </section>
              </aside>
          </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-wrap">
          {error}
        </div>
      )}

      <AdminProductPreviewModal product={previewProduct} open={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} />
    </form>
  );
}
