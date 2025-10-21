const { Pool } = require("pg");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// Set up database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function importCorrectCatalog() {
  try {
    console.log("🌱 Starting correct catalog import to Neon...");

    // Test connection
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Connected to Neon:", result.rows[0].now);

    // Read the original products.json
    console.log("📖 Reading original products.json...");
    const products = JSON.parse(fs.readFileSync("products.json", "utf8"));

    console.log(`Found ${products.length} products with variants`);

    // Clear existing data
    console.log("🧹 Clearing existing data...");
    await pool.query("DELETE FROM product_categories");
    await pool.query("DELETE FROM inventory");
    await pool.query("DELETE FROM prices");
    await pool.query("DELETE FROM products");
    await pool.query("DELETE FROM categories");
    console.log("✅ Existing data cleared");

    // Create categories from products
    console.log("📂 Creating categories from products...");
    const categoryMap = new Map();
    const categories = [];

    products.forEach((product) => {
      if (product.category && !categoryMap.has(product.category)) {
        const categoryId = `cat-${product.category
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")}`;
        categoryMap.set(product.category, categoryId);
        categories.push({
          id: categoryId,
          slug: product.category.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          name: product.category,
          description: null,
          thumbnail: null,
          parent_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });

    // Insert categories
    for (const category of categories) {
      await pool.query(
        `
        INSERT INTO categories (id, slug, name, description, thumbnail, parent_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          category.id,
          category.slug,
          category.name,
          category.description,
          category.thumbnail,
          category.parent_id,
          category.created_at,
          category.updated_at,
        ]
      );
    }
    console.log(`✅ Created ${categories.length} categories`);

    // Import products (one per product, not per variant)
    console.log("📦 Importing products...");
    for (const product of products) {
      const productId = `prod-${product._id}`;
      const slug = product.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 100);

      await pool.query(
        `
        INSERT INTO products (id, slug, title, description, image, base_price, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
        [
          productId,
          slug,
          product.title,
          product.description === "undefined" ? null : product.description,
          product.imgUrl,
          product.price,
          "active",
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      );

      // Link product to category
      const categoryId = categoryMap.get(product.category);
      if (categoryId) {
        await pool.query(
          `
          INSERT INTO product_categories (product_id, category_id)
          VALUES ($1, $2)
        `,
          [productId, categoryId]
        );
      }

      // Create prices for each variant option
      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          if (variant.options && variant.options.length > 0) {
            for (const option of variant.options) {
              if (
                option.price &&
                option.name !== "Select a material" &&
                option.name !== "Select an option"
              ) {
                await pool.query(
                  `
                  INSERT INTO prices (product_id, currency, amount, compare_at_amount, starts_at, ends_at, created_at, updated_at)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `,
                  [
                    productId,
                    "USD",
                    option.price,
                    null,
                    null,
                    null,
                    new Date().toISOString(),
                    new Date().toISOString(),
                  ]
                );
              }
            }
          }
        }
      } else {
        // If no variants, use base price
        await pool.query(
          `
          INSERT INTO prices (product_id, currency, amount, compare_at_amount, starts_at, ends_at, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [
            productId,
            "USD",
            product.price,
            null,
            null,
            null,
            new Date().toISOString(),
            new Date().toISOString(),
          ]
        );
      }

      // Create inventory record
      await pool.query(
        `
        INSERT INTO inventory (product_id, location_id, quantity_available, quantity_reserved, updated_at)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [productId, "main", product.stock || 10, 0, new Date().toISOString()]
      );
    }
    console.log(`✅ Imported ${products.length} products`);

    console.log("🎉 Correct catalog import completed successfully!");

    // Show summary
    const summary = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM categories) as categories,
        (SELECT COUNT(*) FROM products) as products,
        (SELECT COUNT(*) FROM prices) as prices,
        (SELECT COUNT(*) FROM inventory) as inventory,
        (SELECT COUNT(*) FROM product_categories) as product_categories
    `);
    console.log("📊 Final database summary:", summary.rows[0]);
  } catch (error) {
    console.error("❌ Import failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the import
importCorrectCatalog().catch(console.error);
