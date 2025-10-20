-- Add tracking fields to orders table
ALTER TABLE "orders" ADD COLUMN "tracking_number" text;
ALTER TABLE "orders" ADD COLUMN "shipping_provider" text;
ALTER TABLE "orders" ADD COLUMN "shipped_at" timestamp;

-- Add indexes for tracking fields
CREATE INDEX "orders_tracking_idx" ON "orders" ("tracking_number");
CREATE INDEX "orders_shipping_provider_idx" ON "orders" ("shipping_provider");
