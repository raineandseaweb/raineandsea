import { db } from "@/lib/db";
import { inventory, prices, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

interface CartItem {
  product_id: string;
  quantity: number;
  selected_options?: Record<string, string>;
}

interface ValidationResult {
  valid: boolean;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_amount: number;
    selected_options?: Record<string, string>;
    descriptive_title?: string;
    error?: string;
  }>;
  total: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { items }: { items: CartItem[] } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid cart items" });
    }

    const validationResult: ValidationResult = {
      valid: true,
      items: [],
      total: 0,
    };

    for (const item of items) {
      const { product_id, quantity, selected_options } = item;

      // Verify product exists
      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, product_id))
        .limit(1);

      if (product.length === 0) {
        validationResult.valid = false;
        validationResult.items.push({
          product_id,
          quantity,
          unit_amount: 0,
          selected_options,
          error: "Product not found",
        });
        continue;
      }

      // Get price
      const productPrice = await db
        .select()
        .from(prices)
        .where(eq(prices.product_id, product_id))
        .limit(1);

      if (productPrice.length === 0) {
        validationResult.valid = false;
        validationResult.items.push({
          product_id,
          quantity,
          unit_amount: 0,
          selected_options,
          error: "Price not found",
        });
        continue;
      }

      // Calculate final price (for now, just use base price)
      let finalPrice = parseFloat(productPrice[0].amount);
      let optionNames: string[] = [];

      // TODO: Add option price adjustments when needed
      if (selected_options && Object.keys(selected_options).length > 0) {
        // For now, just collect option names for descriptive title
        optionNames = Object.values(selected_options);
      }

      // Create descriptive title with selected options
      const baseTitle = product[0].title;
      const optionSuffix =
        optionNames.length > 0 ? ` - ${optionNames.join(", ")}` : "";
      const descriptiveTitle = `${baseTitle}${optionSuffix}`;

      // Check inventory
      const inventoryRecord = await db
        .select()
        .from(inventory)
        .where(eq(inventory.product_id, product_id))
        .limit(1);

      if (
        inventoryRecord.length === 0 ||
        inventoryRecord[0].quantity_available < quantity
      ) {
        validationResult.valid = false;
        validationResult.items.push({
          product_id,
          quantity,
          unit_amount: finalPrice,
          selected_options,
          descriptive_title: descriptiveTitle,
          error: "Insufficient inventory",
        });
        continue;
      }

      // Valid item
      validationResult.items.push({
        product_id,
        quantity,
        unit_amount: finalPrice,
        selected_options,
        descriptive_title: descriptiveTitle,
      });

      validationResult.total += finalPrice * quantity;
    }

    return res.status(200).json(validationResult);
  } catch (error) {
    console.error("Checkout validation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
