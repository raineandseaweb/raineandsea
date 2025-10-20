import { config } from "dotenv";
import postgres from "postgres";

// Load environment variables
config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

async function reorderOrdersColumns() {
  try {
    console.log("Reordering orders table columns...");

    // Create a new table with the correct column order
    await client`
      CREATE TABLE orders_new (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id uuid REFERENCES customers(id),
        guest_email text,
        order_number text UNIQUE,
        is_guest_order boolean NOT NULL DEFAULT false,
        status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'paid', 'shipped', 'completed', 'cancelled', 'refunded')),
        currency text NOT NULL DEFAULT 'USD',
        subtotal numeric(10,2) NOT NULL,
        tax numeric(10,2) NOT NULL DEFAULT 0,
        shipping numeric(10,2) NOT NULL DEFAULT 0,
        total numeric(10,2) NOT NULL,
        payment_intent_id text,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW()
      );
    `;
    console.log("✓ Created new orders table");

    // Copy data from old table to new table
    await client`
      INSERT INTO orders_new (
        id, customer_id, guest_email, order_number, is_guest_order,
        status, currency, subtotal, tax, shipping, total,
        payment_intent_id, created_at, updated_at
      )
      SELECT 
        id, customer_id, guest_email, order_number, is_guest_order,
        status, currency, subtotal, tax, shipping, total,
        payment_intent_id, created_at, updated_at
      FROM orders;
    `;
    console.log("✓ Copied data to new table");

    // Drop old table
    await client`DROP TABLE orders CASCADE`;
    console.log("✓ Dropped old orders table");

    // Rename new table
    await client`ALTER TABLE orders_new RENAME TO orders`;
    console.log("✓ Renamed new table to orders");

    // Recreate indexes
    await client`CREATE INDEX orders_customer_idx ON orders(customer_id)`;
    await client`CREATE INDEX orders_status_idx ON orders(status)`;
    await client`CREATE INDEX orders_payment_idx ON orders(payment_intent_id)`;
    await client`CREATE INDEX orders_order_number_idx ON orders(order_number)`;
    await client`CREATE INDEX orders_guest_lookup_idx ON orders(order_number, guest_email) WHERE is_guest_order = true`;
    console.log("✓ Recreated indexes");

    console.log("\n🎉 Successfully reordered orders table columns!");
  } catch (error) {
    console.error("Error reordering columns:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

reorderOrdersColumns();
