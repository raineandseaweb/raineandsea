import { db } from "@/lib/db";
import {
  addresses,
  customers,
  orderItems,
  orders,
  productMedia,
  products,
} from "@/lib/db/schema";
import {
  getProductImageUrlFromMedia,
  getThumbnailUrl,
} from "@/lib/image-utils";
import {
  ErrorType,
  sendErrorResponse,
  sendSuccessResponse,
} from "@/lib/security/error-handling";
import { withRateLimit } from "@/lib/security/rate-limiting";
import { withPublicRequest } from "@/lib/security/request-wrapper";
import { and, eq, or } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Order lookup endpoint
 * Allows users to look up their orders by order number and email
 * Works for both guest orders and logged-in user orders
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Rate limiting for order lookup
    withRateLimit(req, "API");

    const { orderNumber, email } = req.body;

    // Validate required fields
    if (!orderNumber || !email) {
      return sendErrorResponse(
        res,
        "Order number and email are required",
        ErrorType.VALIDATION_ERROR,
        400
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendErrorResponse(
        res,
        "Invalid email format",
        ErrorType.VALIDATION_ERROR,
        400
      );
    }

    // Look up order by order number and email
    // This works for both guest orders (guest_email matches) and logged-in user orders (customer email matches)
    const foundOrders = await db
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
        guest_email: orders.guest_email,
        is_guest_order: orders.is_guest_order,
        customer_id: orders.customer_id,
        customer_email: customers.email,
        tracking_number: orders.tracking_number,
        shipping_provider: orders.shipping_provider,
        shipped_at: orders.shipped_at,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customer_id, customers.id))
      .where(
        and(
          eq(orders.order_number, orderNumber),
          or(
            // Guest order: guest_email matches
            and(eq(orders.is_guest_order, true), eq(orders.guest_email, email)),
            // Logged-in user order: customer email matches
            and(eq(orders.is_guest_order, false), eq(customers.email, email))
          )
        )
      )
      .limit(1);

    if (foundOrders.length === 0) {
      return sendErrorResponse(
        res,
        "Order not found or email does not match",
        ErrorType.NOT_FOUND_ERROR,
        404
      );
    }

    const order = foundOrders[0];

    // Get order items with product details
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

        const imageUrl = getProductImageUrlFromMedia(item.product_image, media);
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
        and(eq(addresses.order_id, order.id), eq(addresses.type, "shipping"))
      )
      .limit(1);

    // Return order details
    sendSuccessResponse(
      res,
      {
        ...order,
        items: itemsWithMedia,
        orderNumber: order.order_number,
        shippingAddress: shippingAddress[0] || null,
      },
      "Order found successfully",
      200
    );
  } catch (error) {
    console.error("Order lookup error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return sendErrorResponse(
      res,
      "Order lookup failed",
      ErrorType.INTERNAL_ERROR,
      500
    );
  }
}

export default withPublicRequest(handler, "order_lookup");
