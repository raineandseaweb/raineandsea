const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function normalizeVariantStructure() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log("=== NORMALIZING VARIANT STRUCTURE ===\n");

    // Step 1: Fix Crystal Rings - Separate crystal variants from size crystals
    console.log("1. Fixing Crystal Rings structure...");

    // First, let's see what we're working with
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

    // Identify crystal names vs size numbers
    const crystalNames = currentCrystals.rows.filter(
      (c) =>
        !/^[0-9]+(\.[0-9]+)?$/.test(c.name) &&
        ![
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
        ].includes(c.name)
    );

    const sizeNumbers = currentCrystals.rows.filter(
      (c) =>
        /^[0-9]+(\.[0-9]+)?$/.test(c.name) ||
        [
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
        ].includes(c.name)
    );

    console.log(`\nCrystal names: ${crystalNames.length}`);
    crystalNames.forEach((c) =>
      console.log(`  ${c.name}: +$${c.price_adjustment}`)
    );

    console.log(`\nSize numbers: ${sizeNumbers.length}`);
    sizeNumbers.forEach((c) =>
      console.log(`  ${c.name}: +$${c.price_adjustment}`)
    );

    // Step 2: Create proper size variants for bracelets
    console.log("\n2. Adding size variants to bracelets...");

    const braceletsWithoutSizes = await client.query(`
      SELECT p.id, p.title
      FROM products p
      LEFT JOIN variants v ON p.id = v.product_id AND v.title ~ '^[0-9]+(\.[0-9]+)? cm$'
      WHERE p.title LIKE '%Bracelet%' 
        AND p.title NOT LIKE '%Ring%'
        AND v.id IS NULL
      ORDER BY p.title;
    `);

    console.log(
      `Found ${braceletsWithoutSizes.rows.length} bracelets without size variants:`
    );
    braceletsWithoutSizes.rows.forEach((row) => {
      console.log(`  ${row.title}`);
    });

    // Add standard bracelet sizes (13cm, 14cm, 15cm, 16cm, 17cm, 18cm, 19cm, 20cm, 21cm, 22cm)
    const standardSizes = [
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
      "20",
      "21",
      "22",
    ];

    for (const bracelet of braceletsWithoutSizes.rows) {
      console.log(`\nAdding sizes to: ${bracelet.title}`);

      // Get the base variant (first variant) to use as template
      const baseVariant = await client.query(
        `
        SELECT v.id, pr.amount as price, inv.quantity_available
        FROM variants v
        JOIN prices pr ON v.id = pr.variant_id
        JOIN inventory inv ON v.id = inv.variant_id
        WHERE v.product_id = $1
        ORDER BY v.title
        LIMIT 1;
      `,
        [bracelet.id]
      );

      if (baseVariant.rows.length === 0) {
        console.log(`  No base variant found for ${bracelet.title}`);
        continue;
      }

      const basePrice = baseVariant.rows[0].price;
      const baseStock = baseVariant.rows[0].quantity_available;

      for (const size of standardSizes) {
        // Check if size variant already exists
        const existingSize = await client.query(
          `
          SELECT id FROM variants 
          WHERE product_id = $1 AND title = $2;
        `,
          [bracelet.id, `${size} cm`]
        );

        if (existingSize.rows.length > 0) {
          console.log(`  Size ${size} cm already exists`);
          continue;
        }

        // Create size variant
        const newVariant = await client.query(
          `
          INSERT INTO variants (product_id, sku, title)
          VALUES ($1, $2, $3)
          RETURNING id;
        `,
          [bracelet.id, `${bracelet.id}-${size}cm`, `${size} cm`]
        );

        const variantId = newVariant.rows[0].id;

        // Add price
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
          [variantId, baseStock]
        );

        console.log(`  Added size ${size} cm: $${basePrice}`);
      }
    }

    console.log("\n=== NORMALIZATION COMPLETE ===");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

normalizeVariantStructure();


