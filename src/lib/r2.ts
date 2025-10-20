import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSecretAsync } from "./encryption/async-secrets";

// Lazy initialization of R2 client
let r2Client: S3Client | null = null;
let BUCKET_NAME: string | null = null;
let PUBLIC_URL_BASE: string | null = null;

async function initializeR2Client() {
  if (r2Client) return;

  const accountId = await getSecretAsync("CLOUDFLARE_ACCOUNT_ID");
  const accessKeyId = await getSecretAsync("CLOUDFLARE_ACCESS_KEY_ID");
  const secretAccessKey = await getSecretAsync("CLOUDFLARE_SECRET_ACCESS_KEY");

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Cloudflare R2 credentials not configured in GCP Secret Manager"
    );
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  BUCKET_NAME = process.env.CLOUDFLARE_R2_PRODUCTS_BUCKET!;
  PUBLIC_URL_BASE =
    process.env.PUBLIC_URL_BASE ||
    (accountId && BUCKET_NAME
      ? `https://pub-${accountId}.r2.dev/${BUCKET_NAME}`
      : "");
}

export interface UploadResult {
  url: string;
  key: string;
}

export interface ImageVariants {
  full: UploadResult;
  thumbnail: UploadResult;
}

export async function uploadImageToR2(
  file: File | Buffer,
  key: string,
  contentType: string = "image/jpeg"
): Promise<UploadResult> {
  try {
    await initializeR2Client();

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME!,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000", // 1 year cache
    });

    await r2Client!.send(command);

    return {
      url: `${PUBLIC_URL_BASE}/${key}`,
      key,
    };
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error("Failed to upload image to R2");
  }
}

export async function uploadImageVariants(
  fullFile: File | Buffer,
  thumbnailFile: File | Buffer,
  imageKey: string,
  contentType: string = "image/jpeg"
): Promise<ImageVariants> {
  try {
    const fullKey = `images/${imageKey}/full.jpg`;
    const thumbnailKey = `images/${imageKey}/thumbnail.jpg`;

    const [fullResult, thumbnailResult] = await Promise.all([
      uploadImageToR2(fullFile, fullKey, contentType),
      uploadImageToR2(thumbnailFile, thumbnailKey, contentType),
    ]);

    return {
      full: fullResult,
      thumbnail: thumbnailResult,
    };
  } catch (error) {
    console.error("Error uploading image variants:", error);
    throw new Error("Failed to upload image variants to R2");
  }
}

export async function deleteImageFromR2(key: string): Promise<void> {
  try {
    await initializeR2Client();

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME!,
      Key: key,
    });

    await r2Client!.send(command);
  } catch (error) {
    console.error("Error deleting from R2:", error);
    throw new Error("Failed to delete image from R2");
  }
}

export function generateImageKey(
  productSlug: string,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${productSlug}-${timestamp}-${sanitizedFilename}`;
}

export function deleteImageVariants(imageKey: string): Promise<void[]> {
  const fullKey = `images/${imageKey}/full.jpg`;
  const thumbnailKey = `images/${imageKey}/thumbnail.jpg`;

  return Promise.all([
    deleteImageFromR2(fullKey),
    deleteImageFromR2(thumbnailKey),
  ]);
}

export function extractKeyFromUrl(url: string): string | null {
  if (!PUBLIC_URL_BASE || !url.startsWith(PUBLIC_URL_BASE)) {
    return null;
  }
  return url.replace(`${PUBLIC_URL_BASE}/`, "");
}

export function extractImageKeyFromUrl(url: string): string | null {
  const key = extractKeyFromUrl(url);
  if (!key || !key.startsWith("images/")) {
    return null;
  }
  // Extract image key from path like "images/product-slug-1234567890-image.jpg/full.jpg"
  const match = key.match(/^images\/([^\/]+)\/(full|thumbnail)\.jpg$/);
  return match ? match[1] : null;
}
