const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Connecting to database...");

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "..",
      "drizzle",
      "0019_add_api_audit_logs.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("Applying migration...");
    await pool.query(migrationSQL);

    console.log("✅ Migration applied successfully!");
    console.log("📊 api_audit_logs table created with all indexes");
  } catch (error) {
    if (error.message.includes("already exists")) {
      console.log("✅ api_audit_logs table already exists");
    } else {
      console.error("❌ Migration failed:", error.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

applyMigration();
