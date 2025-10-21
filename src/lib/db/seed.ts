import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

import { db } from "./index";
import {
  categories,
  inventory,
  prices,
  productCategories,
  products,
} from "./schema";

export async function seedDatabase() {
  try {
    console.log("🌱 Starting database seed...");

    // Create categories
    const electronicsCategory = await db
      .insert(categories)
      .values({
        slug: "electronics",
        name: "Electronics",
      })
      .returning();

    const clothingCategory = await db
      .insert(categories)
      .values({
        slug: "clothing",
        name: "Clothing",
      })
      .returning();

    const homeCategory = await db
      .insert(categories)
      .values({
        slug: "home-garden",
        name: "Home & Garden",
      })
      .returning();

    console.log("✅ Categories created");

    // Create products
    const laptopProduct = await db
      .insert(products)
      .values({
        slug: "macbook-pro-16",
        title: "MacBook Pro 16-inch",
        description:
          "Powerful laptop with M3 Pro chip, perfect for professionals and creators.",
        status: "active",
      })
      .returning();

    const shirtProduct = await db
      .insert(products)
      .values({
        slug: "premium-cotton-shirt",
        title: "Premium Cotton Shirt",
        description:
          "High-quality cotton shirt with modern fit and comfortable design.",
        status: "active",
      })
      .returning();

    const chairProduct = await db
      .insert(products)
      .values({
        slug: "ergonomic-office-chair",
        title: "Ergonomic Office Chair",
        description:
          "Comfortable ergonomic chair designed for long work sessions.",
        status: "active",
      })
      .returning();

    console.log("✅ Products created");

    // Create variants - DISABLED: variants table removed from schema
    // const laptopVariant = await db
    //   .insert(variants)
    //   .values({
    //     product_id: laptopProduct[0].id,
    //     sku: "MBP16-M3-512",
    //     title: 'MacBook Pro 16" M3 Pro 512GB',
    //     dimensions: { length: 35.57, width: 24.81, height: 1.68 },
    //     weight: "2.16",
    //   })
    //   .returning();

    // const shirtVariantS = await db
    //   .insert(variants)
    //   .values({
    //     product_id: shirtProduct[0].id,
    //     sku: "SHIRT-COTTON-S",
    //     title: "Premium Cotton Shirt - Small",
    //   })
    //   .returning();

    // const shirtVariantM = await db
    //   .insert(variants)
    //   .values({
    //     product_id: shirtProduct[0].id,
    //     sku: "SHIRT-COTTON-M",
    //     title: "Premium Cotton Shirt - Medium",
    //   })
    //   .returning();

    // const chairVariant = await db
    //   .insert(variants)
    //   .values({
    //     product_id: chairProduct[0].id,
    //     sku: "CHAIR-ERGONOMIC-BLACK",
    //     title: "Ergonomic Office Chair - Black",
    //     dimensions: { length: 60, width: 60, height: 120 },
    //     weight: "25.5",
    //   })
    //   .returning();

    console.log("✅ Variants created (skipped - table removed)");

    // Create prices
    await db.insert(prices).values({
      product_id: laptopProduct[0].id,
      currency: "USD",
      amount: "2499.00",
      compare_at_amount: "2799.00",
    });

    await db.insert(prices).values({
      product_id: shirtProduct[0].id,
      currency: "USD",
      amount: "49.99",
    });

    await db.insert(prices).values({
      product_id: shirtProduct[0].id,
      currency: "USD",
      amount: "49.99",
    });

    await db.insert(prices).values({
      product_id: chairProduct[0].id,
      currency: "USD",
      amount: "299.99",
      compare_at_amount: "399.99",
    });

    console.log("✅ Prices created");

    // Create inventory
    await db.insert(inventory).values({
      product_id: laptopProduct[0].id,
      quantity_available: 15,
      quantity_reserved: 0,
    });

    await db.insert(inventory).values({
      product_id: shirtProduct[0].id,
      quantity_available: 50,
      quantity_reserved: 0,
    });

    await db.insert(inventory).values({
      product_id: shirtProduct[0].id,
      quantity_available: 75,
      quantity_reserved: 0,
    });

    await db.insert(inventory).values({
      product_id: chairProduct[0].id,
      quantity_available: 8,
      quantity_reserved: 0,
    });

    console.log("✅ Inventory created");

    // Link products to categories
    await db.insert(productCategories).values({
      product_id: laptopProduct[0].id,
      category_id: electronicsCategory[0].id,
    });

    await db.insert(productCategories).values({
      product_id: shirtProduct[0].id,
      category_id: clothingCategory[0].id,
    });

    await db.insert(productCategories).values({
      product_id: chairProduct[0].id,
      category_id: homeCategory[0].id,
    });

    console.log("✅ Product categories linked");

    console.log("🎉 Database seeded successfully!");

    return {
      products: [laptopProduct[0], shirtProduct[0], chairProduct[0]],
      categories: [
        electronicsCategory[0],
        clothingCategory[0],
        homeCategory[0],
      ],
      // variants: [ // DISABLED: variants table removed
      //   laptopVariant[0],
      //   shirtVariantS[0],
      //   shirtVariantM[0],
      //   chairVariant[0],
      // ],
    };
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log("Seed completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}
