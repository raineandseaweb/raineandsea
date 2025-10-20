const { Pool } = require("pg");
const { config } = require("dotenv");

// Load environment variables
config({ path: ".env.local" });

async function addStockNotificationsTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  });

  try {
    console.log("Creating stock_notifications table...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "stock_notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "product_id" uuid NOT NULL,
        "email" text NOT NULL,
        "is_notified" boolean DEFAULT false NOT NULL,
        "notified_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    console.log("Creating indexes...");

    await pool.query(`
      CREATE INDEX IF NOT EXISTS "stock_notifications_product_idx" 
      ON "stock_notifications" USING btree ("product_id");
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS "stock_notifications_email_idx" 
      ON "stock_notifications" USING btree ("email");
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS "stock_notifications_notified_idx" 
      ON "stock_notifications" USING btree ("is_notified");
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS "stock_notifications_product_notified_idx" 
      ON "stock_notifications" USING btree ("product_id","is_notified");
    `);

    // Check if constraint already exists
    const constraintExists = await pool.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'stock_notifications_product_id_products_id_fk'
    `);

    if (constraintExists.rows.length === 0) {
      await pool.query(`
        ALTER TABLE "stock_notifications" 
        ADD CONSTRAINT "stock_notifications_product_id_products_id_fk" 
        FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") 
        ON DELETE cascade ON UPDATE no action;
      `);
    }

    console.log("Stock notifications table created successfully!");
  } catch (error) {
    console.error("Error creating stock notifications table:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addStockNotificationsTable();
