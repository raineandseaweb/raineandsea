import { config } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

// Load environment variables from .env.local
config({ path: ".env.local" });

// Import the secret loader
import { loadSecret } from "../src/lib/encryption/env-loader";

async function main() {
  console.log("Running product analytics migration...");

  // Resolve database URL from GCP Secret Manager (same as main app)
  const DATABASE_URL: string =
    (await loadSecret("DATABASE_URL")) ||
    (await loadSecret("POSTGRES_URL")) ||
    "";

  if (!DATABASE_URL) {
    throw new Error(
      "DATABASE_URL or POSTGRES_URL must be set in GCP Secret Manager"
    );
  }

  console.log("✓ Database credentials loaded from GCP Secret Manager");

  // Read the migration SQL
  const migrationPath = join(
    __dirname,
    "../drizzle/0017_add_product_analytics.sql"
  );
  const migrationSQL = readFileSync(migrationPath, "utf-8");

  // Create connection pool
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    try {
      console.log("✓ Connected to database");

      // Execute the migration
      await client.query(migrationSQL);
      console.log("✓ Migration completed successfully");
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }

  console.log("✓ Done!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Script error:", error);
  process.exit(1);
});
