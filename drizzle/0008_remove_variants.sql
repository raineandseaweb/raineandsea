-- Migration to remove variants and switch to product options system
-- This migration removes the variant system and replaces it with direct product options

-- Step 1: Create new product options tables
CREATE TABLE IF NOT EXISTS "product_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "product_option_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_adjustment" numeric(10, 2) DEFAULT '0' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_sold_out" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Step 2: Add indexes for new tables
CREATE INDEX IF NOT EXISTS "product_options_product_idx" ON "product_options" ("product_id");
CREATE INDEX IF NOT EXISTS "product_options_sort_idx" ON "product_options" ("sort_order");
CREATE INDEX IF NOT EXISTS "product_option_values_option_idx" ON "product_option_values" ("option_id");
CREATE INDEX IF NOT EXISTS "product_option_values_sort_idx" ON "product_option_values" ("sort_order");

-- Step 3: Migrate data from variant_option_values to product_option_values
-- First, create product options for each variant
INSERT INTO "product_options" ("product_id", "name", "display_name", "sort_order", "created_at")
SELECT DISTINCT 
    v.product_id,
    vo.name,
    vo.display_name,
    vo.sort_order,
    vo.created_at
FROM "variant_options" vo
JOIN "variants" v ON vo.variant_id = v.id;

-- Step 4: Migrate variant option values to product option values
INSERT INTO "product_option_values" ("option_id", "name", "price_adjustment", "is_default", "is_sold_out", "sort_order", "created_at")
SELECT 
    po.id,
    vov.name,
    vov.price_adjustment,
    vov.is_default,
    vov.is_sold_out,
    vov.sort_order,
    vov.created_at
FROM "variant_option_values" vov
JOIN "variant_options" vo ON vov.option_id = vo.id
JOIN "variants" v ON vo.variant_id = v.id
JOIN "product_options" po ON po.product_id = v.product_id AND po.name = vo.name;

-- Step 5: Update cart_items to use product_id instead of variant_id
-- First, add the new columns
ALTER TABLE "cart_items" ADD COLUMN "product_id" uuid;
ALTER TABLE "cart_items" ADD COLUMN "selected_options" jsonb;

-- Migrate cart items data
UPDATE "cart_items" 
SET "product_id" = v.product_id
FROM "variants" v 
WHERE "cart_items"."variant_id" = v.id;

-- Step 6: Update order_items to use product_id instead of variant_id
-- First, add the new columns
ALTER TABLE "order_items" ADD COLUMN "product_id" uuid;
ALTER TABLE "order_items" ADD COLUMN "selected_options" jsonb;
ALTER TABLE "order_items" ADD COLUMN "descriptive_title" text;

-- Migrate order items data
UPDATE "order_items" 
SET "product_id" = v.product_id
FROM "variants" v 
WHERE "order_items"."variant_id" = v.id;

-- Step 7: Update prices table to use product_id instead of variant_id
-- First, add the new column
ALTER TABLE "prices" ADD COLUMN "product_id" uuid;

-- Migrate prices data
UPDATE "prices" 
SET "product_id" = v.product_id
FROM "variants" v 
WHERE "prices"."variant_id" = v.id;

-- Step 8: Update inventory table to use product_id instead of variant_id
-- First, add the new column
ALTER TABLE "inventory" ADD COLUMN "product_id" uuid;

-- Migrate inventory data
UPDATE "inventory" 
SET "product_id" = v.product_id
FROM "variants" v 
WHERE "inventory"."variant_id" = v.id;

-- Step 9: Add foreign key constraints for new columns
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade;
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_option_id_product_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "product_options"("id") ON DELETE cascade;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id");
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id");
ALTER TABLE "prices" ADD CONSTRAINT "prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade;

-- Step 10: Add indexes for new foreign keys
CREATE INDEX IF NOT EXISTS "cart_items_product_idx" ON "cart_items" ("product_id");
CREATE INDEX IF NOT EXISTS "order_items_product_idx" ON "order_items" ("product_id");
CREATE INDEX IF NOT EXISTS "prices_product_idx" ON "prices" ("product_id");

-- Step 11: Make new columns NOT NULL after data migration
ALTER TABLE "cart_items" ALTER COLUMN "product_id" SET NOT NULL;
ALTER TABLE "order_items" ALTER COLUMN "product_id" SET NOT NULL;
ALTER TABLE "prices" ALTER COLUMN "product_id" SET NOT NULL;
ALTER TABLE "inventory" ALTER COLUMN "product_id" SET NOT NULL;

-- Step 12: Drop old foreign key constraints
ALTER TABLE "cart_items" DROP CONSTRAINT IF EXISTS "cart_items_variant_id_variants_id_fk";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_variant_id_variants_id_fk";
ALTER TABLE "prices" DROP CONSTRAINT IF EXISTS "prices_variant_id_variants_id_fk";
ALTER TABLE "inventory" DROP CONSTRAINT IF EXISTS "inventory_variant_id_variants_id_fk";

-- Step 13: Drop old indexes
DROP INDEX IF EXISTS "cart_items_variant_idx";
DROP INDEX IF EXISTS "order_items_variant_idx";
DROP INDEX IF EXISTS "prices_variant_idx";

-- Step 14: Drop old columns
ALTER TABLE "cart_items" DROP COLUMN IF EXISTS "variant_id";
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "variant_id";
ALTER TABLE "prices" DROP COLUMN IF EXISTS "variant_id";
ALTER TABLE "inventory" DROP COLUMN IF EXISTS "variant_id";

-- Step 15: Drop old tables
DROP TABLE IF EXISTS "variant_option_values";
DROP TABLE IF EXISTS "variant_options";
DROP TABLE IF EXISTS "variants";
