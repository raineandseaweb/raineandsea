import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db/index";
import { productMedia } from "../src/lib/db/schema";

// Load environment variables
config({ path: ".env.local" });

async function fixR2Domain() {
  console.log("🔧 Fixing R2 domain in database...");

  try {
    const correctDomain = "pub-e29637854bed4c87ab8310fb393f6759.r2.dev";
    console.log(`📡 Using correct R2 domain: ${correctDomain}`);

    // Get all media records with incorrect URLs
    const allMediaRecords = await db.select().from(productMedia);
    const mediaRecords = allMediaRecords.filter((record) => {
      const url = record.blob_url || "";
      return (
        url.includes("pub-388d6713083a716719486cb6810c1d35.r2.dev") ||
        url.includes("products.r2.dev")
      );
    });

    console.log(
      `📊 Found ${mediaRecords.length} records with incorrect domain`
    );

    let fixedCount = 0;

    for (const record of mediaRecords) {
      if (record.blob_url && record.id) {
        let newUrl = record.blob_url;

        // Replace old domain with correct domain
        newUrl = newUrl.replace(
          "pub-388d6713083a716719486cb6810c1d35.r2.dev",
          correctDomain
        );
        newUrl = newUrl.replace("products.r2.dev", correctDomain);

        // Remove any /products/ prefix that shouldn't be there
        newUrl = newUrl.replace("/products/images/", "/images/");

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
    console.log(`🎉 Domain fix completed successfully!`);
  } catch (error) {
    console.error("💥 Domain fix failed:", error);
  } finally {
    process.exit(0);
  }
}

fixR2Domain();
