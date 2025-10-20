const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function clearCrystals() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Clear all crystal data
    const result = await client.query("DELETE FROM product_crystals;");
    console.log(`Cleared ${result.rowCount} crystal records`);

  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

clearCrystals();


