// Check what variants exist in the database
const { db } = require("./src/lib/db");
const { variants } = require("./src/lib/db/schema");

async function checkVariants() {
  try {
    console.log("Checking variants in database...");

    const allVariants = await db.select().from(variants).limit(10);
    console.log("Found variants:", allVariants.length);

    allVariants.forEach((variant) => {
      console.log(`- ${variant.id}: ${variant.title} (SKU: ${variant.sku})`);
    });

    // Check the specific variant IDs from the cart
    const cartVariantIds = [
      "3d8330dd-5c82-4b37-8a39-ed2bc4a8b5e2",
      "af62f933-0b63-402e-8a00-137e27a9d42d",
      "5ce9dc0b-291c-4600-8c36-2dba9de9fc53",
      "652ffebc-dfe3-4c1e-a1fa-93b2749ac672",
    ];

    console.log("\nChecking cart variant IDs:");
    for (const id of cartVariantIds) {
      const variant = await db
        .select()
        .from(variants)
        .where(eq(variants.id, id))
        .limit(1);
      console.log(`- ${id}: ${variant.length > 0 ? "EXISTS" : "NOT FOUND"}`);
    }
  } catch (error) {
    console.error("Error checking variants:", error);
  }
}

checkVariants();
