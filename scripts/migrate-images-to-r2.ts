import { config } from "dotenv";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { db } from "../src/lib/db/index";
import { productMedia, products } from "../src/lib/db/schema";
import { generateImageKey, uploadImageVariants } from "../src/lib/r2";

// Load environment variables
config({ path: ".env.local" });

interface ImageMapping {
  [key: string]: string;
}

interface ProductImage {
  productId: string;
  productSlug: string;
  originalPath: string;
  thumbnailPath?: string;
  alt: string;
  sort: number;
}

async function migrateImagesToR2() {
  console.log("🚀 Starting image migration to Cloudflare R2...");

  try {
    // Read image mapping
    const mappingPath = path.join(
      process.cwd(),
      "public/images/image-mapping.json"
    );
    const imageMapping: ImageMapping = JSON.parse(
      fs.readFileSync(mappingPath, "utf8")
    );

    // Get all products with their media
    const productsWithMedia = await db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        mediaId: productMedia.id,
        mediaUrl: productMedia.blob_url,
        mediaAlt: productMedia.alt,
        mediaSort: productMedia.sort,
      })
      .from(products)
      .leftJoin(productMedia, eq(products.id, productMedia.product_id))
      .orderBy(products.slug, productMedia.sort);

    console.log(`📊 Found ${productsWithMedia.length} product-media records`);

    // Group by product
    const productGroups = new Map<string, typeof productsWithMedia>();
    for (const record of productsWithMedia) {
      if (!productGroups.has(record.id)) {
        productGroups.set(record.id, []);
      }
      if (record.mediaId) {
        productGroups.get(record.id)!.push(record);
      }
    }

    console.log(`📦 Processing ${productGroups.size} products`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const [productId, mediaRecords] of productGroups) {
      if (mediaRecords.length === 0) continue;

      const productSlug = mediaRecords[0].slug;
      console.log(`\n🔄 Processing product: ${productSlug}`);

      for (const record of mediaRecords) {
        try {
          // Check if this is already an R2 URL (skip if it contains the R2 domain or pub-)
          if (
            record.mediaUrl?.includes("r2.cloudflarestorage.com") ||
            record.mediaUrl?.includes("pub-") ||
            record.mediaUrl?.includes("undefined/images/")
          ) {
            console.log(`  ⏭️  Already migrated: ${record.mediaUrl}`);
            skippedCount++;
            continue;
          }

          // Find the local file path
          if (!record.mediaUrl) {
            console.log(`  ❌ No media URL for record`);
            errorCount++;
            continue;
          }
          const localPath = findLocalImagePath(record.mediaUrl, imageMapping);
          if (!localPath) {
            console.log(`  ❌ Local file not found for: ${record.mediaUrl}`);
            errorCount++;
            continue;
          }

          const fullPath = path.join(process.cwd(), "public", localPath);
          if (!fs.existsSync(fullPath)) {
            console.log(`  ❌ File does not exist: ${fullPath}`);
            errorCount++;
            continue;
          }

          // Generate image key
          const filename = path.basename(localPath);
          const imageKey = generateImageKey(productSlug, filename);

          // Read and process image
          const imageBuffer = fs.readFileSync(fullPath);

          // Generate thumbnail
          const thumbnailBuffer = await sharp(imageBuffer)
            .resize(300, 300, {
              fit: "inside",
              withoutEnlargement: true,
            })
            .jpeg({ quality: 80 })
            .toBuffer();

          // Upload to R2
          const result = await uploadImageVariants(
            imageBuffer,
            thumbnailBuffer,
            imageKey,
            "image/jpeg"
          );

          // Update database with new R2 URL
          await db
            .update(productMedia)
            .set({
              blob_url: result.full.url,
            })
            .where(eq(productMedia.id, record.mediaId!));

          console.log(`  ✅ Migrated: ${filename} -> ${result.full.url}`);
          migratedCount++;
        } catch (error) {
          console.error(`  ❌ Error migrating ${record.mediaUrl}:`, error);
          errorCount++;
        }
      }
    }

    console.log("\n📈 Migration Summary:");
    console.log(`  ✅ Migrated: ${migratedCount}`);
    console.log(`  ⏭️  Skipped: ${skippedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📊 Total: ${migratedCount + skippedCount + errorCount}`);
  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }
}

function findLocalImagePath(url: string, mapping: ImageMapping): string | null {
  // Handle localhost URLs by extracting the path
  if (url.includes("localhost:3000")) {
    const pathMatch = url.match(/localhost:3000(\/images\/.*)/);
    if (pathMatch) {
      return pathMatch[1];
    }
  }

  // First, try direct lookup
  if (mapping[url]) {
    return mapping[url];
  }

  // If not found, try to find by pattern matching
  for (const [etsyUrl, localPath] of Object.entries(mapping)) {
    if (etsyUrl.includes(url) || url.includes(etsyUrl)) {
      return localPath;
    }
  }

  // Check if it's already a local path
  if (url.startsWith("/images/")) {
    return url;
  }

  return null;
}

// Run migration
if (require.main === module) {
  migrateImagesToR2()
    .then(() => {
      console.log("🎉 Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration failed:", error);
      process.exit(1);
    });
}

export { migrateImagesToR2 };
