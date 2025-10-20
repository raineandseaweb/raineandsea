const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function checkMermaidCrystals() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Check crystals for Mermaid Sea Glass Bracelet
    const crystalDetails = await client.query(`
      SELECT pc.name, pc.price_adjustment, pc.is_default, pc.is_available, pc.sort_order
      FROM products p
      JOIN product_crystals pc ON p.id = pc.product_id
      WHERE p.title LIKE '%Mermaid Sea Glass%'
      ORDER BY pc.sort_order;
    `);

    console.log("Crystals for Mermaid Sea Glass Bracelet:");
    crystalDetails.rows.forEach((row) => {
      console.log(
        `  ${row.name}: +$${row.price_adjustment} (default: ${row.is_default}, available: ${row.is_available}, sort: ${row.sort_order})`
      );
    });

    // Check variants for this product
    const variantDetails = await client.query(`
      SELECT v.sku, v.title, pr.amount as price, inv.quantity_available
      FROM products p
      JOIN variants v ON p.id = v.product_id
      JOIN prices pr ON v.id = pr.variant_id
      JOIN inventory inv ON v.id = inv.variant_id
      WHERE p.title LIKE '%Mermaid Sea Glass%'
      ORDER BY v.title;
    `);

    console.log("\nVariants for Mermaid Sea Glass Bracelet:");
    variantDetails.rows.forEach((row) => {
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

checkMermaidCrystals();
