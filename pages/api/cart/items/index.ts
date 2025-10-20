// import { withCSRFProtection } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { cartItems, carts, prices, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "POST") {
      // Add item to cart
      const { product_id, quantity = 1, selected_options } = req.body;

      if (!product_id) {
        return res.status(400).json({ error: "Product ID is required" });
      }

      if (quantity <= 0) {
        return res
          .status(400)
          .json({ error: "Quantity must be greater than 0" });
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

      // Verify product exists
      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, product_id))
        .limit(1);

      if (product.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Get price for this product
      const productPrice = await db
        .select()
        .from(prices)
        .where(eq(prices.product_id, product_id))
        .limit(1);

      if (productPrice.length === 0) {
        return res.status(404).json({ error: "No price found for product" });
      }

      let finalPrice = parseFloat(productPrice[0].amount);

      // TODO: Add option price adjustments when needed
      if (selected_options && Object.keys(selected_options).length > 0) {
        // For now, just use base price
        // Option price adjustments can be added later
      }

      // Create descriptive title with selected options
      let descriptiveTitle = product[0].title;
      if (selected_options && Object.keys(selected_options).length > 0) {
        const optionNames = Object.values(selected_options);
        descriptiveTitle += ` - ${optionNames.join(", ")}`;
      }

      // Create a unique key for this product + options combination
      const itemKey = `${product_id}-${JSON.stringify(selected_options || {})}`;

      // Check if item already exists in cart with same options
      const existingItems = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.cart_id, cartId));

      const existingItem = existingItems.find(
        (item) =>
          `${item.product_id}-${JSON.stringify(
            item.selected_options || {}
          )}` === itemKey
      );

      if (existingItem) {
        // Update existing item quantity
        await db
          .update(cartItems)
          .set({
            quantity: existingItem.quantity + quantity,
            updated_at: new Date(),
          })
          .where(eq(cartItems.id, existingItem.id));
      } else {
        // Add new item
        await db.insert(cartItems).values({
          id: uuidv4(),
          cart_id: cartId,
          product_id: product_id,
          quantity: quantity,
          unit_amount: finalPrice.toString(),
          selected_options: selected_options,
          descriptive_title: descriptiveTitle,
        });
      }

      return res.status(200).json({ message: "Item added to cart" });
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Cart items API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default handler;
