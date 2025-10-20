import { config } from "dotenv";
import postgres from "postgres";

// Load environment variables
config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

async function checkDbColumnOrder() {
  try {
    console.log("Checking database column order...");

    // Get table structure with ordinal position
    const result = await client`
      SELECT column_name, ordinal_position, data_type
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      ORDER BY ordinal_position;
    `;

    console.log("Orders table columns in database order:");
    result.forEach((row: any) => {
      console.log(
        `${row.ordinal_position}. ${row.column_name}: ${row.data_type}`
      );
    });

    // Test a direct insert to see what happens
    console.log("\nTesting direct insert...");
    const testResult = await client`
      INSERT INTO orders (
        id, customer_id, guest_email, order_number, is_guest_order,
        status, currency, subtotal, tax, shipping, total
      ) VALUES (
        gen_random_uuid(), null, 'test@example.com', 'TEST-456', true,
        'received', 'USD', '10.00', '0.80', '5.00', '15.80'
      ) RETURNING id;
    `;

    console.log("✓ Direct insert successful:", testResult[0].id);

    // Clean up
    await client`DELETE FROM orders WHERE id = ${testResult[0].id}`;
    console.log("✓ Test record cleaned up");
  } catch (error) {
    console.error("Error checking column order:", error);
  } finally {
    await client.end();
  }
}

checkDbColumnOrder();
