import { config } from "dotenv";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { db } from "../src/lib/db";
import { products } from "../src/lib/db/schema";

// Load environment variables
config({ path: ".env.local" });

interface ImageMapping {
  [originalUrl: string]: string;
}

async function updateProductImagePaths() {
  try {
    // Read the image mapping
    const mappingPath = path.join(
      process.cwd(),
      "public",
      "images",
      "image-mapping.json"
    );
    const mappingData = fs.readFileSync(mappingPath, "utf-8");
    const imageMapping: ImageMapping = JSON.parse(mappingData);

    console.log(`Found ${Object.keys(imageMapping).length} image mappings`);

    // Read products.json to get the original data
    const productsData = fs.readFileSync("products.json", "utf-8");
    const originalProducts = JSON.parse(productsData);

    let updatedCount = 0;

    // Update each product in the database
    for (const originalProduct of originalProducts) {
      const originalImageUrl = originalProduct.imgUrl;

      if (originalImageUrl && imageMapping[originalImageUrl]) {
        const localImagePath = imageMapping[originalImageUrl];

        // Find the product in the database by title (since we don't have the original _id)
        const dbProducts = await db
          .select()
          .from(products)
          .where(eq(products.title, originalProduct.title))
          .limit(1);

        if (dbProducts.length > 0) {
          const product = dbProducts[0];

          // Update the product with the local image path
          await db
            .update(products)
            .set({
              image: localImagePath,
              updated_at: new Date(),
            })
            .where(eq(products.id, product.id));

          console.log(`✓ Updated product: ${product.title}`);
          updatedCount++;
        } else {
          console.log(
            `⚠ Product not found in database: ${originalProduct.title}`
          );
        }
      }
    }

    console.log(`\n🎉 Update complete!`);
    console.log(`✓ Updated ${updatedCount} products with local image paths`);
  } catch (error) {
    console.error("Error updating image paths:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  updateProductImagePaths()
    .then(() => {
      console.log("Image path update process completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Image path update process failed:", error);
      process.exit(1);
    });
}

export { updateProductImagePaths };
