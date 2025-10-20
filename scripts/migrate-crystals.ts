import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import fs from "fs";
import { Pool } from "pg";
import { productCrystals, products } from "../src/lib/db/schema";

config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

interface ProductData {
  _id: string;
  title: string;
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
}

async function migrateCrystals() {
  try {
    console.log("Reading products.json...");
    const productsData: ProductData[] = JSON.parse(
      fs.readFileSync("products.json", "utf-8")
    );

    console.log(`Found ${productsData.length} products`);

    for (const productData of productsData) {
      // Find the product in the database by title (since we don't have the original _id mapping)
      const dbProducts = await db
        .select()
        .from(products)
        .where(eq(products.title, productData.title))
        .limit(1);

      if (dbProducts.length === 0) {
        console.log(`Product not found: ${productData.title}`);
        continue;
      }

      const product = dbProducts[0];
      console.log(`Processing: ${product.title}`);

      // Clear existing crystals for this product
      await db
        .delete(productCrystals)
        .where(eq(productCrystals.product_id, product.id));

      // Add crystals from the crystals array
      if (productData.crystals && productData.crystals.length > 0) {
        for (let i = 0; i < productData.crystals.length; i++) {
          const crystalName = productData.crystals[i];

          await db.insert(productCrystals).values({
            product_id: product.id,
            name: crystalName,
            price_adjustment: "0", // Default to +$0
            is_default: i === 0, // First crystal is default
            is_available: true,
            sort_order: i,
          });
        }
      }

      // Add crystal options from variants (only for products that have crystals)
      if (productData.crystals && productData.crystals.length > 0 && productData.variants && productData.variants.length > 0) {
        for (const variant of productData.variants) {
          if (variant.options && variant.options.length > 0) {
            for (let i = 0; i < variant.options.length; i++) {
              const option = variant.options[i];

              // Skip the default "Select a material" option
              if (option.name === "Select a material") {
                continue;
              }

              // Only add crystal options if they look like crystal names
              // Skip generic options like "Yes", "No", "Small", "Medium", "Large", etc.
              const genericOptions = [
                "Select an option", "Select a diameter", "Select a size", "Select a color",
                "Yes", "No", "Small", "Medium", "Large", "Extra Large", "XL", "S", "M", "L",
                "Red", "Blue", "Green", "Yellow", "Black", "White", "Pink", "Purple", "Orange"
              ];
              
              if (genericOptions.includes(option.name)) {
                continue;
              }

              // Check if this crystal already exists for this product
              const existingCrystal = await db
                .select()
                .from(productCrystals)
                .where(
                  eq(productCrystals.product_id, product.id) &&
                    eq(productCrystals.name, option.name)
                )
                .limit(1);

              if (existingCrystal.length === 0) {
                // Calculate price adjustment (variant price - base price)
                const basePrice = productData.price || 0;
                const variantPrice = option.price || basePrice;
                const priceAdjustment = Math.max(0, variantPrice - basePrice);

                await db.insert(productCrystals).values({
                  product_id: product.id,
                  name: option.name,
                  price_adjustment: priceAdjustment.toString(),
                  is_default: option.isDefault,
                  is_available: !option.isSoldOut,
                  sort_order: i + (productData.crystals?.length || 0),
                });
              }
            }
          }
        }
      }
    }

    console.log("Crystal migration completed!");
  } catch (error) {
    console.error("Error migrating crystals:", error);
  } finally {
    await pool.end();
  }
}

migrateCrystals();
