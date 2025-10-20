import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

import { sql } from "drizzle-orm";
import { db } from "./index";

async function addPasswordField() {
  try {
    console.log("🔧 Adding password field to customers table...");

    // Add password field
    await db.execute(
      sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS password TEXT`
    );
    console.log("✅ Password field added");

    // Add email_verified field
    await db.execute(
      sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_verified TIMESTAMP`
    );
    console.log("✅ Email verified field added");

    // Add image field
    await db.execute(
      sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS image TEXT`
    );
    console.log("✅ Image field added");

    console.log("🎉 Database schema updated successfully!");
  } catch (error) {
    console.error("❌ Error updating schema:", error);
    throw error;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  addPasswordField()
    .then(() => {
      console.log("Schema update completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Schema update failed:", error);
      process.exit(1);
    });
}

export { addPasswordField };


