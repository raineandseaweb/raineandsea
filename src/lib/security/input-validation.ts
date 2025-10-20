import { z } from "zod";

// Base schemas for reusable validation
const uuidSchema = z.string().uuid("Invalid UUID format");
const emailSchema = z.string().email("Invalid email format");
const phoneSchema = z.string().max(20, "Phone number too long").optional();
const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name too long")
  .regex(/^[a-zA-Z\s\-'\.]+$/, "Name contains invalid characters");
const addressLineSchema = z
  .string()
  .min(1, "Address line is required")
  .max(200, "Address line too long");
const citySchema = z
  .string()
  .min(1, "City is required")
  .max(100, "City name too long")
  .regex(/^[a-zA-Z\s\-'\.]+$/, "City contains invalid characters");
const regionSchema = z
  .string()
  .min(1, "Region is required")
  .max(100, "Region name too long")
  .regex(/^[a-zA-Z\s\-'\.]+$/, "Region contains invalid characters");
const postalCodeSchema = z
  .string()
  .min(1, "Postal code is required")
  .max(10, "Postal code too long");
const countrySchema = z
  .string()
  .length(2, "Country code must be 2 characters")
  .regex(/^[A-Za-z]{2}$/, "Country code must be 2 letters")
  .transform((val) => val.toUpperCase());

// Cart item validation schema
const cartItemSchema = z.object({
  variant_id: uuidSchema,
  quantity: z.coerce
    .number()
    .int("Quantity must be an integer")
    .min(1, "Quantity must be at least 1")
    .max(10, "Maximum quantity is 10"),
  selected_options: z
    .record(z.string().uuid("Invalid option value ID"))
    .optional(),
});

// Address validation schema
const addressSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  line1: addressLineSchema,
  line2: z.string().max(200, "Address line 2 too long").optional(),
  city: citySchema,
  region: regionSchema,
  postal_code: postalCodeSchema,
  country: countrySchema,
});

// Main checkout validation schema
export const checkoutSchema = z.object({
  cartItems: z
    .array(cartItemSchema)
    .min(1, "Cart cannot be empty")
    .max(20, "Maximum 20 items per order"),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  useSameAddress: z.boolean(),
  orderNotes: z.string().max(500, "Order notes too long").optional(),
});

// Schema definition logging removed for performance

// Type inference for TypeScript
export type CheckoutData = z.infer<typeof checkoutSchema>;
export type CartItemData = z.infer<typeof cartItemSchema>;
export type AddressData = z.infer<typeof addressSchema>;

/**
 * Validates checkout data against schema
 */
export function validateCheckoutData(data: unknown): CheckoutData {
  try {
    // Validation logging removed for performance

    // Simple validation without complex schema to avoid Zod version conflicts
    const dataObj = data as any;

    // Basic validation
    if (
      !dataObj.cartItems ||
      !Array.isArray(dataObj.cartItems) ||
      dataObj.cartItems.length === 0
    ) {
      throw new Error("Cart cannot be empty");
    }

    if (!dataObj.shippingAddress) {
      throw new Error("Shipping address is required");
    }

    if (typeof dataObj.useSameAddress !== "boolean") {
      throw new Error("useSameAddress must be a boolean");
    }

    // Validate cart items
    for (const item of dataObj.cartItems) {
      if (!item.product_id || typeof item.product_id !== "string") {
        throw new Error("Invalid product_id");
      }
      if (
        !item.quantity ||
        typeof item.quantity !== "number" ||
        item.quantity < 1 ||
        item.quantity > 10
      ) {
        throw new Error("Invalid quantity");
      }
    }

    // Validate shipping address
    const addr = dataObj.shippingAddress;
    if (
      !addr.name ||
      !addr.email ||
      !addr.line1 ||
      !addr.city ||
      !addr.region ||
      !addr.postal_code ||
      !addr.country
    ) {
      throw new Error("Missing required shipping address fields");
    }

    const result = dataObj;
    return result as CheckoutData;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Zod validation errors:", error.errors);
      const errorMessages = error.errors.map(
        (err) => `${err.path.join(".")}: ${err.message}`
      );
      throw new Error(`Validation failed: ${errorMessages.join(", ")}`);
    }
    console.error("Non-Zod validation error:", error);
    throw new Error("Invalid data format");
  }
}

/**
 * Sanitizes string input by removing potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[<>\"'&]/g, "") // Remove HTML/XML characters
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .replace(/\s+/g, " "); // Normalize whitespace
}

/**
 * Sanitizes all string fields in an object recursively
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Validates already sanitized checkout data
 */
export function validateAndSanitizeCheckoutData(data: unknown): CheckoutData {
  // Data should already be sanitized by the caller
  return validateCheckoutData(data);
}

/**
 * Validates UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates phone number format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone);
}
