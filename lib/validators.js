import { z } from "zod";

function normalizeImageUrl(value) {
  if (typeof value !== "string") return "";
  let text = value.trim();
  if (!text) return "";

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }

  if (!text) return "";
  if (!/^https?:\/\//i.test(text) && /^[\w.-]+\.[A-Za-z]{2,}(\/.*)?$/.test(text)) {
    text = `https://${text}`;
  }
  return text;
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const signupSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(100)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100)
});

export const productSchema = z.object({
  name: z.string().min(2).max(150),
  category: z.string().min(2).max(60),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  description: z.string().min(5).max(3000),
  images: z
    .array(
      z
        .string()
        .transform((value) => normalizeImageUrl(value))
        .refine((value) => isHttpUrl(value), { message: "Image URL must be a valid http/https URL" })
    )
    .min(1)
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(2).max(1000)
});

export const bookingSchema = z.object({
  date: z.string().min(8),
  time: z.string().min(3)
});

export function validate(schema, body) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => issue.message)
    };
  }
  return { ok: true, data: parsed.data };
}
