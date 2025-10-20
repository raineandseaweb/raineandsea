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
  customers,
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
      customers,
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

interface SeedOptions {
  skipExisting?: boolean;
  dryRun?: boolean;
  createRootUser?: boolean;
  rootUserEmail?: string;
  rootUserPassword?: string;
}

export async function seedFromCurrentData(options: SeedOptions = {}) {
  const {
    skipExisting = true,
    dryRun = false,
    createRootUser = true,
    rootUserEmail = "admin@example.com",
    rootUserPassword = "admin123",
  } = options;

  try {
    console.log("🌱 Starting seed from current database data...");
    console.log(
      `Options: skipExisting=${skipExisting}, dryRun=${dryRun}, createRootUser=${createRootUser}`
    );

    // Initialize database connection
    const db = await initializeDb();

    // Read exported data
    const dataPath = path.join(process.cwd(), "current-database-data.json");
    if (!fs.existsSync(dataPath)) {
      throw new Error(
        "current-database-data.json not found. Run export-current-data.ts first."
      );
    }

    const exportedData: ExportedData = JSON.parse(
      fs.readFileSync(dataPath, "utf-8")
    );

    console.log(`📦 Found exported data:`);
    console.log(`   📂 Categories: ${exportedData.categories.length}`);
    console.log(`   🏷️  Tags: ${exportedData.tags.length}`);
    console.log(`   📦 Products: ${exportedData.products.length}`);
    console.log(`   🖼️  Product Media: ${exportedData.productMedia.length}`);
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

    // Create root user
    if (createRootUser) {
      console.log("\n👤 Creating root user...");

      if (dryRun) {
        console.log(`[DRY RUN] Would create root user: ${rootUserEmail}`);
      } else {
        // Check if root user already exists
        const existingUser = await db
          .select()
          .from(customers)
          .where(eq(customers.email, rootUserEmail))
          .limit(1);

        if (existingUser.length > 0) {
          console.log(`✅ Root user already exists: ${rootUserEmail}`);
        } else {
          // Create root user
          const newUser = await db
            .insert(customers)
            .values({
              email: rootUserEmail,
              name: "Root Administrator",
              role: "admin",
              email_verified: new Date(),
            })
            .returning();

          console.log(
            `✅ Created root user: ${rootUserEmail} (ID: ${newUser[0].id})`
          );
        }
      }
    }

    // Seed categories
    console.log("\n📂 Seeding categories...");
    let categoriesCreated = 0;
    let categoriesSkipped = 0;

    for (const category of exportedData.categories) {
      if (dryRun) {
        console.log(`[DRY RUN] Would create category: ${category.name}`);
        categoriesCreated++;
        continue;
      }

      if (skipExisting) {
        const existingCategory = await db
          .select()
          .from(categories)
          .where(eq(categories.slug, category.slug))
          .limit(1);

        if (existingCategory.length > 0) {
          categoriesSkipped++;
          continue;
        }
      }

      await db.insert(categories).values({
        slug: category.slug,
        name: category.name,
        description: category.description,
        thumbnail: category.thumbnail,
        parent_id: category.parent_id,
      });

      categoriesCreated++;
    }

    console.log(
      `✅ Categories: ${categoriesCreated} created, ${categoriesSkipped} skipped`
    );

    // Seed tags
    console.log("\n🏷️  Seeding tags...");
    let tagsCreated = 0;
    let tagsSkipped = 0;

    for (const tag of exportedData.tags) {
      if (dryRun) {
        console.log(`[DRY RUN] Would create tag: ${tag.name}`);
        tagsCreated++;
        continue;
      }

      if (skipExisting) {
        const existingTag = await db
          .select()
          .from(tags)
          .where(eq(tags.name, tag.name))
          .limit(1);

        if (existingTag.length > 0) {
          tagsSkipped++;
          continue;
        }
      }

      await db.insert(tags).values({
        name: tag.name,
        color: tag.color,
      });

      tagsCreated++;
    }

    console.log(`✅ Tags: ${tagsCreated} created, ${tagsSkipped} skipped`);

    // Seed products
    console.log("\n📦 Seeding products...");
    let productsCreated = 0;
    let productsSkipped = 0;

    for (const product of exportedData.products) {
      if (dryRun) {
        console.log(`[DRY RUN] Would create product: ${product.title}`);
        productsCreated++;
        continue;
      }

      if (skipExisting) {
        const existingProduct = await db
          .select()
          .from(products)
          .where(eq(products.slug, product.slug))
          .limit(1);

        if (existingProduct.length > 0) {
          productsSkipped++;
          continue;
        }
      }

      const newProduct = await db
        .insert(products)
        .values({
          slug: product.slug,
          title: product.title,
          description: product.description,
          image: product.image,
          base_price: product.base_price,
          status: product.status as "active" | "inactive" | "draft",
        })
        .returning();

      // Create product media
      const productMediaItems = exportedData.productMedia.filter(
        (media) => media.product_id === product.id
      );
      for (const media of productMediaItems) {
        await db.insert(productMedia).values({
          product_id: newProduct[0].id,
          blob_url: media.blob_url,
          alt: media.alt,
          sort: media.sort,
        });
      }

      // Create product categories
      const productCategoryItems = exportedData.productCategories.filter(
        (pc) => pc.product_id === product.id
      );
      for (const pc of productCategoryItems) {
        // Find the category by name (since we're creating new categories)
        const category = exportedData.categories.find(
          (c) => c.id === pc.category_id
        );
        if (category) {
          const newCategory = await db
            .select()
            .from(categories)
            .where(eq(categories.slug, category.slug))
            .limit(1);

          if (newCategory.length > 0) {
            await db.insert(productCategories).values({
              product_id: newProduct[0].id,
              category_id: newCategory[0].id,
            });
          }
        }
      }

      // Create product tags
      const productTagItems = exportedData.productTags.filter(
        (pt) => pt.product_id === product.id
      );
      for (const pt of productTagItems) {
        // Find the tag by name (since we're creating new tags)
        const tag = exportedData.tags.find((t) => t.id === pt.tag_id);
        if (tag) {
          const newTag = await db
            .select()
            .from(tags)
            .where(eq(tags.name, tag.name))
            .limit(1);

          if (newTag.length > 0) {
            await db.insert(productTags).values({
              product_id: newProduct[0].id,
              tag_id: newTag[0].id,
            });
          }
        }
      }

      // Create product crystals
      const productCrystalItems = exportedData.productCrystals.filter(
        (pc) => pc.product_id === product.id
      );
      for (const crystal of productCrystalItems) {
        await db.insert(productCrystals).values({
          product_id: newProduct[0].id,
          name: crystal.name,
          price_adjustment: crystal.price_adjustment,
          is_default: crystal.is_default,
          is_available: crystal.is_available,
          sort_order: crystal.sort_order,
        });
      }

      // Create product options
      const productOptionItems = exportedData.productOptions.filter(
        (po) => po.product_id === product.id
      );
      for (const option of productOptionItems) {
        const newOption = await db
          .insert(productOptions)
          .values({
            product_id: newProduct[0].id,
            name: option.name,
            display_name: option.display_name,
            sort_order: option.sort_order,
          })
          .returning();

        // Create option values
        const optionValues = exportedData.productOptionValues.filter(
          (ov) => ov.option_id === option.id
        );
        for (const value of optionValues) {
          await db.insert(productOptionValues).values({
            option_id: newOption[0].id,
            name: value.name,
            price_adjustment: value.price_adjustment,
            is_default: value.is_default,
            is_sold_out: value.is_sold_out,
            sort_order: value.sort_order,
          });
        }
      }

      // Create prices
      const priceItems = exportedData.prices.filter(
        (p) => p.product_id === product.id
      );
      for (const price of priceItems) {
        await db.insert(prices).values({
          product_id: newProduct[0].id,
          currency: price.currency,
          amount: price.amount,
          compare_at_amount: price.compare_at_amount,
          starts_at: price.starts_at,
          ends_at: price.ends_at,
        });
      }

      // Create inventory
      const inventoryItems = exportedData.inventory.filter(
        (inv) => inv.product_id === product.id
      );
      for (const inv of inventoryItems) {
        await db.insert(inventory).values({
          product_id: newProduct[0].id,
          location_id: inv.location_id,
          quantity_available: inv.quantity_available,
          quantity_reserved: inv.quantity_reserved,
        });
      }

      productsCreated++;
    }

    console.log(
      `✅ Products: ${productsCreated} created, ${productsSkipped} skipped`
    );

    console.log("\n🎉 Database seeding completed!");
    console.log(`📊 Summary:`);
    console.log(
      `   📂 Categories: ${categoriesCreated} created, ${categoriesSkipped} skipped`
    );
    console.log(`   🏷️  Tags: ${tagsCreated} created, ${tagsSkipped} skipped`);
    console.log(
      `   📦 Products: ${productsCreated} created, ${productsSkipped} skipped`
    );
    console.log(`   👤 Root User: ${createRootUser ? "Created" : "Skipped"}`);

    return {
      categories: { created: categoriesCreated, skipped: categoriesSkipped },
      tags: { created: tagsCreated, skipped: tagsSkipped },
      products: { created: productsCreated, skipped: productsSkipped },
      rootUser: createRootUser,
    };
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
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
      case "--no-root-user":
        options.createRootUser = false;
        break;
      case "--root-email":
        if (i + 1 < args.length) {
          options.rootUserEmail = args[i + 1];
          i++; // Skip next argument
        } else {
          console.error("Error: --root-email requires an email address");
          process.exit(1);
        }
        break;
      case "--root-password":
        if (i + 1 < args.length) {
          options.rootUserPassword = args[i + 1];
          i++; // Skip next argument
        } else {
          console.error("Error: --root-password requires a password");
          process.exit(1);
        }
        break;
      case "--help":
        console.log(`
Usage: npm run seed:current [options]

Options:
  --dry-run              Show what would be done without making changes
  --no-skip              Don't skip existing records (will update them)
  --no-root-user         Don't create root user
  --root-email <email>   Root user email (default: admin@example.com)
  --root-password <pwd>  Root user password (default: admin123)
  --help                 Show this help message

Examples:
  npm run seed:current                    # Seed all data, skip existing
  npm run seed:current --dry-run         # Preview what would be done
  npm run seed:current --no-root-user    # Don't create root user
  npm run seed:current --root-email admin@mysite.com
        `);
        process.exit(0);
        break;
      default:
        // Ignore unknown arguments
        break;
    }
  }

  seedFromCurrentData(options)
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
