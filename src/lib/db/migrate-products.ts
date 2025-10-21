import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { slugify } from "../utils";
import { db } from "./index";
import {
  categories,
  inventory,
  prices,
  productCategories,
  productMedia,
  products,
} from "./schema";

interface ProductImage {
  thumbnail: string;
  original: string;
}

interface VariantOption {
  _id: string;
  name: string;
  price: number | null;
  isSoldOut: boolean;
  isDefault: boolean;
}

interface ProductVariant {
  _id: string;
  name: string;
  options: VariantOption[];
  isGenericForCategory: boolean;
}

interface ProductData {
  _id: string;
  title: string;
  price: number;
  description: string;
  type: string;
  category: string;
  imgUrl: string;
  crystals?: string[];
  variants?: ProductVariant[];
  stock: number;
  personalizationHint?: string;
  images: ProductImage[];
}

async function migrateProducts() {
  try {
    console.log("🚀 Starting products migration...");

    // Read products.json
    const fs = await import("fs/promises");
    const productsData: ProductData[] = JSON.parse(
      await fs.readFile("products.json", "utf-8")
    );

    console.log(`📦 Found ${productsData.length} products to migrate`);

    // Create categories from unique types and categories
    const categoryMap = new Map<string, string>();
    const uniqueCategories = new Set<string>();

    productsData.forEach((product) => {
      uniqueCategories.add(product.type);
      uniqueCategories.add(product.category);
    });

    console.log(`📂 Creating ${uniqueCategories.size} categories...`);

    for (const categoryName of uniqueCategories) {
      const slug = slugify(categoryName);
      const existingCategory = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);

      if (existingCategory.length === 0) {
        const newCategory = await db
          .insert(categories)
          .values({
            slug,
            name: categoryName,
          })
          .returning();

        categoryMap.set(categoryName, newCategory[0].id);
        console.log(`✅ Created category: ${categoryName}`);
      } else {
        categoryMap.set(categoryName, existingCategory[0].id);
        console.log(`♻️ Using existing category: ${categoryName}`);
      }
    }

    // Process products
    let processedCount = 0;
    const batchSize = 50;

    for (let i = 0; i < productsData.length; i += batchSize) {
      const batch = productsData.slice(i, i + batchSize);

      for (const productData of batch) {
        try {
          await processProduct(productData, categoryMap);
          processedCount++;

          if (processedCount % 10 === 0) {
            console.log(
              `📈 Processed ${processedCount}/${productsData.length} products`
            );
          }
        } catch (error) {
          console.error(
            `❌ Error processing product ${productData._id}:`,
            error
          );
        }
      }
    }

    console.log(`🎉 Migration completed! Processed ${processedCount} products`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

async function processProduct(
  productData: ProductData,
  categoryMap: Map<string, string>
) {
  const slug = slugify(productData.title);

  // Check if product already exists
  const existingProduct = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (existingProduct.length > 0) {
    console.log(`♻️ Product already exists: ${productData.title}`);
    return;
  }

  // Create product
  const product = await db
    .insert(products)
    .values({
      slug,
      title: productData.title,
      description:
        productData.description === "undefined"
          ? productData.title
          : productData.description,
      status: "active",
    })
    .returning();

  const productId = product[0].id;

  // Link to categories
  const typeCategoryId = categoryMap.get(productData.type);
  const categoryId = categoryMap.get(productData.category);

  if (typeCategoryId) {
    await db.insert(productCategories).values({
      product_id: productId,
      category_id: typeCategoryId,
    });
  }

  if (categoryId && categoryId !== typeCategoryId) {
    await db.insert(productCategories).values({
      product_id: productId,
      category_id: categoryId,
    });
  }

  // Add images
  if (productData.images && productData.images.length > 0) {
    for (let i = 0; i < productData.images.length; i++) {
      const image = productData.images[i];
      await db.insert(productMedia).values({
        product_id: productId,
        blob_url: image.original,
        alt: `${productData.title} - Image ${i + 1}`,
        sort: i,
      });
    }
  } else if (productData.imgUrl) {
    // Fallback to main image only if no images array exists
    await db.insert(productMedia).values({
      product_id: productId,
      blob_url: productData.imgUrl,
      alt: productData.title,
      sort: 0,
    });
  }

  // Process variants
  if (productData.variants && productData.variants.length > 0) {
    await processVariants(productData, productId);
  } else {
    // Create default variant if no variants exist
    await createDefaultVariant(productData, productId);
  }
}

async function processVariants(productData: ProductData, productId: string) {
  if (!productData.variants || productData.variants.length === 0) {
    // Fallback to default variant
    await createDefaultVariant(productData, productId);
    return;
  }

  // Create a base variant for this product - DISABLED: variants table removed
  // const baseVariant = await db
  //   .insert(variants)
  //   .values({
  //     product_id: productId,
  //     sku: `${productData._id}-base`,
  //     title: productData.title,
  //   })
  //   .returning();

  // Add base price
  await db.insert(prices).values({
    product_id: productId,
    currency: "USD",
    amount: productData.price.toString(),
  });

  // Add inventory
  await db.insert(inventory).values({
    product_id: productId,
    quantity_available: productData.stock || 1,
    quantity_reserved: 0,
  });

  // Process each variant group (e.g., "Size", "Style", etc.) - DISABLED: variants table removed
  // for (
  //   let variantIndex = 0;
  //   variantIndex < productData.variants.length;
  //   variantIndex++
  // ) {
  //   const variantGroup = productData.variants[variantIndex];

  //   // Create variant option (e.g., "Size", "Style")
  //   const variantOption = await db
  //     .insert(variantOptions)
  //     .values({
  //       variant_id: baseVariant[0].id,
  //       name: variantGroup.name || `Option ${variantIndex + 1}`,
  //       display_name:
  //         variantGroup.name || `Select ${variantGroup.name || "option"}`,
  //       sort_order: variantIndex,
  //     })
  //     .returning();

  //   // Process each option value (e.g., "Small", "Medium", "Large")
  //   for (
  //     let optionIndex = 0;
  //     optionIndex < variantGroup.options.length;
  //     optionIndex++
  //   ) {
  //     const option = variantGroup.options[optionIndex];

  //     // Skip default/placeholder options
  //     if (option.isDefault || !option.name || option.name.includes("Select")) {
  //       continue;
  //     }

  //     // Calculate price adjustment relative to base price
  //     const priceAdjustment =
  //       option.price !== null
  //         ? (option.price - productData.price).toString()
  //         : "0";

  //     await db.insert(variantOptionValues).values({
  //       option_id: variantOption[0].id,
  //       name: option.name,
  //       price_adjustment: priceAdjustment,
  //       is_default: option.isDefault,
  //       is_sold_out: option.isSoldOut,
  //       sort_order: optionIndex,
  //     });
  //   }
  // }
}

async function createDefaultVariant(
  productData: ProductData,
  productId: string
) {
  // Create a single default variant - DISABLED: variants table removed
  // const variant = await db
  //   .insert(variants)
  //   .values({
  //     product_id: productId,
  //     sku: `${productData._id}-default`,
  //     title: productData.title,
  //   })
  //   .returning();

  // Add price
  await db.insert(prices).values({
    product_id: productId,
    currency: "USD",
    amount: productData.price.toString(),
  });

  // Add inventory
  await db.insert(inventory).values({
    product_id: productId,
    quantity_available: productData.stock || 1,
    quantity_reserved: 0,
  });
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateProducts()
    .then(() => {
      console.log("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { migrateProducts };
