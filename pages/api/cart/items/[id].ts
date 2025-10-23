import { db } from "@/lib/db";
import { cartItems } from "@/lib/db/schema";
import { withPublicRequest } from "@/lib/security/request-wrapper";
import { and, eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const cartId = req.cookies.cart_id;

    if (!cartId) {
      return res.status(404).json({ error: "Cart not found" });
    }

    if (req.method === "PATCH") {
      // Update item quantity
      const { quantity } = req.body;

      if (quantity <= 0) {
        return res
          .status(400)
          .json({ error: "Quantity must be greater than 0" });
      }

      const updatedItem = await db
        .update(cartItems)
        .set({
          quantity: quantity,
          updated_at: new Date(),
        })
        .where(
          and(eq(cartItems.id, id as string), eq(cartItems.cart_id, cartId))
        )
        .returning();

      if (updatedItem.length === 0) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      return res.status(200).json({ data: updatedItem[0] });
    } else if (req.method === "DELETE") {
      // Remove item from cart
      const deletedItem = await db
        .delete(cartItems)
        .where(
          and(eq(cartItems.id, id as string), eq(cartItems.cart_id, cartId))
        )
        .returning();

      if (deletedItem.length === 0) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      return res.status(200).json({ message: "Item removed from cart" });
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Cart item API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withPublicRequest(handler, "cart_item_operations");
