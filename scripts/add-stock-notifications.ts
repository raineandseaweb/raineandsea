import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

async function addStockNotificationsTable() {
  try {
    console.log("Creating stock_notifications table...");

    await db.execute(sql`
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

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "stock_notifications_product_idx" 
      ON "stock_notifications" USING btree ("product_id");
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "stock_notifications_email_idx" 
      ON "stock_notifications" USING btree ("email");
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "stock_notifications_notified_idx" 
      ON "stock_notifications" USING btree ("is_notified");
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "stock_notifications_product_notified_idx" 
      ON "stock_notifications" USING btree ("product_id","is_notified");
    `);

    await db.execute(sql`
      ALTER TABLE "stock_notifications" 
      ADD CONSTRAINT IF NOT EXISTS "stock_notifications_product_id_products_id_fk" 
      FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") 
      ON DELETE cascade ON UPDATE no action;
    `);

    console.log("Stock notifications table created successfully!");
  } catch (error) {
    console.error("Error creating stock notifications table:", error);
    process.exit(1);
  }
}

addStockNotificationsTable();
