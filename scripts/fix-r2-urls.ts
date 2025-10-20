import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/index";
import { productMedia } from "../src/lib/db/schema";

// Load environment variables
config({ path: ".env.local" });

async function fixR2Urls() {
  console.log("🔧 Fixing R2 URLs in database...");

  try {
    const PUBLIC_URL_BASE =
      "https://pub-388d6713083a716719486cb6810c1d35.r2.dev";

    console.log(`📡 Using R2 base URL: ${PUBLIC_URL_BASE}`);

    // Get all media records with undefined URLs
    const allMediaRecords = await db.select().from(productMedia);
    const mediaRecords = allMediaRecords.filter((record) =>
      record.blob_url?.includes("undefined/images/")
    );

    console.log(`📊 Found ${mediaRecords.length} records with undefined URLs`);

    let fixedCount = 0;

    for (const record of mediaRecords) {
      // Extract the image key from the current URL
      const currentUrl = record.blob_url;
      if (currentUrl?.includes("undefined/images/")) {
        const imageKey = currentUrl.replace("undefined/images/", "");
        const newUrl = `${PUBLIC_URL_BASE}/images/${imageKey}`;

        // Update the record
        await db
          .update(productMedia)
          .set({ blob_url: newUrl })
          .where(eq(productMedia.id, record.id));

        console.log(`✅ Fixed: ${record.id} -> ${newUrl}`);
        fixedCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`  ✅ Fixed: ${fixedCount}`);
    console.log(`🎉 URL fix completed successfully!`);
  } catch (error) {
    console.error("💥 URL fix failed:", error);
  }
}

fixR2Urls();
