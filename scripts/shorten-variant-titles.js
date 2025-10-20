const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function shortenVariantTitles() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log("Shortening variant titles...");

    // Update variant titles to remove the product title prefix
    const result = await client.query(`
      UPDATE variants 
      SET title = CASE 
        WHEN title LIKE '% - With Mermaid Tail' THEN 'With Mermaid Tail'
        WHEN title LIKE '% - Without Mermaid Tail' THEN 'Without Mermaid Tail'
        WHEN title LIKE '% - Yes' THEN 'Yes'
        WHEN title LIKE '% - No' THEN 'No'
        WHEN title LIKE '% - Small' THEN 'Small'
        WHEN title LIKE '% - Medium' THEN 'Medium'
        WHEN title LIKE '% - Large' THEN 'Large'
        WHEN title LIKE '% - Extra Large' THEN 'Extra Large'
        WHEN title LIKE '% - XL' THEN 'XL'
        WHEN title LIKE '% - S' THEN 'S'
        WHEN title LIKE '% - M' THEN 'M'
        WHEN title LIKE '% - L' THEN 'L'
        WHEN title LIKE '% - Red' THEN 'Red'
        WHEN title LIKE '% - Blue' THEN 'Blue'
        WHEN title LIKE '% - Green' THEN 'Green'
        WHEN title LIKE '% - Yellow' THEN 'Yellow'
        WHEN title LIKE '% - Black' THEN 'Black'
        WHEN title LIKE '% - White' THEN 'White'
        WHEN title LIKE '% - Pink' THEN 'Pink'
        WHEN title LIKE '% - Purple' THEN 'Purple'
        WHEN title LIKE '% - Orange' THEN 'Orange'
        ELSE title
      END
      WHERE title LIKE '% - %';
    `);

    console.log(`Updated ${result.rowCount} variant titles`);

    // Check the results for Mermaid Sea Glass Bracelet
    const checkResult = await client.query(`
      SELECT v.title, v.sku, pr.amount as price, inv.quantity_available
      FROM products p
      JOIN variants v ON p.id = v.product_id
      JOIN prices pr ON v.id = pr.variant_id
      JOIN inventory inv ON v.id = inv.variant_id
      WHERE p.title LIKE '%Mermaid Sea Glass Bracelet%'
      ORDER BY v.title;
    `);

    console.log("\nUpdated Mermaid Sea Glass Bracelet variants:");
    checkResult.rows.forEach((row) => {
      console.log(
        `  ${row.title}: $${row.price} (SKU: ${row.sku}, Stock: ${row.quantity_available})`
      );
    });

    // Show a few more examples
    const moreExamples = await client.query(`
      SELECT p.title as product_title, v.title as variant_title, pr.amount as price
      FROM products p
      JOIN variants v ON p.id = v.product_id
      JOIN prices pr ON v.id = pr.variant_id
      WHERE v.title NOT LIKE '% - %'
      ORDER BY p.title, v.title
      LIMIT 10;
    `);

    console.log("\nOther shortened variant examples:");
    moreExamples.rows.forEach((row) => {
      console.log(
        `  ${row.product_title}: ${row.variant_title} ($${row.price})`
      );
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

shortenVariantTitles();


