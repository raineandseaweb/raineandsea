const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function shortenCrystalVariants() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log("Shortening crystal variant titles...");

    // Get all crystal names from the database
    const crystalNames = await client.query(`
      SELECT DISTINCT pc.name
      FROM product_crystals pc
      ORDER BY pc.name;
    `);

    console.log(`Found ${crystalNames.rows.length} unique crystal names:`);
    crystalNames.rows.forEach((row) => {
      console.log(`  ${row.name}`);
    });

    // Update variant titles to remove product title prefix for crystal names
    let updateQuery = `UPDATE variants SET title = CASE `;
    let caseCount = 0;

    for (const crystal of crystalNames.rows) {
      const crystalName = crystal.name;
      updateQuery += `WHEN title LIKE '% - ${crystalName}' THEN '${crystalName}' `;
      caseCount++;
    }

    updateQuery += `ELSE title END WHERE title LIKE '% - %' AND (`;

    const conditions = crystalNames.rows
      .map((crystal) => `title LIKE '% - ${crystal.name}'`)
      .join(" OR ");
    updateQuery += conditions + ");";

    console.log(
      `\nUpdating variants with ${caseCount} crystal name patterns...`
    );

    const result = await client.query(updateQuery);
    console.log(`Updated ${result.rowCount} variant titles`);

    // Check the results for crystal rings
    const checkResult = await client.query(`
      SELECT v.title, v.sku, pr.amount as price, inv.quantity_available
      FROM products p
      JOIN variants v ON p.id = v.product_id
      JOIN prices pr ON v.id = pr.variant_id
      JOIN inventory inv ON v.id = inv.variant_id
      WHERE p.title LIKE '%Crystal Rings%'
      ORDER BY v.title
      LIMIT 10;
    `);

    console.log("\nUpdated Crystal Rings variants:");
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

shortenCrystalVariants();


