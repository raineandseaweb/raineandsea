-- Add indexes for analytics queries
-- These optimize DATE_TRUNC('day', created_at) queries used in the analytics dashboard

CREATE INDEX "orders_created_at_idx" ON "orders" ("created_at");
CREATE INDEX "customers_created_at_idx" ON "customers" ("created_at");

