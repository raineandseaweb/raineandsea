-- Create product_analytics table
CREATE TABLE IF NOT EXISTS "product_analytics" (
	"product_id" uuid PRIMARY KEY NOT NULL,
	"total_sales" integer DEFAULT 0 NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_revenue" numeric(10, 2) DEFAULT '0' NOT NULL,
	"views_count" integer DEFAULT 0 NOT NULL,
	"last_sale_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create product_purchases table
CREATE TABLE IF NOT EXISTS "product_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign keys
DO $$ BEGIN
 ALTER TABLE "product_analytics" ADD CONSTRAINT "product_analytics_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "product_purchases" ADD CONSTRAINT "product_purchases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "product_purchases" ADD CONSTRAINT "product_purchases_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "product_purchases" ADD CONSTRAINT "product_purchases_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for product_analytics
CREATE INDEX IF NOT EXISTS "product_analytics_total_sales_idx" ON "product_analytics" ("total_sales");
CREATE INDEX IF NOT EXISTS "product_analytics_total_revenue_idx" ON "product_analytics" ("total_revenue");
CREATE INDEX IF NOT EXISTS "product_analytics_last_sale_idx" ON "product_analytics" ("last_sale_at");

-- Create indexes for product_purchases
CREATE INDEX IF NOT EXISTS "product_purchases_product_idx" ON "product_purchases" ("product_id");
CREATE INDEX IF NOT EXISTS "product_purchases_order_idx" ON "product_purchases" ("order_id");
CREATE INDEX IF NOT EXISTS "product_purchases_customer_idx" ON "product_purchases" ("customer_id");
CREATE INDEX IF NOT EXISTS "product_purchases_purchased_at_idx" ON "product_purchases" ("purchased_at");
CREATE INDEX IF NOT EXISTS "product_purchases_product_time_idx" ON "product_purchases" ("product_id", "purchased_at");

-- Initialize analytics for existing products
INSERT INTO "product_analytics" ("product_id", "total_sales", "total_orders", "total_revenue", "views_count", "updated_at")
SELECT 
  p.id,
  0,
  0,
  0,
  0,
  NOW()
FROM "products" p
ON CONFLICT ("product_id") DO NOTHING;

