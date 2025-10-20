const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function fixYesNoVariants() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log("Finding products with Yes/No variants...");

    // Find all products with Yes/No variants
    const productsWithYesNo = await client.query(`
      SELECT DISTINCT p.title, p.id
      FROM products p
      JOIN variants v ON p.id = v.product_id
      WHERE v.title LIKE '% - Yes' OR v.title LIKE '% - No'
      ORDER BY p.title;
    `);

    console.log(
      `Found ${productsWithYesNo.rows.length} products with Yes/No variants:`
    );
    productsWithYesNo.rows.forEach((row) => {
      console.log(`  ${row.title}`);
    });

    if (productsWithYesNo.rows.length === 0) {
      console.log("No products with Yes/No variants found.");
      return;
    }

    console.log("\nDetailed variant information:");
    for (const product of productsWithYesNo.rows) {
      const variants = await client.query(
        `
        SELECT v.title, v.sku, pr.amount as price, inv.quantity_available
        FROM variants v
        JOIN prices pr ON v.id = pr.variant_id
        JOIN inventory inv ON v.id = inv.variant_id
        WHERE v.product_id = $1
        ORDER BY v.title;
      `,
        [product.id]
      );

      console.log(`\n${product.title}:`);
      variants.rows.forEach((variant) => {
        console.log(
          `  ${variant.title}: $${variant.price} (Stock: ${variant.quantity_available})`
        );
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

fixYesNoVariants();


