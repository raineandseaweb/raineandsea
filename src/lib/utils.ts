import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(price);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

// Remove marketplace SEO fluff from product titles for cleaner display
export function cleanProductTitle(rawTitle: string): string {
  if (!rawTitle) return rawTitle;
  let title = rawTitle;

  // Common separators used to stuff keywords
  const separators = ["|", "/", ",", "-", "•", "–", "—"];

  // Phrases to remove (case-insensitive)
  const phrases = [
    /hand\s*made/gi,
    /hand\s*crafted/gi,
    /wire\s*wrapped/gi,
    /hypoallergenic/gi,
    /gift\s*for\s*her/gi,
    /gift\s*for\s*him/gi,
    /anniversary/gi,
    /boho/gi,
    /minimal(ist)?/gi,
    /vintage/gi,
    /aesthetic/gi,
    /spiritual/gi,
    /chakra/gi,
    /healing/gi,
    /energy/gi,
    /meditation/gi,
    /etsy/gi,
  ];

  // Normalize whitespace
  title = title.replace(/\s+/g, " ").trim();

  // If title contains separators, keep the first descriptive segment if it's not too short
  for (const sep of separators) {
    if (title.includes(sep)) {
      const parts = title
        .split(sep)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length > 1) {
        // Prefer the longest early segment that looks like a real product name
        const candidate =
          parts[0].length >= 12
            ? parts[0]
            : parts.find((p) => p.length >= 12) || parts[0];
        title = candidate;
      }
      break;
    }
  }

  // Remove fluff phrases
  for (const regex of phrases) {
    title = title.replace(regex, "");
  }

  // Remove duplicate words and extra commas
  title = title
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/^,|,$/g, "")
    .trim();

  // Capitalize first letter of words after cleanup if all lowercased
  const words = title.split(" ");
  const hasCaps = /[A-Z]/.test(title);
  if (!hasCaps) {
    title = words
      .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  }

  return title;
}
