"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { toSlug } from "@/lib/utils/text";
import type { Product } from "@/types/catalog";
import { ADMIN_CATEGORIES } from "@/lib/data/categories";

interface AdminProductFormProps {
  mode: "create" | "edit";
  product?: Product;
}

interface EditableImage {
  url: string;
  alt: string;
  colorName?: string;
  colorHex?: string;
  isMain: boolean;
  uploading?: boolean;
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

const STEPS = ["Edição", "Revisão"] as const;

export function AdminProductForm({ mode, product }: AdminProductFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stepIndex, setStepIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ler step da URL ao carregar
  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (stepParam) {
      const step = parseInt(stepParam, 10);
      if (!isNaN(step) && step >= 0 && step < STEPS.length) {
        setStepIndex(step);
      }
    }
    setIsInitialized(true);
  }, [searchParams]);

  const [name, setName] = useState(product?.name || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const [description, setDescription] = useState(product?.description || "");
  const [basePrice, setBasePrice] = useState(product?.basePrice?.toString() || "");
  const [characteristicsText, setCharacteristicsText] = useState((product?.characteristics || []).join("\n"));
  const [featured, setFeatured] = useState(product?.featured || false);
  const [bestSeller, setBestSeller] = useState(product?.bestSeller || false);
  const [isPublished, setIsPublished] = useState(product?.isPublished ?? true);
  const [categories, setCategories] = useState<string[]>(product?.categories || []);
  const [images, setImages] = useState<EditableImage[]>(
    product?.images.map((img) => ({
      url: img.url,
      alt: img.alt,
      colorName: img.colorName,
      colorHex: img.colorHex,
      isMain: img.isMain,
    })) || [],
  );
  const [measurements, setMeasurements] = useState<EditableMeasure[]>(
    product?.measurements.map((m) => ({
      label: m.label,
      price: m.price?.toString() || "",
      active: m.active,
    })) || [{ label: "", price: "", active: true }],
  );
  const [options, setOptions] = useState<EditableOption[]>(
    product?.options.map((o) => ({ name: o.name, values: o.values.join(", ") })) || [],
  );

  const canSubmit = useMemo(
    () => Boolean(name.trim() && slug.trim() && categories.length > 0),
    [name, slug, categories.length],
  );

  async function uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
    const result = (await response.json()) as { url?: string; error?: string };
    if (!response.ok) throw new Error(result.error || "Erro no upload");
    return result.url!;
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
            prev.map((img, idx) => (idx === startIndex + i ? { ...img, url, uploading: false } : img)),
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erro no upload");
          setImages((prev) => prev.filter((_, idx) => idx !== startIndex + i));
        }
      }),
    );
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
        images: images
          .filter((img) => img.url.trim())
          .map((img, idx) => ({
            url: img.url,
            alt: img.alt || name,
            colorName: img.colorName || null,
            colorHex: img.colorHex || null,
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

  function handleStepChange(newStep: number, e?: React.MouseEvent) {
    e?.preventDefault();
    setStepIndex(newStep);
    const params = new URLSearchParams(searchParams);
    params.set("step", newStep.toString());
    router.push(`?${params.toString()}`);
  }

  return (
    <form id="admin-product-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {/* Step tabs */}
      <div className="flex w-fit max-w-full items-center gap-1 border-b border-[#e8e8eb]">
        {STEPS.map((step, index) => (
          <button
            key={step}
            type="button"
            onClick={(e) => handleStepChange(index, e)}
            className={`flex items-center justify-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-semibold transition sm:px-4 ${
              stepIndex === index
                ? "border-[#e98a47] text-[#37393e]"
                : index < stepIndex
                  ? "border-transparent text-[#555960] hover:text-[#292b30]"
                  : "border-transparent text-[#92959b] hover:text-[#555960]"
            }`}
          >
            <span className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
              stepIndex === index ? "bg-[#f8e8dc] text-[#a95622]" : "bg-[#f0f0f1] text-[#777b82]"
            }`}>
              {index < stepIndex ? "✓" : index + 1}
            </span>
            <span>{step}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-transparent">
        {/* ── Step 1: Edição (Informações + Imagens + Medidas + Opções) ── */}
        {stepIndex === 0 && (
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

              {/* Image grid */}
              {images.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {images.map((img, index) => (
                    <div key={index} className="min-w-0 space-y-2 rounded-lg border border-[#ededf0] bg-white p-2">
                      {/* Preview */}
                      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#f2f2f3]">
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
                      </div>

                      <input
                        placeholder="Texto alternativo (ex: Sofá bege)"
                        value={img.alt}
                        onChange={(e) =>
                          setImages((prev) => prev.map((item, i) => (i === index ? { ...item, alt: e.target.value } : item)))
                        }
                        className="w-full rounded-md border border-[#e7e7e9] bg-[#fcfcfd] px-2.5 py-1.5 text-xs outline-none focus:border-[#f2a064] focus:ring-2 focus:ring-[#f47b20]/10"
                      />

                      <div className="flex gap-2">
                        <input
                          placeholder="Nome da cor"
                          value={img.colorName || ""}
                          onChange={(e) =>
                            setImages((prev) => prev.map((item, i) => (i === index ? { ...item, colorName: e.target.value } : item)))
                          }
                          className="min-w-0 flex-1 rounded-md border border-[#e7e7e9] bg-[#fcfcfd] px-2.5 py-1.5 text-xs outline-none focus:border-[#f2a064] focus:ring-2 focus:ring-[#f47b20]/10"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="color"
                            title="Selector de cor"
                            value={img.colorHex || "#cccccc"}
                            onChange={(e) =>
                              setImages((prev) => prev.map((item, i) => (i === index ? { ...item, colorHex: e.target.value } : item)))
                            }
                            className="h-8 w-9 cursor-pointer rounded-md border border-[#e7e7e9] p-0.5"
                          />
                          <input
                            type="text"
                            placeholder="#cccccc"
                            value={img.colorHex || "#cccccc"}
                            maxLength={7}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^#[0-9A-Fa-f]{6}$/.test(val) || val === "") {
                                setImages((prev) => prev.map((item, i) => (i === index ? { ...item, colorHex: val || "#cccccc" } : item)));
                              }
                            }}
                            className="w-[4.5rem] rounded-md border border-[#e7e7e9] bg-[#fcfcfd] px-2 py-1.5 text-xs font-mono outline-none focus:border-[#f2a064] focus:ring-2 focus:ring-[#f47b20]/10"
                          />
                        </div>
                      </div>

                      <label className="flex cursor-pointer items-center gap-2 rounded-md bg-[#fff7f0] px-2.5 py-2 text-xs font-medium text-[#99511e]">
                        <input
                          type="checkbox"
                          checked={img.isMain}
                          onChange={(e) =>
                            setImages((prev) =>
                              prev.map((item, i) => ({ ...item, isMain: i === index ? e.target.checked : false })),
                            )
                          }
                          className="accent-[var(--accent)]"
                        />
                        Imagem principal
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Medidas e Opções ── */}
            <section className="space-y-5 rounded-xl border border-[#e9e9ec] bg-white p-4 sm:p-5">
              {/* Measurements */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-[#292b30]">Medidas e variantes</h2>
                    <p className="mt-1 text-xs text-[#858990]">Defina tamanhos, preços e disponibilidade de cada medida.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMeasurements((prev) => [...prev, { label: "", price: "", active: true }])}
                    className="shrink-0 rounded-lg border border-[#e7e7e9] px-3 py-2 text-xs font-semibold text-[#555960] transition hover:border-[#f2a064] hover:text-[#d96512]"
                  >
                    + Adicionar
                  </button>
                </div>

                {measurements.length > 0 ? (
                  <div className="space-y-2">
                    {measurements.map((measure, index) => (
                      <div
                        key={index}
                        className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-[#ededf0] bg-[#fcfcfd] p-2.5 sm:flex-nowrap"
                      >
                        <input
                          placeholder="Medida (ex: 2 lugares, 160×200)"
                          value={measure.label}
                          onChange={(e) =>
                            setMeasurements((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)),
                            )
                          }
                          className="min-w-0 flex-1 rounded-md border border-[#e5e5e8] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#f2a064] focus:ring-2 focus:ring-[#f47b20]/10"
                        />
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--muted)]">€</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={measure.price}
                            onChange={(e) =>
                              setMeasurements((prev) =>
                                prev.map((item, i) => (i === index ? { ...item, price: e.target.value } : item)),
                              )
                            }
                            className="w-28 rounded-md border border-[#e5e5e8] bg-white py-1.5 pl-6 pr-2.5 text-sm outline-none focus:border-[#f2a064] focus:ring-2 focus:ring-[#f47b20]/10"
                          />
                        </div>
                        <label className="flex items-center gap-1.5 whitespace-nowrap text-xs">
                          <input
                            type="checkbox"
                            checked={measure.active}
                            onChange={(e) =>
                              setMeasurements((prev) =>
                                prev.map((item, i) => (i === index ? { ...item, active: e.target.checked } : item)),
                              )
                            }
                            className="accent-[var(--accent)]"
                          />
                          Disponível
                        </label>
                        <button
                          type="button"
                          title="Remover"
                          onClick={() => setMeasurements((prev) => prev.filter((_, i) => i !== index))}
                          className="flex h-7 w-7 items-center justify-center rounded text-[var(--muted)] transition hover:bg-red-50 hover:text-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg bg-[#f8f8f9] px-3 py-3 text-center text-xs text-[#858990]">
                    Nenhuma medida adicionada.
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3 border-t border-[#eeeeef] pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-[#3b3e43]">Opções personalizadas</h2>
                    <p className="mt-1 text-xs text-[#858990]">Campos extra, como cor do tecido ou tipo de pé.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOptions((prev) => [...prev, { name: "", values: "" }])}
                    className="shrink-0 rounded-lg border border-[#e7e7e9] px-3 py-2 text-xs font-semibold text-[#555960] transition hover:border-[#f2a064] hover:text-[#d96512]"
                  >
                    + Adicionar
                  </button>
                </div>

                {options.length > 0 ? (
                  <div className="space-y-2">
                    {options.map((option, index) => (
                      <div
                        key={index}
                        className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-[#ededf0] bg-[#fcfcfd] p-2.5 sm:flex-nowrap"
                      >
                        <input
                          placeholder="Nome da opção (ex: Cor do tecido)"
                          value={option.name}
                          onChange={(e) =>
                            setOptions((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)),
                            )
                          }
                          className="w-full min-w-0 rounded-md border border-[#e5e5e8] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#f2a064] focus:ring-2 focus:ring-[#f47b20]/10 sm:w-48 sm:shrink-0"
                        />
                        <input
                          placeholder="Valores separados por vírgula (ex: Bege, Cinza, Azul)"
                          value={option.values}
                          onChange={(e) =>
                            setOptions((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, values: e.target.value } : item)),
                            )
                          }
                          className="min-w-0 flex-1 rounded-md border border-[#e5e5e8] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#f2a064] focus:ring-2 focus:ring-[#f47b20]/10"
                        />
                        <button
                          type="button"
                          title="Remover"
                          onClick={() => setOptions((prev) => prev.filter((_, i) => i !== index))}
                          className="flex h-7 w-7 items-center justify-center rounded text-[var(--muted)] transition hover:bg-red-50 hover:text-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg bg-[#f8f8f9] px-3 py-3 text-center text-xs text-[#858990]">
                    Nenhuma opção adicionada.
                  </p>
                )}
              </div>
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
        )}

        {/* ── Step 2: Revisão ── */}
        {stepIndex === 1 && (
          <div className="space-y-5 rounded-xl border border-[#e9e9ec] bg-white p-4 text-sm sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="min-w-0 space-y-1 rounded-lg bg-[#f8f8f9] p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Nome</p>
                <p className="truncate font-medium text-[#292b30]">{name || "—"}</p>
              </div>
              <div className="min-w-0 space-y-1 rounded-lg bg-[#f8f8f9] p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Slug</p>
                <p className="truncate font-mono text-xs text-[#555960]">/produto/{slug || "—"}</p>
              </div>
              <div className="space-y-1 rounded-lg bg-[#f8f8f9] p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Preço base</p>
                <p className="font-medium text-[#292b30]">{basePrice ? `€ ${Number(basePrice).toFixed(2)}` : "Consultar preço"}</p>
              </div>
              <div className="min-w-0 space-y-1 rounded-lg bg-[#f8f8f9] p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Categorias</p>
                <p className="truncate text-[#555960]">{categories.length ? categories.join(", ") : "—"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {featured && (
                <span className="rounded-full bg-[#fff6eb] px-2.5 py-1 text-xs font-medium text-[#8c5d2d]">
                  Destaque
                </span>
              )}
              {bestSeller && (
                <span className="rounded-full bg-[#f5f5f6] px-2.5 py-1 text-xs font-medium text-[#555960]">
                  Mais vendido
                </span>
              )}
              {isPublished ? (
                <span className="rounded-full bg-[#edf5ef] px-2.5 py-1 text-xs font-medium text-[#477052]">
                  Publicado
                </span>
              ) : (
                <span className="rounded-full bg-[#f1f1f2] px-2.5 py-1 text-xs font-medium text-[#656970]">
                  Oculto
                </span>
              )}
            </div>

            {description && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Descrição (como aparece no site)</p>
                <p className="line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">{description}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Imagens <span className="font-medium text-[#a0a2a7]">· {images.filter((img) => img.url).length}</span>
              </p>
              {images.filter((img) => img.url).length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {images
                    .filter((img) => img.url)
                    .map((img, idx) => (
                      <figure key={idx} className="w-[150px] shrink-0">
                        <div
                          className={`relative aspect-[4/3] overflow-hidden rounded-lg border ${img.isMain ? "border-[#e8c4a8]" : "border-[#ececef]"}`}
                        >
                          <Image
                            src={img.url}
                            alt={img.alt || "Imagem"}
                            fill
                            sizes="150px"
                            className="object-cover"
                          />
                        </div>
                        {img.isMain && (
                          <figcaption className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-[#8e572f]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#e98a47]" />
                            Principal
                          </figcaption>
                        )}
                      </figure>
                    ))}
                </div>
              ) : (
                <p className="text-[var(--muted)]">Nenhuma imagem</p>
              )}
            </div>

            {measurements.filter((m) => m.label).length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Medidas</p>
                <ul className="space-y-0.5 pl-4 text-[var(--muted)]">
                  {measurements
                    .filter((m) => m.label)
                    .map((m, idx) => (
                      <li key={idx} className="list-disc">
                        {m.label}
                        {m.price ? ` — € ${Number(m.price).toFixed(2)}` : ""}
                        {!m.active ? " (indisponível)" : ""}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {!canSubmit && (
              <div className="rounded-lg bg-[#fff8ef] px-3 py-2.5 text-sm text-[#805b36]">
                Preencha o nome, slug e pelo menos uma categoria antes de gravar.
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-wrap">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[#e8e8eb] py-3">
        <button
          type="button"
          disabled={stepIndex === 0}
          onClick={(e) => handleStepChange(Math.max(0, stepIndex - 1), e)}
          className="rounded-lg border border-[#e5e5e8] px-4 py-2 text-sm font-semibold text-[#555960] transition hover:bg-[#f6f6f7] disabled:opacity-40"
        >
          ← Anterior
        </button>

        {stepIndex < STEPS.length - 1 ? (
          <button
            key="next-step"
            type="button"
            onClick={(e) => handleStepChange(stepIndex + 1, e)}
            className="rounded-lg bg-[#303238] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f2024]"
          >
            Próximo →
          </button>
        ) : (
          <button
            key="submit"
            type="submit"
            disabled={!canSubmit || loading}
            className="rounded-lg bg-[#f47b20] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#dd6818] disabled:opacity-60"
          >
            {loading ? "A gravar…" : mode === "create" ? "Criar produto" : "Guardar alterações"}
          </button>
        )}
      </div>
    </form>
  );
}
