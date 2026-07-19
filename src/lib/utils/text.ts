import slugify from "slugify";

export const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const toSlug = (value: string) =>
  slugify(value, {
    lower: true,
    strict: true,
    locale: "pt",
    trim: true,
  });

export const stripHtml = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
