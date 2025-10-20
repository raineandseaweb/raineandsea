-- Add order_id column to addresses table to link addresses to specific orders
ALTER TABLE "addresses" ADD COLUMN "order_id" uuid REFERENCES "orders"("id") ON DELETE CASCADE;

-- Create index for order_id lookups
CREATE INDEX "addresses_order_idx" ON "addresses"("order_id");

-- Add index for combined lookups (order_id + type)
CREATE INDEX "addresses_order_type_idx" ON "addresses"("order_id", "type");

