import { z } from "zod";

// Product validation schemas
export const productSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["active", "inactive", "draft"]),
});

export const variantSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  title: z.string().min(1, "Title is required"),
  barcode: z.string().optional(),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
  weight: z.number().positive().optional(),
});

export const priceSchema = z.object({
  currency: z.string().length(3),
  amount: z.number().positive(),
  compare_at_amount: z.number().positive().optional(),
  starts_at: z.date().optional(),
  ends_at: z.date().optional(),
});

// Customer validation schemas
export const customerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").optional(),
  phone: z.string().optional(),
});

export const addressSchema = z.object({
  type: z.enum(["billing", "shipping"]),
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  region: z.string().min(1, "Region is required"),
  postal_code: z.string().min(1, "Postal code is required"),
  country: z.string().length(2, "Country code must be 2 characters"),
  is_default: z.boolean().default(false),
});

// Cart validation schemas
export const cartItemSchema = z.object({
  variant_id: z.string().uuid(),
  quantity: z.number().int().positive("Quantity must be positive"),
});

export const promotionSchema = z.object({
  code: z.string().min(1, "Promotion code is required"),
  type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
  value: z.number().positive(),
  starts_at: z.date().optional(),
  ends_at: z.date().optional(),
  usage_limit: z.number().int().positive().optional(),
});

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^a-zA-Z0-9]/,
    "Password must contain at least one special character"
  );

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
});

// Search validation
export const searchSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z
    .enum(["relevance", "price_asc", "price_desc", "newest"])
    .default("relevance"),
  in_stock_only: z.coerce.boolean().default(false),
  category: z.string().optional(),
  filters: z.record(z.string(), z.any()).optional(),
});
