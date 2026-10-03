import { z } from "zod";

const productFieldsSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  shortDescription: z.string().optional().default(""),
  description: z.string().optional().default(""),
  basePrice: z.number().nullable(),
  featured: z.boolean(),
  bestSeller: z.boolean(),
  characteristics: z.array(z.string()).default([]),
  categories: z.array(z.string()).min(1),
  colors: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        hex: z.string().optional().default("").nullable(),
        position: z.number().optional(),
      }),
    )
    .default([]),
  images: z
    .array(
      z.object({
        id: z.string().optional(),
        url: z.string().min(1),
        alt: z.string().optional().default(""),
        colorId: z.string().optional().nullable(),
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

export const productCreateSchema = productFieldsSchema.extend({
  isPublished: z.boolean().default(true),
});

export const productUpdateSchema = productFieldsSchema.extend({
  isPublished: z.boolean().optional(),
});

export type ProductCreatePayload = z.infer<typeof productCreateSchema>;
export type ProductUpdatePayload = z.infer<typeof productUpdateSchema>;

export const quickEditProductSchema = z.object({
  name: z.string().min(2).optional(),
  basePrice: z.number().nullable().optional(),
  isPublished: z.boolean().optional(),
  categories: z.array(z.string()).min(1).optional(),
}).refine((payload) => Object.values(payload).some((value) => value !== undefined), {
  message: "Indique pelo menos um campo para atualizar.",
});

export type QuickEditPayload = z.infer<typeof quickEditProductSchema>;
