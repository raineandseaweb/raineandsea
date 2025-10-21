/**
 * Image utility functions for consistent image handling across the application
 */

/**
 * Converts relative URLs to absolute URLs, but never returns legacy in-repo /images paths
 * @param url - The URL to convert
 * @returns The absolute URL or null if it's a legacy path
 */
export function makeAbsoluteUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/images/")) return null; // never expose legacy in-repo paths
  if (url.startsWith("/")) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    return `${baseUrl}${url}`;
  }
  return url;
}

/**
 * Gets the primary image URL for a product, preferring media blob_url over products.image
 * @param productImage - The image field from products table
 * @param mediaBlobUrl - The blob_url from product_media table
 * @returns The best available image URL or null
 */
export function getProductImageUrl(
  productImage: string | null,
  mediaBlobUrl: string | null
): string | null {
  // Prefer media blob_url over products.image
  const imageUrl = mediaBlobUrl || productImage || null;
  return makeAbsoluteUrl(imageUrl);
}

/**
 * Gets the primary image URL for a product with media array
 * @param productImage - The image field from products table
 * @param media - Array of media objects with blob_url
 * @returns The best available image URL or null
 */
export function getProductImageUrlFromMedia(
  productImage: string | null,
  media: Array<{ blob_url: string; sort: number }> | null | undefined
): string | null {
  if (!media || media.length === 0) {
    return makeAbsoluteUrl(productImage);
  }

  // Sort media by sort order and get the first one
  const sortedMedia = [...media].sort((a, b) => a.sort - b.sort);
  const primaryMedia = sortedMedia[0];

  return getProductImageUrl(productImage, primaryMedia.blob_url);
}

/**
 * Gets all image URLs for a product, sorted by sort order
 * @param media - Array of media objects with blob_url and sort
 * @returns Array of absolute image URLs
 */
export function getAllProductImageUrls(
  media: Array<{ blob_url: string; sort: number }> | null | undefined
): string[] {
  if (!media || media.length === 0) {
    return [];
  }

  return media
    .sort((a, b) => a.sort - b.sort)
    .map((item) => makeAbsoluteUrl(item.blob_url))
    .filter((url): url is string => url !== null);
}

/**
 * Gets thumbnail URL for a product image
 * @param imageUrl - The full image URL
 * @returns The thumbnail URL or the original URL if thumbnail doesn't exist
 */
export function getThumbnailUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;

  // If it's an R2 URL with /full.jpg, replace with /thumbnail.jpg
  if (imageUrl.includes("/full.jpg")) {
    return imageUrl.replace("/full.jpg", "/thumbnail.jpg");
  }

  return imageUrl;
}

/**
 * Interface for product image data
 */
export interface ProductImageData {
  primaryUrl: string | null;
  thumbnailUrl: string | null;
  allUrls: string[];
}

/**
 * Gets comprehensive image data for a product
 * @param productImage - The image field from products table
 * @param media - Array of media objects with blob_url and sort
 * @returns Object with primaryUrl, thumbnailUrl, and allUrls
 */
export function getProductImageData(
  productImage: string | null,
  media: Array<{ blob_url: string; sort: number }> | null | undefined
): ProductImageData {
  const primaryUrl = getProductImageUrlFromMedia(productImage, media);
  const thumbnailUrl = getThumbnailUrl(primaryUrl);
  const allUrls = getAllProductImageUrls(media);

  return {
    primaryUrl,
    thumbnailUrl,
    allUrls,
  };
}
