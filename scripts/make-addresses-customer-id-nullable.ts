import { config } from "dotenv";
import postgres from "postgres";

// Load environment variables
config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

async function makeAddressesCustomerIdNullable() {
  try {
    console.log("Making addresses.customer_id nullable...");

    // Make customer_id nullable
    await client`
      ALTER TABLE addresses ALTER COLUMN customer_id DROP NOT NULL;
    `;
    console.log("✓ Made customer_id nullable");

    console.log("\n🎉 Successfully updated addresses table!");
  } catch (error) {
    console.error("Error updating addresses table:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

makeAddressesCustomerIdNullable();
