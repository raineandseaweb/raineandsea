-- Add sort_order column to addresses table
ALTER TABLE "addresses" ADD COLUMN "sort_order" integer NOT NULL DEFAULT 0;

-- Update existing addresses to have sequential sort_order
UPDATE "addresses" 
SET "sort_order" = subquery.row_number - 1
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at) as row_number
    FROM "addresses"
    WHERE customer_id IS NOT NULL
) as subquery
WHERE "addresses".id = subquery.id AND "addresses".customer_id IS NOT NULL;
