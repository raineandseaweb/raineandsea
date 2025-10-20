const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function checkCrystals() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Check crystal count
    const result = await client.query(`
      SELECT COUNT(*) as count FROM product_crystals;
    `);

    console.log(`Total crystals in database: ${result.rows[0].count}`);

    // Check products with crystals
    const productResult = await client.query(`
      SELECT p.title, COUNT(pc.id) as crystal_count
      FROM products p
      LEFT JOIN product_crystals pc ON p.id = pc.product_id
      GROUP BY p.id, p.title
      HAVING COUNT(pc.id) > 0
      ORDER BY crystal_count DESC
      LIMIT 10;
    `);

    console.log("\nProducts with crystals:");
    productResult.rows.forEach((row) => {
      console.log(`  ${row.title}: ${row.crystal_count} crystals`);
    });

    // Check crystals for first product with crystals
    if (productResult.rows.length > 0) {
      const firstProduct = productResult.rows[0];
      const crystalDetails = await client.query(
        `
        SELECT pc.name, pc.price_adjustment, pc.is_default, pc.is_available
        FROM products p
        JOIN product_crystals pc ON p.id = pc.product_id
        WHERE p.title = $1
        ORDER BY pc.sort_order
        LIMIT 5;
      `,
        [firstProduct.title]
      );

      console.log(`\nCrystals for "${firstProduct.title}":`);
      crystalDetails.rows.forEach((row) => {
        console.log(
          `  ${row.name}: +$${row.price_adjustment} (default: ${row.is_default}, available: ${row.is_available})`
        );
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

checkCrystals();
