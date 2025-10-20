/**
 * Shipping provider detection and tracking utilities
 */

export type ShippingProvider = "usps" | "ups" | "fedex" | "other";

export interface TrackingInfo {
  trackingNumber: string;
  provider: ShippingProvider;
  trackingUrl: string;
}

/**
 * Detect shipping provider based on tracking number pattern
 */
export function detectShippingProvider(
  trackingNumber: string
): ShippingProvider {
  const cleaned = trackingNumber.replace(/\s/g, "").toUpperCase();

  // USPS patterns (industry standard)
  // Standard USPS Tracking: 20-22 digits starting with 94, 93, 92, 95 (but not 927)
  if (/^(94|93|92|95)\d{18,20}$/.test(cleaned) && !cleaned.startsWith("927")) {
    return "usps";
  }

  // Express Mail / Priority Mail Express: 2 letters + 9 digits + US
  if (/^[A-Z]{2}\d{9}US$/.test(cleaned)) {
    return "usps";
  }

  // Global Express Guaranteed: 82 + 8 digits + US
  if (/^82\d{8}US$/.test(cleaned)) {
    return "usps";
  }

  // UPS patterns (industry standard)
  // Standard UPS: 1Z + 15-18 alphanumeric characters
  if (/^1Z[0-9A-Z]{15,18}$/.test(cleaned)) {
    return "ups";
  }

  // UPS Mail Innovations / SurePost: 22 digits starting with 927
  if (/^927\d{19}$/.test(cleaned)) {
    return "ups";
  }

  // UPS Freight: PRO + digits
  if (/^PRO\d+$/.test(cleaned)) {
    return "ups";
  }

  // UPS Ground: T + 10 digits
  if (/^T\d{10}$/.test(cleaned)) {
    return "ups";
  }

  // UPS: 9-12 digits (some UPS formats)
  if (/^\d{9,12}$/.test(cleaned)) {
    return "ups";
  }

  // USPS: 20-22 digits (general) - but not starting with 927 (UPS Mail Innovations)
  if (/^\d{20,22}$/.test(cleaned) && !cleaned.startsWith("927")) {
    return "usps";
  }

  // Default to other if no pattern matches
  return "other";
}

/**
 * Generate tracking URL for a shipping provider
 */
export function generateTrackingUrl(
  trackingNumber: string,
  provider: ShippingProvider
): string {
  const cleaned = trackingNumber.replace(/\s/g, "");

  switch (provider) {
    case "usps":
      return `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${cleaned}`;

    case "ups":
      return `https://www.ups.com/track?tracknum=${cleaned}`;

    case "fedex":
      return `https://www.fedex.com/fedextrack/?trknbr=${cleaned}`;

    case "other":
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(
        cleaned + " tracking"
      )}`;
  }
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: ShippingProvider): string {
  switch (provider) {
    case "usps":
      return "USPS";
    case "ups":
      return "UPS";
    case "fedex":
      return "FedEx";
    case "other":
    default:
      return "Other";
  }
}

/**
 * Validate tracking number format
 */
export function validateTrackingNumber(trackingNumber: string): {
  isValid: boolean;
  error?: string;
} {
  if (!trackingNumber || trackingNumber.trim().length === 0) {
    return { isValid: false, error: "Tracking number is required" };
  }

  const cleaned = trackingNumber.replace(/\s/g, "");

  if (cleaned.length < 5) {
    return { isValid: false, error: "Tracking number is too short" };
  }

  if (cleaned.length > 30) {
    return { isValid: false, error: "Tracking number is too long" };
  }

  // Check for invalid characters (only alphanumeric allowed)
  if (!/^[A-Z0-9]+$/i.test(cleaned)) {
    return {
      isValid: false,
      error: "Tracking number contains invalid characters",
    };
  }

  return { isValid: true };
}

/**
 * Parse tracking number and return complete tracking info
 */
export function parseTrackingNumber(trackingNumber: string): TrackingInfo {
  const validation = validateTrackingNumber(trackingNumber);

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const provider = detectShippingProvider(trackingNumber);
  const trackingUrl = generateTrackingUrl(trackingNumber, provider);

  return {
    trackingNumber: trackingNumber.trim(),
    provider,
    trackingUrl,
  };
}

/**
 * Format tracking number for display
 */
export function formatTrackingNumber(
  trackingNumber: string,
  provider: ShippingProvider
): string {
  const cleaned = trackingNumber.replace(/\s/g, "");

  switch (provider) {
    case "usps":
      // Format USPS tracking numbers with spaces every 4 characters
      return cleaned.replace(/(.{4})/g, "$1 ").trim();

    case "ups":
      // UPS 1Z format: 1Z 1234 5678 9012 3456 7
      if (cleaned.startsWith("1Z") && cleaned.length === 18) {
        return `${cleaned.slice(0, 2)} ${cleaned.slice(2, 6)} ${cleaned.slice(
          6,
          10
        )} ${cleaned.slice(10, 14)} ${cleaned.slice(14, 18)}`;
      }
      // Other UPS formats: space every 4 characters
      return cleaned.replace(/(.{4})/g, "$1 ").trim();

    case "fedex":
      // FedEx: space every 4 characters
      return cleaned.replace(/(.{4})/g, "$1 ").trim();

    case "other":
    default:
      // Default: space every 4 characters
      return cleaned.replace(/(.{4})/g, "$1 ").trim();
  }
}
