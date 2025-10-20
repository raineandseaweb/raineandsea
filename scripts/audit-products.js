const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function auditProducts() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log("=== PRODUCT AUDIT REPORT ===\n");

    // 1. Check products with problematic crystal names
    const problematicCrystals = await client.query(`
      SELECT p.title, pc.name, pc.price_adjustment, pc.is_default
      FROM products p
      JOIN product_crystals pc ON p.id = pc.product_id
      WHERE pc.name IN ('Yes', 'No', 'Small', 'Medium', 'Large', 'Extra Large', 'XL', 'S', 'M', 'L', 'Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Pink', 'Purple', 'Orange', 'Select an option', 'Select a diameter', 'Select a size', 'Select a color')
      ORDER BY p.title, pc.sort_order;
    `);

    if (problematicCrystals.rows.length > 0) {
      console.log("❌ PRODUCTS WITH PROBLEMATIC CRYSTAL NAMES:");
      problematicCrystals.rows.forEach((row) => {
        console.log(
          `  ${row.title}: "${row.name}" (+$${row.price_adjustment}, default: ${row.is_default})`
        );
      });
      console.log();
    } else {
      console.log("✅ No products with problematic crystal names found\n");
    }

    // 2. Check products with non-numeric price adjustments
    const invalidPriceAdjustments = await client.query(`
      SELECT p.title, pc.name, pc.price_adjustment
      FROM products p
      JOIN product_crystals pc ON p.id = pc.product_id
      WHERE pc.price_adjustment::text !~ '^[0-9]+\.?[0-9]*$'
      ORDER BY p.title, pc.sort_order;
    `);

    if (invalidPriceAdjustments.rows.length > 0) {
      console.log("❌ PRODUCTS WITH INVALID PRICE ADJUSTMENTS:");
      invalidPriceAdjustments.rows.forEach((row) => {
        console.log(
          `  ${row.title}: "${row.name}" (adjustment: "${row.price_adjustment}")`
        );
      });
      console.log();
    } else {
      console.log("✅ All price adjustments are valid\n");
    }

    // 3. Check products with no crystals but should have them
    const productsWithoutCrystals = await client.query(`
      SELECT p.title, p.description
      FROM products p
      LEFT JOIN product_crystals pc ON p.id = pc.product_id
      WHERE pc.id IS NULL
      AND (p.title ILIKE '%crystal%' OR p.title ILIKE '%quartz%' OR p.title ILIKE '%amethyst%' OR p.title ILIKE '%labradorite%' OR p.title ILIKE '%moonstone%' OR p.title ILIKE '%onyx%' OR p.title ILIKE '%fluorite%' OR p.title ILIKE '%aquamarine%' OR p.title ILIKE '%malachite%' OR p.title ILIKE '%hematite%')
      ORDER BY p.title;
    `);

    if (productsWithoutCrystals.rows.length > 0) {
      console.log("⚠️  CRYSTAL PRODUCTS WITHOUT CRYSTAL DATA:");
      productsWithoutCrystals.rows.forEach((row) => {
        console.log(`  ${row.title}`);
      });
      console.log();
    } else {
      console.log("✅ All crystal products have crystal data\n");
    }

    // 4. Check products with crystals but shouldn't have them
    const nonCrystalProductsWithCrystals = await client.query(`
      SELECT p.title, COUNT(pc.id) as crystal_count
      FROM products p
      JOIN product_crystals pc ON p.id = pc.product_id
      WHERE NOT (p.title ILIKE '%crystal%' OR p.title ILIKE '%quartz%' OR p.title ILIKE '%amethyst%' OR p.title ILIKE '%labradorite%' OR p.title ILIKE '%moonstone%' OR p.title ILIKE '%onyx%' OR p.title ILIKE '%fluorite%' OR p.title ILIKE '%aquamarine%' OR p.title ILIKE '%malachite%' OR p.title ILIKE '%hematite%')
      GROUP BY p.id, p.title
      ORDER BY crystal_count DESC;
    `);

    if (nonCrystalProductsWithCrystals.rows.length > 0) {
      console.log("⚠️  NON-CRYSTAL PRODUCTS WITH CRYSTAL DATA:");
      nonCrystalProductsWithCrystals.rows.forEach((row) => {
        console.log(`  ${row.title}: ${row.crystal_count} crystals`);
      });
      console.log();
    } else {
      console.log("✅ No non-crystal products have crystal data\n");
    }

    // 5. Check for products with NaN price issues
    const productsWithPriceIssues = await client.query(`
      SELECT p.title, v.title as variant_title, pr.amount as price, pr.currency
      FROM products p
      JOIN variants v ON p.id = v.product_id
      JOIN prices pr ON v.id = pr.variant_id
      WHERE pr.amount IS NULL OR pr.amount::text = '' OR pr.amount::text !~ '^[0-9]+\.?[0-9]*$'
      ORDER BY p.title, v.title;
    `);

    if (productsWithPriceIssues.rows.length > 0) {
      console.log("❌ PRODUCTS WITH PRICE ISSUES:");
      productsWithPriceIssues.rows.forEach((row) => {
        console.log(
          `  ${row.title}: "${row.variant_title}" (price: "${row.price}", currency: ${row.currency})`
        );
      });
      console.log();
    } else {
      console.log("✅ All product prices are valid\n");
    }

    // 6. Summary statistics
    const stats = await client.query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COUNT(DISTINCT pc.product_id) as products_with_crystals,
        COUNT(pc.id) as total_crystals,
        COUNT(DISTINCT CASE WHEN pc.price_adjustment != '0' THEN pc.product_id END) as products_with_price_adjustments
      FROM products p
      LEFT JOIN product_crystals pc ON p.id = pc.product_id;
    `);

    console.log("=== SUMMARY STATISTICS ===");
    console.log(`Total products: ${stats.rows[0].total_products}`);
    console.log(
      `Products with crystals: ${stats.rows[0].products_with_crystals}`
    );
    console.log(`Total crystals: ${stats.rows[0].total_crystals}`);
    console.log(
      `Products with price adjustments: ${stats.rows[0].products_with_price_adjustments}`
    );
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

auditProducts();
