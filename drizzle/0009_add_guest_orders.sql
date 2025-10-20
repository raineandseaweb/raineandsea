-- Add guest order support to orders table
ALTER TABLE "orders" ADD COLUMN "guest_email" text;
ALTER TABLE "orders" ADD COLUMN "order_number" text;
ALTER TABLE "orders" ADD COLUMN "is_guest_order" boolean DEFAULT false;

-- Create unique index for order numbers
CREATE UNIQUE INDEX "orders_order_number_idx" ON "orders" ("order_number");

-- Create index for guest order lookup
CREATE INDEX "orders_guest_lookup_idx" ON "orders" ("order_number", "guest_email") WHERE "is_guest_order" = true;

-- Update existing orders to have order numbers (using last 8 chars of ID)
UPDATE "orders" SET "order_number" = UPPER(RIGHT("id"::text, 8)) WHERE "order_number" IS NULL;
