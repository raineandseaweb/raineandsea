import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(
      "ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS descriptive_title text;"
    );
    console.log("descriptive_title column ensured on cart_items");
  } catch (error) {
    console.error("Failed to alter cart_items:", (error as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
