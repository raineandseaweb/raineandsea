import { config } from "dotenv";
import fs from "fs/promises";
import { db } from "../src/lib/db";
import { categories } from "../src/lib/db/schema";

// Load environment variables
config({ path: ".env.local" });

interface ProductData {
  _id: string;
  title: string;
  price: number;
  description: string;
  type: string;
  category: string;
  imgUrl: string;
  crystals: string[];
  variants: any[];
}

async function syncCategoriesWithThumbnails() {
  try {
    console.log("🚀 Starting category sync with thumbnails...");

    // Read products.json
    const productsData: ProductData[] = JSON.parse(
      await fs.readFile("products.json", "utf-8")
    );

    console.log(`📦 Found ${productsData.length} products`);

    // Get unique categories from products
    const categoryCounts = new Map<string, number>();
    const categoryExamples = new Map<string, ProductData>();

    productsData.forEach((product) => {
      const category = product.category;
      if (category) {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);

        // Store first product as example (you can modify this logic)
        if (!categoryExamples.has(category)) {
          categoryExamples.set(category, product);
        }
      }
    });

    // Custom thumbnail selection for specific categories
    const customThumbnails = new Map<string, string>();

    // Better thumbnails for specific categories
    customThumbnails.set(
      "Earrings",
      "https://i.etsystatic.com/32023127/r/il/c12823/3547429875/il_fullxfull.3547429875_3wez.jpg"
    ); // Crystal Moon Dangly Earrings
    customThumbnails.set(
      "Jewelry Boxes",
      "https://i.etsystatic.com/32023127/r/il/c8cd20/3515216958/il_fullxfull.3515216958_ggu7.jpg"
    ); // Crystal Jewelry Mystery Box $25 (better positioned)
    customThumbnails.set(
      "Rings",
      "https://i.etsystatic.com/32023127/r/il/17b32d/3811923698/il_fullxfull.3811923698_b85x.jpg"
    ); // Only option available
    customThumbnails.set(
      "Tumbles",
      "https://i.etsystatic.com/32023127/r/il/8da03e/4181505103/il_fullxfull.4181505103_on1r.jpg"
    ); // XL Aquamarine Tumbles (better positioned)
    customThumbnails.set(
      "Necklaces & Pendants",
      "https://i.etsystatic.com/32023127/r/il/60196c/3786386570/il_fullxfull.3786386570_ahfv.jpg"
    ); // Wire Weave Wrapped Crystal Pendant
    customThumbnails.set(
      "Wire Trees",
      "https://i.etsystatic.com/32023127/r/il/bf000b/3472435643/il_fullxfull.3472435643_em78.jpg"
    ); // Green Weeping Willow (better zoomed out view)

    console.log("📂 Categories found in products:");
    for (const [category, count] of categoryCounts.entries()) {
      console.log(`  - ${category}: ${count} products`);
    }

    // Clear existing categories (optional - remove if you want to keep existing ones)
    console.log("🗑️ Clearing existing categories...");
    await db.delete(categories);

    // Create new categories with thumbnails
    console.log("✨ Creating categories with thumbnails...");
    const newCategories = [];

    for (const [categoryName, count] of categoryCounts.entries()) {
      const exampleProduct = categoryExamples.get(categoryName);
      const slug = categoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // Use custom thumbnail if available, otherwise use example product
      const thumbnailUrl =
        customThumbnails.get(categoryName) || exampleProduct?.imgUrl || null;

      const newCategory = await db
        .insert(categories)
        .values({
          slug,
          name: categoryName,
          description: null,
          thumbnail: thumbnailUrl,
        })
        .returning();

      newCategories.push({
        ...newCategory[0],
        productCount: count,
        thumbnail: thumbnailUrl,
        exampleProduct: exampleProduct?.title || null,
      });

      console.log(`✅ Created category: ${categoryName} (${count} products)`);
      if (exampleProduct) {
        console.log(`   📸 Thumbnail: ${exampleProduct.title}`);
      }
    }

    console.log(`\n🎉 Successfully synced ${newCategories.length} categories!`);

    // Display summary
    console.log("\n📊 Category Summary:");
    newCategories.forEach((cat) => {
      console.log(`  ${cat.name}: ${cat.productCount} products`);
      if (cat.thumbnail) {
        console.log(`    Example: ${cat.exampleProduct}`);
        console.log(`    Image: ${cat.thumbnail}`);
      }
    });
  } catch (error) {
    console.error("❌ Error syncing categories:", error);
    throw error;
  }
}

// Run the sync
if (require.main === module) {
  syncCategoriesWithThumbnails()
    .then(() => {
      console.log("✅ Category sync completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Category sync failed:", error);
      process.exit(1);
    });
}

export { syncCategoriesWithThumbnails };
