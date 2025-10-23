import { db } from "@/lib/db";
import { orderItems, orders, productMedia, products } from "@/lib/db/schema";
import {
  getProductImageUrlFromMedia,
  getThumbnailUrl,
} from "@/lib/image-utils";
import {
  ErrorType,
  sendErrorResponse,
  sendSuccessResponse,
} from "@/lib/security/error-handling";
import { withPublicRequest } from "@/lib/security/request-wrapper";
import { eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Order confirmation endpoint
 * Fetches order details by order number for the confirmation page
 */
async function handler(req: NextApiRequest, res: NextApiResponse, user?: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderNumber, email } = req.query;

    if (!orderNumber || typeof orderNumber !== "string") {
      return sendErrorResponse(
        res,
        "Order number is required",
        ErrorType.VALIDATION_ERROR,
        400
      );
    }

    // Fetch order by order number
    const [order] = await db
      .select({
        id: orders.id,
        order_number: orders.order_number,
        status: orders.status,
        total: orders.total,
        currency: orders.currency,
        is_guest_order: orders.is_guest_order,
        guest_email: orders.guest_email,
        customer_id: orders.customer_id,
        created_at: orders.created_at,
      })
      .from(orders)
      .where(eq(orders.order_number, orderNumber))
      .limit(1);

    if (!order) {
      return sendErrorResponse(
        res,
        "Order not found",
        ErrorType.NOT_FOUND_ERROR,
        404
      );
    }

    // Verify access based on order type
    if (order.is_guest_order) {
      // For guest orders, require email to match
      if (!email || typeof email !== "string") {
        return sendErrorResponse(
          res,
          "Email is required for guest orders",
          ErrorType.VALIDATION_ERROR,
          400
        );
      }
      if (order.guest_email !== email) {
        return sendErrorResponse(
          res,
          "Email does not match order",
          ErrorType.AUTHORIZATION_ERROR,
          403
        );
      }
    } else {
      // For authenticated orders, user must be logged in and own the order
      // Allow access if user is logged in and owns the order
      if (user && user.id === order.customer_id) {
        // User is authenticated and owns the order - allow access
      } else {
        // Either not logged in or doesn't own the order
        return sendErrorResponse(
          res,
          "Unauthorized access to order",
          ErrorType.AUTHORIZATION_ERROR,
          403
        );
      }
    }

    // Fetch order items with product details
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

    // Get media for each product and add thumbnail URLs
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

    // Return order details with items
    sendSuccessResponse(
      res,
      {
        orderId: order.id,
        orderNumber: order.order_number,
        status: order.status,
        total: order.total,
        currency: order.currency,
        isGuestOrder: order.is_guest_order,
        createdAt: order.created_at,
        items: itemsWithMedia,
      },
      "Order details retrieved successfully",
      200
    );
  } catch (error) {
    console.error("Order confirmation error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return sendErrorResponse(
      res,
      "Failed to retrieve order details",
      ErrorType.INTERNAL_ERROR,
      500
    );
  }
}

export default withPublicRequest(handler, "order_confirmation");
