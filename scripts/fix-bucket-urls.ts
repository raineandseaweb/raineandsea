import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/index";
import { productMedia } from "../src/lib/db/schema";

// Load environment variables
config({ path: ".env.local" });

async function fixBucketUrls() {
  console.log("🔧 Fixing bucket URLs in database...");

  try {
    const bucketName = process.env.CLOUDFLARE_R2_PRODUCTS_BUCKET;
    if (!bucketName) {
      console.error(
        "❌ CLOUDFLARE_R2_PRODUCTS_BUCKET not found in environment"
      );
      return;
    }

    // Prefer pub-<account>.r2.dev/<bucket> if available
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const correctBaseUrl = accountId
      ? `https://pub-${accountId}.r2.dev/${bucketName}`
      : `https://${bucketName}.r2.dev`;
    console.log(`📡 Using correct bucket URL: ${correctBaseUrl}`);

    // Get all media records with incorrect URLs
    const allMediaRecords = await db.select().from(productMedia);
    const mediaRecords = allMediaRecords.filter((record) => {
      const url = record.blob_url || "";
      return (
        url.includes("pub-388d6713083a716719486cb6810c1d35.r2.dev") ||
        url.includes("https://products.r2.dev/")
      );
    });

    console.log(`📊 Found ${mediaRecords.length} records with incorrect URLs`);

    let fixedCount = 0;

    for (const record of mediaRecords) {
      if (record.blob_url && record.id) {
        // Replace the incorrect base URL with the correct one
        let newUrl = record.blob_url;
        newUrl = newUrl.replace(
          "https://pub-388d6713083a716719486cb6810c1d35.r2.dev",
          correctBaseUrl
        );
        newUrl = newUrl.replace("https://products.r2.dev", correctBaseUrl);

        await db
          .update(productMedia)
          .set({ blob_url: newUrl })
          .where(eq(productMedia.id, record.id));

        console.log(`✅ Fixed: ${record.id}`);
        console.log(`   Old: ${record.blob_url}`);
        console.log(`   New: ${newUrl}`);
        fixedCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`  ✅ Fixed: ${fixedCount}`);
    console.log(`🎉 URL fix completed successfully!`);
  } catch (error) {
    console.error("💥 URL fix failed:", error);
  } finally {
    process.exit(0);
  }
}

fixBucketUrls();
