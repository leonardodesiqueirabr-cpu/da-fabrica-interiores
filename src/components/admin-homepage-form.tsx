"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Eye, Loader2, X } from "lucide-react";
import { HomeHeroSection } from "@/components/home-hero-section";
import { HomeSelectionSection } from "@/components/home-selection-section";
import type { HomepageContent, HomepageSectionKey } from "@/types/homepage";

interface AdminHomepageFormProps {
  initialContent: HomepageContent;
}

type SaveStatus = Record<HomepageSectionKey, boolean>;

function isHomepageManagedImage(url: string) {
  return url.includes("/product-images/homepage/") || url.includes("product-images%2Fhomepage%2F");
}

function buildSectionImageAlt(sectionKey: HomepageSectionKey, headline: string) {
  const normalizedHeadline = headline.trim();
  if (normalizedHeadline) {
    return normalizedHeadline;
  }

  return sectionKey === "hero" ? "Banner principal da homepage" : "Imagem da secção Seleção";
}

function SectionPreviewModal({
  open,
  sectionKey,
  content,
  onClose,
}: {
  open: boolean;
  sectionKey: HomepageSectionKey;
  content: HomepageContent;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/45 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col overflow-hidden rounded-xl border border-[#dadde2] bg-white shadow-[0_28px_80px_rgba(10,12,16,0.3)]">
        <div className="flex items-center justify-between border-b border-[#ececef] px-5 py-3.5">
          <h3 className="text-sm font-semibold text-[#222428]">
            Pré-visualização · {sectionKey === "hero" ? "Banner principal" : "Seleção"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#e5e5e8] bg-white px-3 text-sm font-medium text-[#44484f] transition hover:bg-[#f5f5f6]"
          >
            <X size={14} />
            Fechar
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[#f4f4f6] p-4 sm:p-5">
          <div className="overflow-hidden rounded-lg border border-[#e4e5e8] bg-white">
            {sectionKey === "hero" ? <HomeHeroSection content={content.hero} /> : <HomeSelectionSection content={content.selection} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminHomepageForm({ initialContent }: AdminHomepageFormProps) {
  const [content, setContent] = useState<HomepageContent>(initialContent);
  const [saving, setSaving] = useState<SaveStatus>({ hero: false, selection: false });
  const [uploading, setUploading] = useState<SaveStatus>({ hero: false, selection: false });
  const [previewSection, setPreviewSection] = useState<HomepageSectionKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputsRef = useRef<Record<HomepageSectionKey, HTMLInputElement | null>>({ hero: null, selection: null });

  function updateSection<Key extends HomepageSectionKey>(
    sectionKey: Key,
    updater: (current: HomepageContent[Key]) => HomepageContent[Key],
  ) {
    setContent((prev) => ({ ...prev, [sectionKey]: updater(prev[sectionKey]) }));
  }

  async function uploadSectionImage(sectionKey: HomepageSectionKey, file: File) {
    setError(null);
    setMessage(null);
    setUploading((prev) => ({ ...prev, [sectionKey]: true }));

    const section = content[sectionKey];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "homepage");

    const canDeletePrevious = section.imageManaged && isHomepageManagedImage(section.imageUrl);
    if (canDeletePrevious) {
      formData.append("previousUrl", section.imageUrl);
    }

    try {
      const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const result = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !result.url) {
        throw new Error(result.error || "Erro ao substituir imagem.");
      }

      updateSection(sectionKey, (current) => ({
        ...current,
        imageUrl: result.url!,
        imageAlt: buildSectionImageAlt(sectionKey, current.headline),
        imageManaged: true,
      }));
      setMessage("Imagem atualizada. Guarde as alterações para publicar.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Erro ao substituir imagem.");
    } finally {
      setUploading((prev) => ({ ...prev, [sectionKey]: false }));
    }
  }

  async function saveSection(sectionKey: HomepageSectionKey) {
    setError(null);
    setMessage(null);
    setSaving((prev) => ({ ...prev, [sectionKey]: true }));

    const sectionWithNormalizedAlt = {
      ...content[sectionKey],
      imageAlt: buildSectionImageAlt(sectionKey, content[sectionKey].headline),
    };

    updateSection(sectionKey, () => sectionWithNormalizedAlt);

    try {
      const response = await fetch("/api/admin/homepage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionKey,
          section: sectionWithNormalizedAlt,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Erro ao guardar alterações.");
      }

      setMessage(sectionKey === "hero" ? "Banner principal guardado." : "Bloco seleção guardado.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erro ao guardar alterações.");
    } finally {
      setSaving((prev) => ({ ...prev, [sectionKey]: false }));
    }
  }

  return (
    <>
      <div className="mt-6 space-y-8">
        <section className="space-y-5 border-b border-[#ececef] pb-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-[#222428]">Banner principal</h2>
              <p className="text-sm text-[#777b82]">Edite o conteúdo principal da homepage.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewSection("hero")}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e5e5e8] bg-white px-3.5 text-sm font-medium text-[#44484f] transition hover:border-[#f2a064] hover:text-[#d96512]"
              >
                <Eye size={16} />
                Pré-visualizar
              </button>
              <button
                type="button"
                onClick={() => void saveSection("hero")}
                disabled={saving.hero}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f47b20] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#dd6818] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving.hero ? <Loader2 size={16} className="animate-spin" /> : null}
                Guardar alterações
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="relative h-44 overflow-hidden rounded-xl border border-[#e6e6e8] bg-[#f6f6f7]">
                {content.hero.imageUrl ? (
                  <Image src={content.hero.imageUrl} alt={content.hero.imageAlt} fill className="object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-[#8a8f97]">Sem imagem</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputsRef.current.hero?.click()}
                disabled={uploading.hero}
                className="inline-flex h-10 items-center rounded-lg border border-[#e5e5e8] bg-white px-3.5 text-sm font-medium text-[#44484f] transition hover:border-[#f2a064] hover:text-[#d96512] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading.hero ? "A substituir..." : "Substituir imagem"}
              </button>
              <input
                ref={(el) => {
                  fileInputsRef.current.hero = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadSectionImage("hero", file);
                  }
                  event.currentTarget.value = "";
                }}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 md:col-span-1">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-[#858990]">Eyebrow</span>
                <input
                  value={content.hero.eyebrow}
                  onChange={(event) => updateSection("hero", (current) => ({ ...current, eyebrow: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#dfe1e5] bg-white px-3 text-sm text-[#222428] outline-none transition focus:border-[#f2a064]"
                />
              </label>
              <div className="hidden md:block" />
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-[#858990]">Título</span>
                <input
                  value={content.hero.headline}
                  onChange={(event) => updateSection("hero", (current) => ({ ...current, headline: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#dfe1e5] bg-white px-3 text-sm text-[#222428] outline-none transition focus:border-[#f2a064]"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-[#858990]">Descrição</span>
                <textarea
                  rows={4}
                  value={content.hero.description}
                  onChange={(event) => updateSection("hero", (current) => ({ ...current, description: event.target.value }))}
                  className="w-full rounded-lg border border-[#dfe1e5] bg-white px-3 py-2 text-sm text-[#222428] outline-none transition focus:border-[#f2a064]"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-[#858990]">Texto do CTA</span>
                <input
                  value={content.hero.ctaLabel}
                  onChange={(event) => updateSection("hero", (current) => ({ ...current, ctaLabel: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#dfe1e5] bg-white px-3 text-sm text-[#222428] outline-none transition focus:border-[#f2a064]"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-[#858990]">Link do CTA</span>
                <input
                  value={content.hero.ctaHref}
                  onChange={(event) => updateSection("hero", (current) => ({ ...current, ctaHref: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#dfe1e5] bg-white px-3 text-sm text-[#222428] outline-none transition focus:border-[#f2a064]"
                />
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-5 pb-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-[#222428]">Seleção</h2>
              <p className="text-sm text-[#777b82]">Edite o bloco editorial com imagem e chamada para contacto.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewSection("selection")}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e5e5e8] bg-white px-3.5 text-sm font-medium text-[#44484f] transition hover:border-[#f2a064] hover:text-[#d96512]"
              >
                <Eye size={16} />
                Pré-visualizar
              </button>
              <button
                type="button"
                onClick={() => void saveSection("selection")}
                disabled={saving.selection}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f47b20] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#dd6818] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving.selection ? <Loader2 size={16} className="animate-spin" /> : null}
                Guardar alterações
              </button>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="relative h-44 overflow-hidden rounded-xl border border-[#e6e6e8] bg-[#f6f6f7]">
                {content.selection.imageUrl ? (
                  <Image src={content.selection.imageUrl} alt={content.selection.imageAlt} fill className="object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-[#8a8f97]">Sem imagem</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputsRef.current.selection?.click()}
                disabled={uploading.selection}
                className="inline-flex h-10 items-center rounded-lg border border-[#e5e5e8] bg-white px-3.5 text-sm font-medium text-[#44484f] transition hover:border-[#f2a064] hover:text-[#d96512] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading.selection ? "A substituir..." : "Substituir imagem"}
              </button>
              <input
                ref={(el) => {
                  fileInputsRef.current.selection = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadSectionImage("selection", file);
                  }
                  event.currentTarget.value = "";
                }}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-[#858990]">Eyebrow</span>
                <input
                  value={content.selection.eyebrow}
                  onChange={(event) => updateSection("selection", (current) => ({ ...current, eyebrow: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#dfe1e5] bg-white px-3 text-sm text-[#222428] outline-none transition focus:border-[#f2a064]"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-[#858990]">Subheadline</span>
                <input
                  value={content.selection.subheadline}
                  onChange={(event) => updateSection("selection", (current) => ({ ...current, subheadline: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#dfe1e5] bg-white px-3 text-sm text-[#222428] outline-none transition focus:border-[#f2a064]"
                />
              </label>
              <label className="space-y-1 md:col-span-1">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-[#858990]">Kicker</span>
                <input
                  value={content.selection.kicker}
                  onChange={(event) => updateSection("selection", (current) => ({ ...current, kicker: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#dfe1e5] bg-white px-3 text-sm text-[#222428] outline-none transition focus:border-[#f2a064]"
                />
              </label>
              <div className="hidden md:block" />
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-[#858990]">Título</span>
                <input
                  value={content.selection.headline}
                  onChange={(event) => updateSection("selection", (current) => ({ ...current, headline: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#dfe1e5] bg-white px-3 text-sm text-[#222428] outline-none transition focus:border-[#f2a064]"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-[#858990]">Descrição</span>
                <textarea
                  rows={4}
                  value={content.selection.description}
                  onChange={(event) => updateSection("selection", (current) => ({ ...current, description: event.target.value }))}
                  className="w-full rounded-lg border border-[#dfe1e5] bg-white px-3 py-2 text-sm text-[#222428] outline-none transition focus:border-[#f2a064]"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-[#858990]">Texto do CTA</span>
                <input
                  value={content.selection.ctaLabel}
                  onChange={(event) => updateSection("selection", (current) => ({ ...current, ctaLabel: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#dfe1e5] bg-white px-3 text-sm text-[#222428] outline-none transition focus:border-[#f2a064]"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-[#858990]">Link do CTA</span>
                <input
                  value={content.selection.ctaHref}
                  onChange={(event) => updateSection("selection", (current) => ({ ...current, ctaHref: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[#dfe1e5] bg-white px-3 text-sm text-[#222428] outline-none transition focus:border-[#f2a064]"
                />
              </label>
            </div>
          </div>
        </section>

        {message ? <p className="rounded-lg border border-[#e5f0e8] bg-[#f5faf7] px-3 py-2 text-sm text-[#2f6d45]">{message}</p> : null}
        {error ? <p className="rounded-lg border border-[#f0d7d7] bg-[#fff7f7] px-3 py-2 text-sm text-[#b04545]">{error}</p> : null}
      </div>

      <SectionPreviewModal
        open={previewSection !== null}
        sectionKey={previewSection || "hero"}
        content={content}
        onClose={() => setPreviewSection(null)}
      />
    </>
  );
}
