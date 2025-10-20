import { config } from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  categories,
  inventory,
  prices,
  productCategories,
  productCrystals,
  productMedia,
  productOptions,
  productOptionValues,
  products,
  productTags,
  tags,
} from "../src/lib/db/schema";
import { loadSecret } from "../src/lib/encryption/env-loader";

// Initialize database connection
async function initializeDb() {
  const DATABASE_URL: string =
    (await loadSecret("DATABASE_URL")) ||
    (await loadSecret("POSTGRES_URL")) ||
    "";

  if (!DATABASE_URL) {
    throw new Error(
      "DATABASE_URL or POSTGRES_URL must be set in GCP Secret Manager"
    );
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  return drizzle(pool, {
    schema: {
      categories,
      inventory,
      prices,
      productCategories,
      productCrystals,
      productMedia,
      productOptions,
      productOptionValues,
      productTags,
      products,
      tags,
    },
  });
}

interface ExportedData {
  categories: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    thumbnail: string | null;
    parent_id: string | null;
    created_at: Date;
    updated_at: Date;
  }>;
  tags: Array<{
    id: string;
    name: string;
    color: string | null;
    created_at: Date;
    updated_at: Date;
  }>;
  products: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    image: string | null;
    base_price: string | null;
    status: string;
    created_at: Date;
    updated_at: Date;
  }>;
  productMedia: Array<{
    id: string;
    product_id: string;
    blob_url: string;
    alt: string;
    sort: number;
    created_at: Date;
  }>;
  productCategories: Array<{
    product_id: string;
    category_id: string;
  }>;
  productTags: Array<{
    product_id: string;
    tag_id: string;
  }>;
  productCrystals: Array<{
    id: string;
    product_id: string;
    name: string;
    price_adjustment: string;
    is_default: boolean;
    is_available: boolean;
    sort_order: number;
    created_at: Date;
  }>;
  productOptions: Array<{
    id: string;
    product_id: string;
    name: string;
    display_name: string;
    sort_order: number;
    created_at: Date;
  }>;
  productOptionValues: Array<{
    id: string;
    option_id: string;
    name: string;
    price_adjustment: string;
    is_default: boolean;
    is_sold_out: boolean;
    sort_order: number;
    created_at: Date;
  }>;
  prices: Array<{
    id: string;
    product_id: string;
    currency: string;
    amount: string;
    compare_at_amount: string | null;
    starts_at: Date | null;
    ends_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>;
  inventory: Array<{
    product_id: string;
    location_id: string;
    quantity_available: number;
    quantity_reserved: number;
    updated_at: Date;
  }>;
}

export async function exportCurrentData() {
  try {
    console.log("📤 Starting data export from current database...");

    // Initialize database connection
    const db = await initializeDb();

    // Export all data
    const exportedData: ExportedData = {
      categories: [],
      tags: [],
      products: [],
      productMedia: [],
      productCategories: [],
      productTags: [],
      productCrystals: [],
      productOptions: [],
      productOptionValues: [],
      prices: [],
      inventory: [],
    };

    // Export categories
    console.log("📂 Exporting categories...");
    exportedData.categories = await db.select().from(categories);

    // Export tags
    console.log("🏷️  Exporting tags...");
    exportedData.tags = await db.select().from(tags);

    // Export products
    console.log("📦 Exporting products...");
    exportedData.products = await db.select().from(products);

    // Export product media
    console.log("🖼️  Exporting product media...");
    exportedData.productMedia = await db.select().from(productMedia);

    // Export product categories
    console.log("🔗 Exporting product categories...");
    exportedData.productCategories = await db.select().from(productCategories);

    // Export product tags
    console.log("🏷️  Exporting product tags...");
    exportedData.productTags = await db.select().from(productTags);

    // Export product crystals
    console.log("💎 Exporting product crystals...");
    exportedData.productCrystals = await db.select().from(productCrystals);

    // Export product options
    console.log("⚙️  Exporting product options...");
    exportedData.productOptions = await db.select().from(productOptions);

    // Export product option values
    console.log("⚙️  Exporting product option values...");
    exportedData.productOptionValues = await db
      .select()
      .from(productOptionValues);

    // Export prices
    console.log("💰 Exporting prices...");
    exportedData.prices = await db.select().from(prices);

    // Export inventory
    console.log("📊 Exporting inventory...");
    exportedData.inventory = await db.select().from(inventory);

    // Write to file
    const outputPath = path.join(process.cwd(), "current-database-data.json");
    fs.writeFileSync(outputPath, JSON.stringify(exportedData, null, 2));

    console.log("\n🎉 Data export completed!");
    console.log(`📊 Summary:`);
    console.log(`   📂 Categories: ${exportedData.categories.length}`);
    console.log(`   🏷️  Tags: ${exportedData.tags.length}`);
    console.log(`   📦 Products: ${exportedData.products.length}`);
    console.log(`   🖼️  Product Media: ${exportedData.productMedia.length}`);
    console.log(
      `   🔗 Product Categories: ${exportedData.productCategories.length}`
    );
    console.log(`   🏷️  Product Tags: ${exportedData.productTags.length}`);
    console.log(
      `   💎 Product Crystals: ${exportedData.productCrystals.length}`
    );
    console.log(
      `   ⚙️  Product Options: ${exportedData.productOptions.length}`
    );
    console.log(
      `   ⚙️  Product Option Values: ${exportedData.productOptionValues.length}`
    );
    console.log(`   💰 Prices: ${exportedData.prices.length}`);
    console.log(`   📊 Inventory: ${exportedData.inventory.length}`);
    console.log(`\n📄 Data exported to: ${outputPath}`);

    return exportedData;
  } catch (error) {
    console.error("❌ Error exporting data:", error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  exportCurrentData()
    .then(() => {
      console.log("\n✅ Export completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Export failed:", error);
      process.exit(1);
    });
}
