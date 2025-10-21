import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

import { count } from "drizzle-orm";
import { db } from "./index";
import { categories, inventory, prices, products } from "./schema";

async function testMigration() {
  try {
    console.log("🧪 Testing migration results...");

    // Count products
    const productCount = await db.select({ count: count() }).from(products);
    console.log(`📦 Products: ${productCount[0].count}`);

    // Count categories
    const categoryCount = await db.select({ count: count() }).from(categories);
    console.log(`📂 Categories: ${categoryCount[0].count}`);

    // Count variants - disabled as variants table removed
    // const variantCount = await db.select({ count: count() }).from(variants);
    // console.log(`🔧 Variants: ${variantCount[0].count}`);

    // Count prices
    const priceCount = await db.select({ count: count() }).from(prices);
    console.log(`💰 Prices: ${priceCount[0].count}`);

    // Count inventory
    const inventoryCount = await db.select({ count: count() }).from(inventory);
    console.log(`📊 Inventory records: ${inventoryCount[0].count}`);

    // Show sample products
    const sampleProducts = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        status: products.status,
      })
      .from(products)
      .limit(5);

    console.log("\n📋 Sample products:");
    sampleProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.title} (${product.slug})`);
    });

    // Show sample categories
    const sampleCategories = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories)
      .limit(10);

    console.log("\n📂 Sample categories:");
    sampleCategories.forEach((category, index) => {
      console.log(`${index + 1}. ${category.name} (${category.slug})`);
    });

    console.log("\n✅ Migration test completed successfully!");
  } catch (error) {
    console.error("❌ Migration test failed:", error);
    throw error;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testMigration()
    .then(() => {
      console.log("Test completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

export { testMigration };
