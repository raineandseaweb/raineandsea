const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function fixMermaidVariants() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log("Fixing Mermaid Sea Glass Bracelet variants...");

    // Update variant titles to be more descriptive
    const result = await client.query(`
      UPDATE variants 
      SET title = CASE 
        WHEN title LIKE '%Yes' THEN REPLACE(title, ' - Yes', ' - With Mermaid Tail')
        WHEN title LIKE '%No' THEN REPLACE(title, ' - No', ' - Without Mermaid Tail')
        ELSE title
      END
      WHERE product_id = (
        SELECT id FROM products 
        WHERE title LIKE '%Mermaid Sea Glass Bracelet%'
      )
      AND (title LIKE '%Yes' OR title LIKE '%No');
    `);

    console.log(`Updated ${result.rowCount} variant titles`);

    // Check the results
    const checkResult = await client.query(`
      SELECT v.title, v.sku, pr.amount as price, inv.quantity_available
      FROM products p
      JOIN variants v ON p.id = v.product_id
      JOIN prices pr ON v.id = pr.variant_id
      JOIN inventory inv ON v.id = inv.variant_id
      WHERE p.title LIKE '%Mermaid Sea Glass Bracelet%'
      ORDER BY v.title;
    `);

    console.log("\nUpdated variants:");
    checkResult.rows.forEach((row) => {
      console.log(
        `  ${row.title}: $${row.price} (SKU: ${row.sku}, Stock: ${row.quantity_available})`
      );
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

fixMermaidVariants();


