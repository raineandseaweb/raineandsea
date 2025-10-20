const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function checkSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Check if products table has image column
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      ORDER BY ordinal_position;
    `);

    console.log("Products table columns:");
    result.rows.forEach((row) => {
      console.log(
        `  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`
      );
    });

    // Check if new tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('product_crystals', 'variant_options', 'variant_option_values')
      ORDER BY table_name;
    `);

    console.log("\nNew tables found:");
    tablesResult.rows.forEach((row) => {
      console.log(`  ${row.table_name}`);
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

checkSchema();


