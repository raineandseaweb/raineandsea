const { Client } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function analyzeVariantStructure() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log("=== VARIANT STRUCTURE ANALYSIS ===\n");

    // Analyze crystal rings product
    const crystalRings = await client.query(`
      SELECT 
        p.title as product_title,
        v.title as variant_title,
        pr.amount as price,
        inv.quantity_available,
        pc.name as crystal_name,
        pc.price_adjustment
      FROM products p
      JOIN variants v ON p.id = v.product_id
      JOIN prices pr ON v.id = pr.variant_id
      JOIN inventory inv ON v.id = inv.variant_id
      LEFT JOIN product_crystals pc ON p.id = pc.product_id
      WHERE p.title LIKE '%Crystal Rings%'
      ORDER BY v.title, pc.name;
    `);

    console.log("CRYSTAL RINGS ANALYSIS:");
    console.log(`Product: ${crystalRings.rows[0]?.product_title}`);
    console.log(`Variants: ${crystalRings.rows.length}`);

    const variants = {};
    const crystals = {};

    crystalRings.rows.forEach((row) => {
      if (!variants[row.variant_title]) {
        variants[row.variant_title] = {
          price: row.price,
          stock: row.quantity_available,
        };
      }
      if (row.crystal_name && !crystals[row.crystal_name]) {
        crystals[row.crystal_name] = {
          price_adjustment: row.price_adjustment,
        };
      }
    });

    console.log(`\nVariants (${Object.keys(variants).length}):`);
    Object.entries(variants).forEach(([name, data]) => {
      console.log(`  ${name}: $${data.price} (${data.stock} stock)`);
    });

    console.log(`\nCrystals (${Object.keys(crystals).length}):`);
    Object.entries(crystals).forEach(([name, data]) => {
      console.log(`  ${name}: +$${data.price_adjustment}`);
    });

    // Analyze bracelets for size patterns
    const bracelets = await client.query(`
      SELECT 
        p.title as product_title,
        v.title as variant_title,
        pr.amount as price
      FROM products p
      JOIN variants v ON p.id = v.product_id
      JOIN prices pr ON v.id = pr.variant_id
      WHERE p.title LIKE '%Bracelet%'
      ORDER BY p.title, v.title
      LIMIT 20;
    `);

    console.log("\n=== BRACELET SIZE PATTERNS ===");
    const braceletProducts = {};
    bracelets.rows.forEach((row) => {
      if (!braceletProducts[row.product_title]) {
        braceletProducts[row.product_title] = [];
      }
      braceletProducts[row.product_title].push({
        variant: row.variant_title,
        price: row.price,
      });
    });

    Object.entries(braceletProducts).forEach(([product, variants]) => {
      console.log(`\n${product}:`);
      variants.forEach((v) => {
        console.log(`  ${v.variant}: $${v.price}`);
      });
    });

    // Check for size patterns
    const sizePatterns = await client.query(`
      SELECT 
        v.title as variant_title,
        COUNT(*) as count
      FROM variants v
      WHERE v.title ~ '^[0-9]+(\.[0-9]+)?$' 
         OR v.title ~ '^[0-9]+(\.[0-9]+)? cm$'
         OR v.title ~ '^[0-9]+(\.[0-9]+)? cm -'
      GROUP BY v.title
      ORDER BY count DESC, v.title
      LIMIT 20;
    `);

    console.log("\n=== SIZE PATTERNS ===");
    sizePatterns.rows.forEach((row) => {
      console.log(`  ${row.variant_title}: ${row.count} products`);
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await client.end();
  }
}

analyzeVariantStructure();


