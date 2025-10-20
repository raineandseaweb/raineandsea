import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { db } from "../src/lib/db";
import { products } from "../src/lib/db/schema";

interface LegacyProduct {
  _id: string;
  title: string;
  price: number;
  description: string;
  type: string;
  category: string;
  imgUrl: string;
  crystals: string[];
  variants: Array<{
    _id: string;
    name: string;
    options: Array<{
      _id: string;
      name: string;
      price: number | null;
      isSoldOut: boolean;
      isDefault: boolean;
    }>;
  }>;
  images?: Array<{
    thumbnail: string;
    original: string;
  }>;
  stock?: number;
  personalizationHint?: string;
}

async function setBasePrices() {
  try {
    console.log("Loading products.json...");

    // Read the products.json file
    const productsJsonPath = path.join(process.cwd(), "products.json");
    const productsData: LegacyProduct[] = JSON.parse(
      fs.readFileSync(productsJsonPath, "utf8")
    );

    console.log(`Found ${productsData.length} products in JSON file`);

    // Get all existing products from database
    const existingProducts = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
      })
      .from(products);

    console.log(`Found ${existingProducts.length} products in database`);

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const legacyProduct of productsData) {
      // Try to find matching product by title (exact match first, then fuzzy match)
      let matchingProduct = existingProducts.find(
        (dbProduct) =>
          dbProduct.title.toLowerCase().trim() ===
          legacyProduct.title.toLowerCase().trim()
      );

      // If no exact match, try fuzzy matching (check if DB title is contained in legacy title)
      if (!matchingProduct) {
        matchingProduct = existingProducts.find((dbProduct) => {
          const dbTitle = dbProduct.title.toLowerCase().trim();
          const legacyTitle = legacyProduct.title.toLowerCase().trim();
          return legacyTitle.includes(dbTitle) || dbTitle.includes(legacyTitle);
        });
      }

      // If still no match, try matching by key words (extract main product type)
      if (!matchingProduct) {
        const legacyKeywords = legacyProduct.title
          .toLowerCase()
          .split(/[,\s]+/)
          .filter((word) => word.length > 3)
          .slice(0, 3); // Take first 3 meaningful words

        matchingProduct = existingProducts.find((dbProduct) => {
          const dbTitle = dbProduct.title.toLowerCase();
          return legacyKeywords.some((keyword) => dbTitle.includes(keyword));
        });
      }

      if (matchingProduct) {
        // Update the base_price with the legacy price
        await db
          .update(products)
          .set({
            base_price: legacyProduct.price.toString(),
            updated_at: new Date(),
          })
          .where(eq(products.id, matchingProduct.id));

        console.log(
          `✅ Updated "${matchingProduct.title}" with base_price: $${legacyProduct.price}`
        );
        updatedCount++;
      } else {
        console.log(
          `❌ Could not find matching product for: "${legacyProduct.title}"`
        );
        notFoundCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`✅ Updated: ${updatedCount} products`);
    console.log(`❌ Not found: ${notFoundCount} products`);
    console.log(`📝 Total processed: ${productsData.length} products`);
  } catch (error) {
    console.error("❌ Error setting base prices:", error);
  } finally {
    process.exit(0);
  }
}

setBasePrices();
