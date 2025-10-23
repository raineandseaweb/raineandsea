import { db } from "@/lib/db";
import {
  addresses,
  orderItems,
  orders,
  productMedia,
  products,
} from "@/lib/db/schema";
import {
  getProductImageUrlFromMedia,
  getThumbnailUrl,
} from "@/lib/image-utils";
import { ErrorType, sendErrorResponse } from "@/lib/security/error-handling";
import { withAuthenticatedRequest } from "@/lib/security/request-wrapper";
import { and, desc, eq, or } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Get user's order history
 */
async function handler(req: NextApiRequest, res: NextApiResponse, user?: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get user's orders with items (both authenticated and guest orders)
    const userOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        currency: orders.currency,
        subtotal: orders.subtotal,
        tax: orders.tax,
        shipping: orders.shipping,
        total: orders.total,
        created_at: orders.created_at,
        updated_at: orders.updated_at,
        order_number: orders.order_number,
        is_guest_order: orders.is_guest_order,
        tracking_number: orders.tracking_number,
        shipping_provider: orders.shipping_provider,
        shipped_at: orders.shipped_at,
      })
      .from(orders)
      .where(
        or(
          eq(orders.customer_id, user.id),
          and(
            eq(orders.guest_email, user.email),
            eq(orders.is_guest_order, true)
          )
        )
      )
      .orderBy(desc(orders.created_at));

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      userOrders.map(async (order) => {
        const items = await db
          .select({
            id: orderItems.id,
            product_id: orderItems.product_id,
            quantity: orderItems.quantity,
            unit_amount: orderItems.unit_amount,
            selected_options: orderItems.selected_options,
            descriptive_title: orderItems.descriptive_title,
            product_title: products.title,
            product_slug: products.slug,
            product_image: products.image,
          })
          .from(orderItems)
          .innerJoin(products, eq(orderItems.product_id, products.id))
          .where(eq(orderItems.order_id, order.id));

        // Get media for each product
        const itemsWithMedia = await Promise.all(
          items.map(async (item) => {
            const media = await db
              .select({
                blob_url: productMedia.blob_url,
                sort: productMedia.sort,
              })
              .from(productMedia)
              .where(eq(productMedia.product_id, item.product_id))
              .orderBy(productMedia.sort);

            const imageUrl = getProductImageUrlFromMedia(
              item.product_image,
              media
            );
            const thumbnailUrl = getThumbnailUrl(imageUrl);

            return {
              ...item,
              selected_options: item.selected_options || {},
              descriptive_title: item.descriptive_title || item.product_title,
              product_image: thumbnailUrl,
            };
          })
        );

        // Get shipping address for this order
        const shippingAddress = await db
          .select({
            name: addresses.name,
            line1: addresses.line1,
            line2: addresses.line2,
            city: addresses.city,
            region: addresses.region,
            postal_code: addresses.postal_code,
            country: addresses.country,
          })
          .from(addresses)
          .where(
            and(
              eq(addresses.order_id, order.id),
              eq(addresses.type, "shipping")
            )
          )
          .limit(1);

        return {
          ...order,
          items: itemsWithMedia,
          orderNumber:
            order.order_number || `#${order.id.slice(-8).toUpperCase()}`,
          shippingAddress: shippingAddress[0] || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: ordersWithItems,
    });
  } catch (error) {
    console.error("Orders API error:", error);
    return sendErrorResponse(
      res,
      "Failed to fetch orders",
      ErrorType.INTERNAL_ERROR,
      500
    );
  }
}

export default withAuthenticatedRequest(handler, "get_user_orders");
