import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";

// Load environment variables
config({ path: ".env.local" });

async function addImageColumn() {
  try {
    console.log("🔧 Adding image column to products table...");

    // Add image column
    await db.execute(
      sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT`
    );
    console.log("✅ Image column added");

    console.log("🎉 Database schema updated successfully!");
  } catch (error) {
    console.error("❌ Error updating schema:", error);
    throw error;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  addImageColumn()
    .then(() => {
      console.log("Schema update completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Schema update failed:", error);
      process.exit(1);
    });
}

export { addImageColumn };


