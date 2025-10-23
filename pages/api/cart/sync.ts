import { db } from "@/lib/db";
import {
  cartItems,
  carts,
  prices,
  productOptionValues,
  products,
} from "@/lib/db/schema";
import { withAuthenticatedRequest } from "@/lib/security/request-wrapper";
import { eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "POST") {
      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Items array is required" });
      }

      // Get or create cart
      let cartId = req.cookies.cart_id;

      if (!cartId) {
        // Create new cart
        const newCart = await db
          .insert(carts)
          .values({
            id: uuidv4(),
            currency: "USD",
          })
          .returning();

        cartId = newCart[0].id;

        // Set cart ID cookie
        res.setHeader(
          "Set-Cookie",
          `cart_id=${cartId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
            60 * 60 * 24 * 30
          }`
        ); // 30 days
      }

      // Clear existing cart items
      await db.delete(cartItems).where(eq(cartItems.cart_id, cartId));

      // Add new items
      for (const item of items) {
        const { product_id, quantity, selected_options } = item;

        // Verify product exists and get base price
        const product = await db
          .select()
          .from(products)
          .where(eq(products.id, product_id))
          .limit(1);

        if (product.length === 0) {
          console.warn(`Product ${product_id} not found, skipping`);
          continue;
        }

        // Get base price for this product
        const productPrice = await db
          .select()
          .from(prices)
          .where(eq(prices.product_id, product_id))
          .limit(1);

        if (productPrice.length === 0) {
          console.warn(`No price found for product ${product_id}, skipping`);
          continue;
        }

        let finalPrice = parseFloat(productPrice[0].amount);

        // Calculate price adjustments based on selected options
        if (selected_options && Object.keys(selected_options).length > 0) {
          for (const [optionName, optionValueName] of Object.entries(
            selected_options
          )) {
            // Ensure optionValueName is a string
            if (typeof optionValueName !== "string") continue;

            // Get the price adjustment for this option value
            const optionValue = await db
              .select()
              .from(productOptionValues)
              .innerJoin(
                products,
                eq(productOptionValues.option_id, products.id)
              )
              .where(
                eq(productOptionValues.name, optionValueName) &&
                  eq(products.id, product_id)
              )
              .limit(1);

            if (optionValue.length > 0) {
              finalPrice += parseFloat(
                optionValue[0].product_option_values.price_adjustment
              );
            }
          }
        }

        // Add item to cart (descriptive_title will be generated client-side)
        await db.insert(cartItems).values({
          id: uuidv4(),
          cart_id: cartId,
          product_id: product_id,
          quantity: quantity,
          unit_amount: finalPrice.toString(),
          selected_options: selected_options,
        });
      }

      return res.status(200).json({ message: "Cart synced successfully" });
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Cart sync API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withAuthenticatedRequest(handler, "sync_cart");
