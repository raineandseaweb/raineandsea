/**
 * Script to add performance indexes to improve query performance
 * Run this after the schema changes to add the new indexes
 */

const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function addPerformanceIndexes() {
  console.log("Adding performance indexes...");

  // Get database URL from environment
  const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL or POSTGRES_URL must be set");
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    // Add composite index for products status + created_at
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS products_status_created_idx 
      ON products (status, created_at DESC)
    `);
    console.log("✓ Added products_status_created_idx");

    // Add index for inventory product_id (if not exists)
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS inventory_product_idx 
      ON inventory (product_id)
    `);
    console.log("✓ Added inventory_product_idx");

    // Add index for order_items product_id (if not exists)
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS order_items_product_idx 
      ON order_items (product_id)
    `);
    console.log("✓ Added order_items_product_idx");

    // Add index for order_items order_id (if not exists)
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS order_items_order_idx 
      ON order_items (order_id)
    `);
    console.log("✓ Added order_items_order_idx");

    // Add index for addresses customer_id (if not exists)
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS addresses_customer_idx 
      ON addresses (customer_id)
    `);
    console.log("✓ Added addresses_customer_idx");

    // Add index for addresses order_id (if not exists)
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS addresses_order_idx 
      ON addresses (order_id)
    `);
    console.log("✓ Added addresses_order_idx");

    // Add index for customers email (if not exists)
    await pool.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS customers_email_idx 
      ON customers (email)
    `);
    console.log("✓ Added customers_email_idx");

    console.log("All performance indexes added successfully!");
  } catch (error) {
    console.error("Error adding indexes:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  addPerformanceIndexes()
    .then(() => {
      console.log("Performance indexes script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Performance indexes script failed:", error);
      process.exit(1);
    });
}

module.exports = { addPerformanceIndexes };

