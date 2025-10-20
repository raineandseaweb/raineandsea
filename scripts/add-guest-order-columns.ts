import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Load environment variables
config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function addGuestOrderColumns() {
  try {
    console.log("Adding guest order columns to orders table...");

    // Add guest_email column
    await client`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email text;
    `;
    console.log("✓ Added guest_email column");

    // Add order_number column
    await client`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number text;
    `;
    console.log("✓ Added order_number column");

    // Add is_guest_order column
    await client`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_guest_order boolean DEFAULT false;
    `;
    console.log("✓ Added is_guest_order column");

    // Make customer_id nullable for guest orders
    await client`
      ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;
    `;
    console.log("✓ Made customer_id nullable");

    // Add unique constraint on order_number
    try {
      await client`
        ALTER TABLE orders ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);
      `;
      console.log("✓ Added unique constraint on order_number");
    } catch (error: any) {
      if (error.code === "23505" || error.message.includes("already exists")) {
        console.log("✓ Unique constraint on order_number already exists");
      } else {
        throw error;
      }
    }

    // Create index for guest order lookup
    try {
      await client`
        CREATE INDEX IF NOT EXISTS orders_guest_lookup_idx ON orders(order_number, guest_email) WHERE is_guest_order = true;
      `;
      console.log("✓ Created guest lookup index");
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        console.log("✓ Guest lookup index already exists");
      } else {
        throw error;
      }
    }

    // Create index on order_number
    try {
      await client`
        CREATE INDEX IF NOT EXISTS orders_order_number_idx ON orders(order_number);
      `;
      console.log("✓ Created order_number index");
    } catch (error: any) {
      if (error.message.includes("already exists")) {
        console.log("✓ Order number index already exists");
      } else {
        throw error;
      }
    }

    console.log("\n🎉 Successfully added guest order columns!");
    console.log("Guest checkout is now ready to use.");
  } catch (error) {
    console.error("Error adding guest order columns:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addGuestOrderColumns();
