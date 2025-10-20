const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function cleanCrystalRingsFinal() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log("=== FINAL CLEANUP OF CRYSTAL RINGS ===\n");

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

    // Get current variants and crystals
    const currentVariants = await client.query(
      `
      SELECT v.id, v.title, pr.amount as price, inv.quantity_available
      FROM variants v
      JOIN prices pr ON v.id = pr.variant_id
      JOIN inventory inv ON v.id = inv.variant_id
      WHERE v.product_id = $1
      ORDER BY v.title;
    `,
      [productId]
    );

    const currentCrystals = await client.query(
      `
      SELECT id, name, price_adjustment, is_default, is_available, sort_order
      FROM product_crystals
      WHERE product_id = $1
      ORDER BY sort_order;
    `,
      [productId]
    );

    console.log(`Current variants: ${currentVariants.rows.length}`);
    console.log(`Current crystals: ${currentCrystals.rows.length}`);

    // Remove all variants except "Base Ring"
    const variantsToRemove = currentVariants.rows.filter(
      (v) => v.title !== "Base Ring"
    );

    console.log(
      `\nRemoving ${variantsToRemove.length} crystal-named variants...`
    );

    for (const variant of variantsToRemove) {
      // Delete prices first
      await client.query(`DELETE FROM prices WHERE variant_id = $1`, [
        variant.id,
      ]);
      // Delete inventory
      await client.query(`DELETE FROM inventory WHERE variant_id = $1`, [
        variant.id,
      ]);
      // Delete variant
      await client.query(`DELETE FROM variants WHERE id = $1`, [variant.id]);
      console.log(`  Removed variant: ${variant.title}`);
    }

    // Update the base variant price to be more reasonable
    const baseVariant = await client.query(
      `
      SELECT v.id FROM variants v WHERE v.product_id = $1 AND v.title = 'Base Ring'
    `,
      [productId]
    );

    if (baseVariant.rows.length > 0) {
      await client.query(
        `
        UPDATE prices SET amount = $1 WHERE variant_id = $2
      `,
        [6.0, baseVariant.rows[0].id]
      ); // Set base price to $6.00
      console.log(`  Updated base variant price to $6.00`);
    }

    // Check final state
    const finalVariants = await client.query(
      `
      SELECT v.title, pr.amount as price
      FROM variants v
      JOIN prices pr ON v.id = pr.variant_id
      WHERE v.product_id = $1
      ORDER BY v.title;
    `,
      [productId]
    );

    const finalCrystals = await client.query(
      `
      SELECT name, price_adjustment
      FROM product_crystals
      WHERE product_id = $1
      ORDER BY sort_order;
    `,
      [productId]
    );

    console.log(`\nFinal state:`);
    console.log(`Variants (${finalVariants.rows.length}):`);
    finalVariants.rows.forEach((v) => {
      console.log(`  ${v.title}: $${v.price}`);
    });

    console.log(`\nCrystals (${finalCrystals.rows.length}):`);
    finalCrystals.rows.forEach((c) => {
      console.log(`  ${c.name}: +$${c.price_adjustment}`);
    });

    console.log(`\n=== CRYSTAL RINGS STRUCTURE ===`);
    console.log(`Now crystal rings will have:`);
    console.log(`- 1 base variant: Base Ring ($6.00)`);
    console.log(`- 20 crystal options with price adjustments`);
    console.log(`- Total price = Base ($6.00) + Crystal adjustment`);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

cleanCrystalRingsFinal();


