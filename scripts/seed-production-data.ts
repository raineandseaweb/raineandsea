import { config } from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
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
}

interface SeedOptions {
  skipExisting?: boolean;
  dryRun?: boolean;
  maxProducts?: number;
}

export async function seedProductionData(options: SeedOptions = {}) {
  const { skipExisting = true, dryRun = false, maxProducts } = options;

  try {
    console.log("🌱 Starting production data seed...");
    console.log(
      `Options: skipExisting=${skipExisting}, dryRun=${dryRun}, maxProducts=${
        maxProducts || "unlimited"
      }`
    );

    // Initialize database connection
    const db = await initializeDb();

    // Read products.json
    const productsDataPath = path.join(process.cwd(), "products.json");
    if (!fs.existsSync(productsDataPath)) {
      throw new Error("products.json not found in project root");
    }

    const productsData: LegacyProduct[] = JSON.parse(
      fs.readFileSync(productsDataPath, "utf-8")
    );

    console.log(`📦 Found ${productsData.length} products in products.json`);

    // Limit products if specified
    const productsToProcess = maxProducts
      ? productsData.slice(0, maxProducts)
      : productsData;

    console.log(`🔄 Processing ${productsToProcess.length} products...`);

    // Create categories map
    const categoryMap = new Map<string, string>();
    const categorySlugMap = new Map<string, string>();

    // Create tags map
    const tagMap = new Map<string, string>();

    // Process categories first
    const uniqueCategories = new Set<string>();
    const uniqueTags = new Set<string>();

    productsToProcess.forEach((product) => {
      if (product.category) {
        uniqueCategories.add(product.category);
      }
      if (product.type) {
        uniqueTags.add(product.type);
      }
    });

    console.log(`📂 Creating ${uniqueCategories.size} categories...`);
    console.log(`🏷️  Creating ${uniqueTags.size} tags...`);

    // Create tags first
    for (const tagName of uniqueTags) {
      if (dryRun) {
        console.log(`[DRY RUN] Would create tag: ${tagName}`);
        tagMap.set(
          tagName,
          `mock-${tagName.toLowerCase().replace(/\s+/g, "-")}-id`
        );
        continue;
      }

      // Check if tag already exists
      const existingTag = await db
        .select()
        .from(tags)
        .where(eq(tags.name, tagName))
        .limit(1);

      if (existingTag.length > 0) {
        console.log(`✅ Tag already exists: ${tagName}`);
        tagMap.set(tagName, existingTag[0].id);
        continue;
      }

      const newTag = await db
        .insert(tags)
        .values({
          name: tagName,
        })
        .returning();

      console.log(`✅ Created tag: ${tagName}`);
      tagMap.set(tagName, newTag[0].id);
    }

    for (const categoryName of uniqueCategories) {
      const slug = categoryName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();

      if (dryRun) {
        console.log(
          `[DRY RUN] Would create category: ${categoryName} (slug: ${slug})`
        );
        categoryMap.set(categoryName, `mock-${slug}-id`);
        categorySlugMap.set(slug, `mock-${slug}-id`);
        continue;
      }

      // Check if category already exists
      const existingCategory = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);

      if (existingCategory.length > 0) {
        console.log(`✅ Category already exists: ${categoryName}`);
        categoryMap.set(categoryName, existingCategory[0].id);
        categorySlugMap.set(slug, existingCategory[0].id);
        continue;
      }

      const newCategory = await db
        .insert(categories)
        .values({
          slug,
          name: categoryName,
          description: `Beautiful ${categoryName.toLowerCase()} collection`,
        })
        .returning();

      console.log(`✅ Created category: ${categoryName}`);
      categoryMap.set(categoryName, newCategory[0].id);
      categorySlugMap.set(slug, newCategory[0].id);
    }

    // Process products
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < productsToProcess.length; i++) {
      const productData = productsToProcess[i];

      try {
        console.log(
          `\n🔄 Processing product ${i + 1}/${productsToProcess.length}: ${
            productData.title
          }`
        );

        // Generate slug from title
        const slug = productData.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim()
          .substring(0, 100); // Limit slug length

        if (dryRun) {
          console.log(
            `[DRY RUN] Would create product: ${productData.title} (slug: ${slug})`
          );
          createdCount++;
          continue;
        }

        // Check if product already exists
        if (skipExisting) {
          const existingProduct = await db
            .select()
            .from(products)
            .where(eq(products.slug, slug))
            .limit(1);

          if (existingProduct.length > 0) {
            console.log(`⏭️  Product already exists: ${productData.title}`);
            skippedCount++;
            continue;
          }
        }

        // Create product
        const newProduct = await db
          .insert(products)
          .values({
            slug,
            title: productData.title,
            description:
              productData.description === "undefined"
                ? `Beautiful ${productData.title} - Handcrafted with care`
                : productData.description,
            base_price: productData.price.toString(),
            status: "active",
          })
          .returning();

        console.log(`✅ Created product: ${productData.title}`);

        // Add product image
        if (productData.imgUrl) {
          await db.insert(productMedia).values({
            product_id: newProduct[0].id,
            blob_url: productData.imgUrl,
            alt: productData.title,
            sort: 0,
          });
        }

        // Link to category
        if (productData.category && categoryMap.has(productData.category)) {
          await db.insert(productCategories).values({
            product_id: newProduct[0].id,
            category_id: categoryMap.get(productData.category)!,
          });
        }

        // Link to tag
        if (productData.type && tagMap.has(productData.type)) {
          await db.insert(productTags).values({
            product_id: newProduct[0].id,
            tag_id: tagMap.get(productData.type)!,
          });
        }

        // Add crystals (legacy approach)
        if (productData.crystals && productData.crystals.length > 0) {
          for (let j = 0; j < productData.crystals.length; j++) {
            const crystalName = productData.crystals[j];

            await db.insert(productCrystals).values({
              product_id: newProduct[0].id,
              name: crystalName,
              price_adjustment: "0", // Default to +$0
              is_default: j === 0, // First crystal is default
              is_available: true,
              sort_order: j,
            });
          }
          console.log(`💎 Added ${productData.crystals.length} crystals`);
        }

        // Add product options from variants (modern approach)
        if (productData.variants && productData.variants.length > 0) {
          for (
            let variantIndex = 0;
            variantIndex < productData.variants.length;
            variantIndex++
          ) {
            const variant = productData.variants[variantIndex];

            if (variant.options && variant.options.length > 0) {
              // Create product option
              const optionName = variant.name || "Material";
              const newOption = await db
                .insert(productOptions)
                .values({
                  product_id: newProduct[0].id,
                  name: optionName.toLowerCase().replace(/\s+/g, "_"),
                  display_name: optionName,
                  sort_order: variantIndex,
                })
                .returning();

              // Add option values
              for (
                let optionIndex = 0;
                optionIndex < variant.options.length;
                optionIndex++
              ) {
                const option = variant.options[optionIndex];

                if (option.name && option.name !== "Select a material") {
                  const priceAdjustment = option.price
                    ? (option.price - productData.price).toString()
                    : "0";

                  await db.insert(productOptionValues).values({
                    option_id: newOption[0].id,
                    name: option.name,
                    price_adjustment: priceAdjustment,
                    is_default: option.isDefault || false,
                    is_sold_out: option.isSoldOut || false,
                    sort_order: optionIndex,
                  });
                }
              }
              console.log(
                `⚙️  Added ${variant.options.length} option values for ${optionName}`
              );
            }
          }
        }

        // Create base price
        await db.insert(prices).values({
          product_id: newProduct[0].id,
          currency: "USD",
          amount: productData.price.toString(),
        });

        // Create inventory
        await db.insert(inventory).values({
          product_id: newProduct[0].id,
          quantity_available: 10, // Default stock
          quantity_reserved: 0,
        });

        createdCount++;
      } catch (error) {
        console.error(
          `❌ Error processing product ${productData.title}:`,
          error
        );
        errorCount++;
      }
    }

    console.log("\n🎉 Production data seeding completed!");
    console.log(`📊 Summary:`);
    console.log(`   ✅ Created: ${createdCount} products`);
    console.log(`   ⏭️  Skipped: ${skippedCount} products`);
    console.log(`   ❌ Errors: ${errorCount} products`);
    console.log(`   📂 Categories: ${uniqueCategories.size}`);
    console.log(`   🏷️  Tags: ${uniqueTags.size}`);

    return {
      created: createdCount,
      skipped: skippedCount,
      errors: errorCount,
      categories: uniqueCategories.size,
      tags: uniqueTags.size,
    };
  } catch (error) {
    console.error("❌ Error seeding production data:", error);
    throw error;
  }
}

// Helper function to generate unique slugs
function generateUniqueSlug(title: string, existingSlugs: Set<string>): string {
  let baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 100);

  let slug = baseSlug;
  let counter = 1;

  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  existingSlugs.add(slug);
  return slug;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: SeedOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--no-skip":
        options.skipExisting = false;
        break;
      case "--max-products":
        if (i + 1 < args.length) {
          options.maxProducts = parseInt(args[i + 1]);
          i++; // Skip next argument
        } else {
          console.error("Error: --max-products requires a number");
          process.exit(1);
        }
        break;
      case "--help":
        console.log(`
Usage: npm run seed:production [options]

Options:
  --dry-run              Show what would be done without making changes
  --no-skip              Don't skip existing products (will update them)
  --max-products <num>   Limit number of products to process
  --help                 Show this help message

Examples:
  npm run seed:production                    # Seed all products, skip existing
  npm run seed:production --dry-run          # Preview what would be done
  npm run seed:production --max-products 10  # Only process first 10 products
  npm run seed:production --no-skip          # Update existing products too
        `);
        process.exit(0);
        break;
    }
  }

  seedProductionData(options)
    .then((result) => {
      console.log("\n✅ Seed completed successfully!");
      console.log(`Result:`, result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Seed failed:", error);
      process.exit(1);
    });
}
