import { db } from "@/lib/db";
import {
  cartItems,
  carts,
  productMedia,
  productOptions,
  productOptionValues,
  products,
} from "@/lib/db/schema";
import { getProductImageUrlFromMedia } from "@/lib/image-utils";
import { withPublicRequest } from "@/lib/security/request-wrapper";
import { eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
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

      // Fetch cart with items
      const cart = await db
        .select()
        .from(carts)
        .where(eq(carts.id, cartId))
        .limit(1);

      if (cart.length === 0) {
        return res.status(404).json({ error: "Cart not found" });
      }

      // Fetch cart items
      const items = await db
        .select({
          id: cartItems.id,
          cart_id: cartItems.cart_id,
          product_id: cartItems.product_id,
          quantity: cartItems.quantity,
          unit_amount: cartItems.unit_amount,
          selected_options: cartItems.selected_options,
          descriptive_title: cartItems.descriptive_title,
          created_at: cartItems.created_at,
          updated_at: cartItems.updated_at,
        })
        .from(cartItems)
        .where(eq(cartItems.cart_id, cartId));

      // Use the image helper for consistent image URL handling

      // Fetch product data for each item
      const transformedItems = await Promise.all(
        items.map(async (item) => {
          // Use product_id
          const productId = item.product_id;
          if (!productId) {
            console.warn("Cart item missing product_id:", item);
            return null;
          }

          const product = await db
            .select()
            .from(products)
            .where(eq(products.id, productId))
            .limit(1);

          if (product.length === 0) {
            return null;
          }

          // Fetch product media for R2 URLs
          const mediaResults = await db
            .select()
            .from(productMedia)
            .where(eq(productMedia.product_id, product[0].id))
            .orderBy(productMedia.sort);

          // Fetch product options and values
          const optionsData = await db
            .select({
              option_id: productOptions.id,
              option_name: productOptions.name,
              option_display_name: productOptions.display_name,
              option_sort_order: productOptions.sort_order,
              value_id: productOptionValues.id,
              value_name: productOptionValues.name,
              value_price_adjustment: productOptionValues.price_adjustment,
              value_is_default: productOptionValues.is_default,
              value_is_sold_out: productOptionValues.is_sold_out,
              value_sort_order: productOptionValues.sort_order,
            })
            .from(productOptions)
            .leftJoin(
              productOptionValues,
              eq(productOptions.id, productOptionValues.option_id)
            )
            .where(eq(productOptions.product_id, product[0].id))
            .orderBy(productOptions.sort_order, productOptionValues.sort_order);

          // Group options by option_id
          const optionsMap = new Map();
          optionsData.forEach((row) => {
            if (row.option_id) {
              if (!optionsMap.has(row.option_id)) {
                optionsMap.set(row.option_id, {
                  id: row.option_id,
                  name: row.option_name,
                  display_name: row.option_display_name,
                  sort_order: row.option_sort_order,
                  values: [],
                });
              }

              if (row.value_id) {
                optionsMap.get(row.option_id).values.push({
                  id: row.value_id,
                  name: row.value_name,
                  price_adjustment: parseFloat(
                    row.value_price_adjustment || "0"
                  ),
                  is_default: row.value_is_default,
                  is_sold_out: row.value_is_sold_out,
                  sort_order: row.value_sort_order,
                });
              }
            }
          });

          const options = Array.from(optionsMap.values()).sort(
            (a, b) => a.sort_order - b.sort_order
          );

          // Use R2 URL from productMedia if available, otherwise fall back to products.image
          // Never return legacy /images paths
          const mediaUrl = mediaResults[0]?.blob_url || null;
          const productImageUrl =
            product[0].image && product[0].image.startsWith("http")
              ? product[0].image
              : null;
          const imageUrl = getProductImageUrlFromMedia(
            productImageUrl,
            mediaResults
          );

          return {
            id: item.id,
            cart_id: item.cart_id,
            product_id: productId,
            quantity: item.quantity,
            unit_amount: item.unit_amount,
            selected_options: item.selected_options,
            descriptive_title: item.descriptive_title,
            product: {
              id: product[0].id,
              title: product[0].title,
              slug: product[0].slug,
              image: imageUrl,
              base_price: parseFloat(product[0].base_price || "0"),
              currency: "USD", // Default currency
              options: options, // Include options for client-side descriptive title generation
            },
          };
        })
      );

      // Filter out null items
      const validItems = transformedItems.filter((item) => item !== null);

      const cartData = {
        ...cart[0],
        items: validItems,
      };

      return res.status(200).json({ data: cartData });
    } else if (req.method === "DELETE") {
      // Clear cart
      const cartId = req.cookies.cart_id;

      if (!cartId) {
        return res.status(404).json({ error: "Cart not found" });
      }

      // Delete all cart items
      await db.delete(cartItems).where(eq(cartItems.cart_id, cartId));

      // Delete cart
      await db.delete(carts).where(eq(carts.id, cartId));

      // Clear cart ID cookie
      res.setHeader(
        "Set-Cookie",
        "cart_id=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
      );

      return res.status(200).json({ message: "Cart cleared" });
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Cart API error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withPublicRequest(handler, "cart_operations");
