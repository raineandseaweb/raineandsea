import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  try {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [], // No attributes allowed
    });
  } catch (error) {
    console.error("HTML sanitization error:", error);
    return "";
  }
}

/**
 * Sanitizes plain text by removing dangerous characters
 */
export function sanitizeText(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[<>\"'&]/g, "") // Remove HTML/XML characters
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .slice(0, 1000); // Limit length
}

/**
 * Sanitizes email addresses
 */
export function sanitizeEmail(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, "") // Keep only valid email characters
    .slice(0, 254); // Email length limit
}

/**
 * Sanitizes phone numbers
 */
export function sanitizePhone(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[^\d\s\-\(\)\+]/g, "") // Keep only valid phone characters
    .slice(0, 20); // Phone length limit
}

/**
 * Sanitizes names (first name, last name, etc.)
 */
export function sanitizeName(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[^a-zA-Z\s\-'\.]/g, "") // Keep only valid name characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .slice(0, 100); // Name length limit
}

/**
 * Sanitizes addresses
 */
export function sanitizeAddress(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[<>\"'&]/g, "") // Remove HTML/XML characters
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .slice(0, 200); // Address length limit
}

/**
 * Sanitizes city names
 */
export function sanitizeCity(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[^a-zA-Z\s\-'\.]/g, "") // Keep only valid city characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .slice(0, 100); // City length limit
}

/**
 * Sanitizes postal codes
 */
export function sanitizePostalCode(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[^0-9\-]/g, "") // Keep only digits and hyphens
    .slice(0, 10); // Postal code length limit
}

/**
 * Sanitizes country codes
 */
export function sanitizeCountryCode(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "") // Keep only uppercase letters
    .slice(0, 2); // Country code length limit
}

/**
 * Sanitizes order notes
 */
export function sanitizeOrderNotes(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[<>\"'&]/g, "") // Remove HTML/XML characters
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .slice(0, 500); // Order notes length limit
}

/**
 * Sanitizes UUIDs
 */
export function sanitizeUUID(input: string): string {
  if (typeof input !== "string") {
    return input;
  }

  const sanitized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-f0-9\-]/g, "") // Keep only valid UUID characters
    .slice(0, 36); // UUID length limit

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  return uuidRegex.test(sanitized) ? sanitized : input;
}

/**
 * Sanitizes numeric values
 */
export function sanitizeNumber(input: any): number {
  if (typeof input === "number" && !isNaN(input) && isFinite(input)) {
    return input;
  }

  if (typeof input === "string") {
    const parsed = parseFloat(input);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

/**
 * Sanitizes integer values
 */
export function sanitizeInteger(input: any): number {
  const num = sanitizeNumber(input);
  return Math.floor(Math.abs(num));
}

/**
 * Sanitizes boolean values
 */
export function sanitizeBoolean(input: any): boolean {
  if (typeof input === "boolean") {
    return input;
  }

  if (typeof input === "string") {
    const lower = input.toLowerCase();
    return lower === "true" || lower === "1" || lower === "yes";
  }

  if (typeof input === "number") {
    return input !== 0;
  }

  return false;
}

/**
 * Sanitizes an object recursively
 */
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizeText(obj);
  }

  if (typeof obj === "number") {
    return sanitizeNumber(obj);
  }

  if (typeof obj === "boolean") {
    return sanitizeBoolean(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key
      const sanitizedKey = sanitizeText(key);
      if (sanitizedKey) {
        sanitized[sanitizedKey] = sanitizeObject(value);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitizes checkout data specifically
 */
export function sanitizeCheckoutData(data: any): any {
  if (!data || typeof data !== "object") {
    return data;
  }

  const sanitized = { ...data };

  // Sanitize cart items
  if (sanitized.cartItems && Array.isArray(sanitized.cartItems)) {
    sanitized.cartItems = sanitized.cartItems.map((item: any) => {
      console.log("Sanitizing cart item:", item);
      const sanitizedItem = {
        product_id: sanitizeUUID(item.product_id),
        quantity: sanitizeInteger(item.quantity),
        selected_options: item.selected_options,
      };
      console.log("Sanitized cart item:", sanitizedItem);
      return sanitizedItem;
    });
  }

  // Sanitize shipping address
  if (sanitized.shippingAddress) {
    sanitized.shippingAddress = {
      name: sanitizeName(sanitized.shippingAddress.name),
      email: sanitizeEmail(sanitized.shippingAddress.email),
      phone: sanitized.shippingAddress.phone
        ? sanitizePhone(sanitized.shippingAddress.phone)
        : undefined,
      line1: sanitizeAddress(sanitized.shippingAddress.line1),
      line2: sanitized.shippingAddress.line2
        ? sanitizeAddress(sanitized.shippingAddress.line2)
        : undefined,
      city: sanitizeCity(sanitized.shippingAddress.city),
      region: sanitizeCity(sanitized.shippingAddress.region),
      postal_code: sanitizePostalCode(sanitized.shippingAddress.postal_code),
      country: sanitizeCountryCode(sanitized.shippingAddress.country),
    };
  }

  // Sanitize billing address
  if (sanitized.billingAddress) {
    sanitized.billingAddress = {
      name: sanitizeName(sanitized.billingAddress.name),
      email: sanitizeEmail(sanitized.billingAddress.email),
      phone: sanitized.billingAddress.phone
        ? sanitizePhone(sanitized.billingAddress.phone)
        : undefined,
      line1: sanitizeAddress(sanitized.billingAddress.line1),
      line2: sanitized.billingAddress.line2
        ? sanitizeAddress(sanitized.billingAddress.line2)
        : undefined,
      city: sanitizeCity(sanitized.billingAddress.city),
      region: sanitizeCity(sanitized.billingAddress.region),
      postal_code: sanitizePostalCode(sanitized.billingAddress.postal_code),
      country: sanitizeCountryCode(sanitized.billingAddress.country),
    };
  }

  // Sanitize other fields
  sanitized.useSameAddress = sanitizeBoolean(sanitized.useSameAddress);
  sanitized.orderNotes = sanitized.orderNotes
    ? sanitizeOrderNotes(sanitized.orderNotes)
    : undefined;

  return sanitized;
}

/**
 * Validates that sanitized data is not empty
 */
export function validateSanitizedData(data: any): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }

  // Check if cart items exist and are valid
  if (
    !data.cartItems ||
    !Array.isArray(data.cartItems) ||
    data.cartItems.length === 0
  ) {
    return false;
  }

  // Check if shipping address exists and is valid
  if (
    !data.shippingAddress ||
    !data.shippingAddress.name ||
    !data.shippingAddress.email
  ) {
    return false;
  }

  return true;
}
