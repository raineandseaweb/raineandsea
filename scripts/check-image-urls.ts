import { config } from "dotenv";
import { db } from "../src/lib/db/index";
import { productMedia } from "../src/lib/db/schema";

// Load environment variables
config({ path: ".env.local" });

async function checkImageUrls() {
  console.log("🔍 Checking image URLs in database...");

  try {
    const images = await db.select().from(productMedia).limit(10);
    
    console.log(`📊 Found ${images.length} sample images:`);
    images.forEach((img, i) => {
      console.log(`${i + 1}. ${img.blob_url}`);
    });

    // Check if any are R2 URLs
    const r2Images = images.filter(img => 
      img.blob_url?.includes("pub-388d6713083a716719486cb6810c1d35.r2.dev")
    );
    
    console.log(`\n📈 R2 URLs: ${r2Images.length}/${images.length}`);
    
    if (r2Images.length > 0) {
      console.log("✅ R2 URLs found in database");
    } else {
      console.log("❌ No R2 URLs found - images may not be migrated");
    }

  } catch (error) {
    console.error("💥 Error checking images:", error);
  } finally {
    process.exit(0);
  }
}

checkImageUrls();
