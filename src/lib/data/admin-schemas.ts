import { z } from "zod";

export const productPayloadSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  shortDescription: z.string().optional().default(""),
  description: z.string().optional().default(""),
  basePrice: z.number().nullable(),
  featured: z.boolean(),
  bestSeller: z.boolean(),
  available: z.boolean(),
  characteristics: z.array(z.string()).default([]),
  categories: z.array(z.string()).min(1),
  colors: z.array(z.string()).default([]),
  images: z
    .array(
      z.object({
        url: z.string().min(1),
        alt: z.string().optional().default(""),
        colorName: z.string().optional().default(""),
        colorHex: z.string().optional().default("").nullable(),
        isMain: z.boolean().optional().default(false),
        sortOrder: z.number().optional(),
      }),
    )
    .default([]),
  measurements: z
    .array(
      z.object({
        label: z.string().min(1),
        price: z.number().nullable(),
        active: z.boolean(),
      }),
    )
    .default([]),
  options: z
    .array(
      z.object({
        name: z.string().min(1),
        values: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

export type ProductPayload = z.infer<typeof productPayloadSchema>;

export const quickEditProductSchema = z.object({
  name: z.string().min(2),
  basePrice: z.number().nullable(),
  available: z.boolean(),
  categories: z.array(z.string()).min(1),
});

export type QuickEditPayload = z.infer<typeof quickEditProductSchema>;
