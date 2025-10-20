const { drizzle } = require("drizzle-orm/postgres-js");
const postgres = require("postgres");
const { sql } = require("drizzle-orm");

async function addSortOrderToAddresses() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const sqlClient = postgres(connectionString);
  const db = drizzle(sqlClient);

  try {
    console.log("Adding sort_order column to addresses table...");

    // Add the column
    await db.execute(sql`
      ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
    `);

    console.log("Updating existing addresses with sequential sort_order...");

    // Update existing addresses to have sequential sort_order
    await db.execute(sql`
      UPDATE "addresses" 
      SET "sort_order" = subquery.row_number - 1
      FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at) as row_number
          FROM "addresses"
          WHERE customer_id IS NOT NULL
      ) as subquery
      WHERE "addresses".id = subquery.id AND "addresses".customer_id IS NOT NULL;
    `);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sqlClient.end();
  }
}

addSortOrderToAddresses();
