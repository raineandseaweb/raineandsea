const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function cleanCrystalRings() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log("=== CLEANING CRYSTAL RINGS ===\n");

    // Get the Crystal Rings product
    const crystalRingsProduct = await client.query(`
      SELECT id, title FROM products 
      WHERE title LIKE '%Crystal Rings%'
      LIMIT 1;
    `);

    if (crystalRingsProduct.rows.length === 0) {
      console.log("No Crystal Rings product found");
      return;
    }

    const productId = crystalRingsProduct.rows[0].id;
    console.log(`Working with product: ${crystalRingsProduct.rows[0].title}`);

    // Remove size numbers from crystals (keep only actual crystal names)
    const sizeNumbers = [
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "5.5",
      "6.5",
      "7.5",
      "8.5",
      "9.5",
      "10.5",
      "11.5",
      "12.5",
    ];

    console.log("Removing size numbers from crystals...");

    for (const size of sizeNumbers) {
      const result = await client.query(
        `
        DELETE FROM product_crystals 
        WHERE product_id = $1 AND name = $2;
      `,
        [productId, size]
      );

      if (result.rowCount > 0) {
        console.log(`  Removed crystal: ${size}`);
      }
    }

    // Check remaining crystals
    const remainingCrystals = await client.query(
      `
      SELECT name, price_adjustment, is_default, is_available, sort_order
      FROM product_crystals
      WHERE product_id = $1
      ORDER BY sort_order;
    `,
      [productId]
    );

    console.log(`\nRemaining crystals (${remainingCrystals.rows.length}):`);
    remainingCrystals.rows.forEach((crystal) => {
      console.log(
        `  ${crystal.name}: +$${crystal.price_adjustment} (default: ${crystal.is_default}, available: ${crystal.is_available})`
      );
    });

    // Update the frontend to show consistent pricing notation
    console.log("\n=== PRICING NOTATION RECOMMENDATION ===");
    console.log("For crystal rings, we should use:");
    console.log("- Base price: $X.XX");
    console.log(
      "- Crystal selection: +$X.XX (or 'No additional cost' if +$0.00)"
    );
    console.log("- Total price: Base + Crystal adjustment");

    console.log("\nFor bracelets, we should use:");
    console.log("- Size selection: X cm");
    console.log("- Crystal selection: +$X.XX (if applicable)");
    console.log("- Total price: Base + Crystal adjustment");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

cleanCrystalRings();


