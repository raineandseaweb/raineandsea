-- Safe migration: Add analytics indexes without using db:push
-- This ONLY adds indexes and doesn't touch any other data

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" ("created_at");
CREATE INDEX IF NOT EXISTS "customers_created_at_idx" ON "customers" ("created_at");

-- Verify indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('orders', 'customers') 
AND indexname LIKE '%created_at%';

