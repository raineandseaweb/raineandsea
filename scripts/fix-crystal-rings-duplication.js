const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function fixCrystalRingsDuplication() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log("=== FIXING CRYSTAL RINGS DUPLICATION ===\n");

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

    // Check if variants and crystals have the same names (indicating duplication)
    const variantNames = currentVariants.rows.map((v) => v.title);
    const crystalNames = currentCrystals.rows.map((c) => c.name);

    const duplicates = variantNames.filter((name) =>
      crystalNames.includes(name)
    );

    if (duplicates.length > 0) {
      console.log(
        `\nFound ${duplicates.length} duplicate names between variants and crystals:`
      );
      duplicates.forEach((name) => console.log(`  ${name}`));

      console.log("\nRemoving duplicate variants (keeping crystals)...");

      // Remove variants that have the same names as crystals
      for (const duplicateName of duplicates) {
        const variantToRemove = currentVariants.rows.find(
          (v) => v.title === duplicateName
        );
        if (variantToRemove) {
          // Delete prices first
          await client.query(`DELETE FROM prices WHERE variant_id = $1`, [
            variantToRemove.id,
          ]);
          // Delete inventory
          await client.query(`DELETE FROM inventory WHERE variant_id = $1`, [
            variantToRemove.id,
          ]);
          // Delete variant
          await client.query(`DELETE FROM variants WHERE id = $1`, [
            variantToRemove.id,
          ]);
          console.log(`  Removed variant: ${duplicateName}`);
        }
      }

      // Create a single base variant for crystal rings
      const baseVariant = await client.query(
        `
        INSERT INTO variants (product_id, sku, title)
        VALUES ($1, $2, $3)
        RETURNING id;
      `,
        [productId, `${productId}-base`, "Base Ring"]
      );

      const variantId = baseVariant.rows[0].id;

      // Add base price (use the lowest price from removed variants)
      const basePrice = Math.min(
        ...currentVariants.rows.map((v) => parseFloat(v.price))
      );
      await client.query(
        `
        INSERT INTO prices (variant_id, amount, currency, compare_at_amount)
        VALUES ($1, $2, 'USD', NULL);
      `,
        [variantId, basePrice]
      );

      // Add inventory
      await client.query(
        `
        INSERT INTO inventory (variant_id, quantity_available, quantity_reserved)
        VALUES ($1, $2, 0);
      `,
        [variantId, 10]
      ); // Default stock

      console.log(`  Created base variant: Base Ring - $${basePrice}`);
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
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

fixCrystalRingsDuplication();


