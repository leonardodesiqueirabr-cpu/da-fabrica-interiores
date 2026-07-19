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
  const [available, setAvailable] = useState(product?.available ?? true);
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
        available,
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step tabs */}
      <div className="flex overflow-hidden rounded-xl border border-[var(--border)]">
        {STEPS.map((step, index) => (
          <button
            key={step}
            type="button"
            onClick={(e) => handleStepChange(index, e)}
            className={`flex flex-1 items-center justify-center gap-2 border-r border-[var(--border)] px-3 py-3 text-xs font-semibold uppercase tracking-wide transition last:border-r-0 ${
              stepIndex === index
                ? "bg-[var(--accent)] text-white"
                : index < stepIndex
                  ? "bg-[var(--surface-soft)] text-[var(--foreground)]"
                  : "bg-[var(--surface)] text-[var(--muted)]"
            }`}
          >
            <span
              className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                stepIndex === index
                  ? "bg-white/20 text-white"
                  : index < stepIndex
                    ? "bg-[var(--foreground)] text-white"
                    : "bg-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {index < stepIndex ? "✓" : index + 1}
            </span>
            <span className="hidden sm:inline">{step}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        {/* ── Step 1: Edição (Informações + Imagens + Medidas + Opções) ── */}
        {stepIndex === 0 && (
          <div className="space-y-8">
            {/* ── Informações ── */}
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Nome do produto *</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!product) setSlug(toSlug(e.target.value));
                    }}
                    placeholder="Ex: Sofá London 3 lugares"
                    className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  />
                </label>
                <input type="hidden" value={slug} readOnly />
              </div>

              <div className="space-y-1.5 text-sm">
                <span className="font-medium">Descrição do produto</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Ex: Estrutura robusta em madeira, tecido de alta durabilidade, almofadas removíveis..."
                  className="w-full resize-none rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Preço de venda (€)</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)]">€</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="0,00"
                      className="w-full rounded-lg border border-[var(--border)] bg-white py-2.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    />
                  </div>
                </label>
              </div>

              <div className="space-y-1.5 text-sm">
                <span className="font-medium">Pontos de destaque do produto</span>
                <p className="text-xs text-[var(--muted)]">Escreva um ponto por linha. Aparecem como lista na página do produto.</p>
                <textarea
                  value={characteristicsText}
                  onChange={(e) => setCharacteristicsText(e.target.value)}
                  rows={4}
                  placeholder={"Estrutura em madeira maciça\nTecido anti-manchas certificado\nAlmofadas removíveis e laváveis"}
                  className="w-full resize-none rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Categorias *</p>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {ADMIN_CATEGORIES.map((cat) => (
                    <label
                      key={cat.slug}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
                        categories.includes(cat.slug)
                          ? "border-[var(--accent)] bg-[var(--accent)]/5 font-medium text-[var(--accent)]"
                          : "border-[var(--border)] hover:border-[var(--accent)]/40"
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
                        className="accent-[var(--accent)]"
                      />
                      {cat.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {[
                  { label: "Destaque", value: featured, onChange: setFeatured },
                  { label: "Mais vendido", value: bestSeller, onChange: setBestSeller },
                  { label: "Disponível", value: available, onChange: setAvailable },
                ].map((item) => (
                  <label
                    key={item.label}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition ${
                      item.value
                        ? "border-[var(--accent)] bg-[var(--accent)]/5 font-medium"
                        : "border-[var(--border)] hover:border-[var(--accent)]/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.value}
                      onChange={(e) => item.onChange(e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            {/* ── Imagens ── */}
            <div className="border-t border-[var(--border)] pt-8 space-y-6">
              <div>
                <h3 className="font-semibold">Imagens do produto</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Arraste ficheiros para a área abaixo ou clique para selecionar. Pode enviar várias imagens de uma vez.
                </p>
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
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-14 transition ${
                  dragActive
                    ? "border-[var(--accent)] bg-[var(--accent)]/5"
                    : "border-[var(--border)] hover:border-[var(--accent)]/50 hover:bg-[var(--surface-soft)]"
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-soft)]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-[var(--muted)]"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">
                    {dragActive ? "Solte as imagens aqui" : "Arraste imagens ou clique para selecionar"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">JPG, PNG ou WEBP · Máx. 5 MB por imagem</p>
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {images.map((img, index) => (
                    <div key={index} className="space-y-2 rounded-xl border border-[var(--border)] p-3">
                      {/* Preview */}
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-[var(--surface-soft)]">
                        {img.uploading ? (
                          <div className="flex h-full items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                          </div>
                        ) : img.url ? (
                          <Image src={img.url} alt={img.alt || "Imagem do produto"} fill className="object-cover" />
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm font-bold text-white transition hover:bg-red-600"
                        >
                          ×
                        </button>

                        {img.isMain && (
                          <span className="absolute left-2 top-2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow">
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
                        className="w-full rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
                      />

                      <div className="flex gap-2">
                        <input
                          placeholder="Nome da cor"
                          value={img.colorName || ""}
                          onChange={(e) =>
                            setImages((prev) => prev.map((item, i) => (i === index ? { ...item, colorName: e.target.value } : item)))
                          }
                          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="color"
                            title="Selector de cor"
                            value={img.colorHex || "#cccccc"}
                            onChange={(e) =>
                              setImages((prev) => prev.map((item, i) => (i === index ? { ...item, colorHex: e.target.value } : item)))
                            }
                            className="h-8 w-10 cursor-pointer rounded-lg border border-[var(--border)] p-0.5"
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
                            className="w-20 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
                          />
                        </div>
                      </div>

                      <label className="flex cursor-pointer items-center gap-2 text-xs">
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
            </div>

            {/* ── Medidas e Opções ── */}
            <div className="border-t border-[var(--border)] pt-8 space-y-8">
              {/* Measurements */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">Medidas e preços</h3>
                    <p className="text-sm text-[var(--muted)]">Variações de tamanho disponíveis para o produto.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMeasurements((prev) => [...prev, { label: "", price: "", active: true }])}
                    className="shrink-0 rounded-full border border-[var(--border)] px-4 py-2 text-xs font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    + Adicionar
                  </button>
                </div>

                {measurements.length > 0 ? (
                  <div className="space-y-2">
                    {measurements.map((measure, index) => (
                      <div
                        key={index}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] p-3"
                      >
                        <input
                          placeholder="Medida (ex: 2 lugares, 160×200)"
                          value={measure.label}
                          onChange={(e) =>
                            setMeasurements((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)),
                            )
                          }
                          className="min-w-0 flex-1 rounded border border-[var(--border)] px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
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
                            className="w-28 rounded border border-[var(--border)] py-1.5 pl-6 pr-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
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
                  <p className="rounded-lg border border-dashed border-[var(--border)] py-8 text-center text-sm text-[var(--muted)]">
                    Nenhuma medida adicionada.
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">Opções personalizadas</h3>
                    <p className="text-sm text-[var(--muted)]">Campos extras como cor do tecido, tipo de pé, etc.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOptions((prev) => [...prev, { name: "", values: "" }])}
                    className="shrink-0 rounded-full border border-[var(--border)] px-4 py-2 text-xs font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    + Adicionar
                  </button>
                </div>

                {options.length > 0 ? (
                  <div className="space-y-2">
                    {options.map((option, index) => (
                      <div
                        key={index}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] p-3"
                      >
                        <input
                          placeholder="Nome da opção (ex: Cor do tecido)"
                          value={option.name}
                          onChange={(e) =>
                            setOptions((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)),
                            )
                          }
                          className="w-48 shrink-0 rounded border border-[var(--border)] px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
                        />
                        <input
                          placeholder="Valores separados por vírgula (ex: Bege, Cinza, Azul)"
                          value={option.values}
                          onChange={(e) =>
                            setOptions((prev) =>
                              prev.map((item, i) => (i === index ? { ...item, values: e.target.value } : item)),
                            )
                          }
                          className="min-w-0 flex-1 rounded border border-[var(--border)] px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
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
                  <p className="rounded-lg border border-dashed border-[var(--border)] py-8 text-center text-sm text-[var(--muted)]">
                    Nenhuma opção adicionada.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Revisão ── */}
        {stepIndex === 1 && (
          <div className="space-y-6 text-sm">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Nome</p>
                <p className="font-medium">{name || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Slug</p>
                <p className="font-mono text-xs">/produto/{slug || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Preço base</p>
                <p>{basePrice ? `€ ${Number(basePrice).toFixed(2)}` : "Consultar preço"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Categorias</p>
                <p>{categories.length ? categories.join(", ") : "—"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {featured && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  Destaque
                </span>
              )}
              {bestSeller && (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  Mais vendido
                </span>
              )}
              {available ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Disponível
                </span>
              ) : (
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                  Indisponível
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
                Imagens ({images.filter((img) => img.url).length})
              </p>
              {images.filter((img) => img.url).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {images
                    .filter((img) => img.url)
                    .map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 ${img.isMain ? "border-[var(--accent)]" : "border-[var(--border)]"}`}
                      >
                        <Image src={img.url} alt={img.alt || "Imagem"} fill className="object-cover" />
                      </div>
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
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
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

      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={stepIndex === 0}
          onClick={(e) => handleStepChange(Math.max(0, stepIndex - 1), e)}
          className="rounded-full border border-[var(--border)] px-6 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          ← Anterior
        </button>

        {stepIndex < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={(e) => handleStepChange(stepIndex + 1, e)}
            className="rounded-full bg-[var(--foreground)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-80"
          >
            Próximo →
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="rounded-full bg-[var(--accent)] px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:opacity-60"
          >
            {loading ? "A gravar…" : mode === "create" ? "Criar produto" : "Guardar alterações"}
          </button>
        )}
      </div>
    </form>
  );
}
