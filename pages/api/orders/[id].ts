import { db } from "@/lib/db";
import { addresses, orderItems, orders, products } from "@/lib/db/schema";
import { sendSuccessResponse } from "@/lib/security/error-handling";
import { withSecureApi } from "@/lib/security/security-middleware";
import { and, eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Get specific order details
 * GET /api/orders/[id] - Get order by ID for authenticated user
 */
export default withSecureApi(
  async (req: NextApiRequest, res: NextApiResponse, user?: any) => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { id } = req.query;

      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Order ID is required" });
      }

      // Get order details
      const order = await db
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
        })
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.customer_id, user.id)))
        .limit(1);

      if (order.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const orderData = order[0];

      // Get order items
      const items = await db
        .select({
          id: orderItems.id,
          product_id: orderItems.product_id,
          quantity: orderItems.quantity,
          unit_amount: orderItems.unit_amount,
          selected_options: orderItems.selected_options,
          descriptive_title: orderItems.descriptive_title,
          created_at: orderItems.created_at,
          // Product details
          product_title: products.title,
          product_slug: products.slug,
          product_image: products.image,
        })
        .from(orderItems)
        .innerJoin(products, eq(products.id, orderItems.product_id))
        .where(eq(orderItems.order_id, id));

      // Get shipping address
      const shippingAddress = await db
        .select({
          name: addresses.line1, // Using line1 as name for now
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
            eq(addresses.customer_id, user.id),
            eq(addresses.type, "shipping")
          )
        )
        .limit(1);

      // Get billing address
      const billingAddress = await db
        .select({
          name: addresses.line1,
          line1: addresses.line1,
          line2: addresses.line2,
          city: addresses.city,
          region: addresses.region,
          postal_code: addresses.postal_code,
          country: addresses.country,
        })
        .from(addresses)
        .where(
          and(eq(addresses.customer_id, user.id), eq(addresses.type, "billing"))
        )
        .limit(1);

      const orderDetails = {
        ...orderData,
        orderNumber: `#${orderData.id.slice(-8).toUpperCase()}`,
        items: items.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_amount: parseFloat(item.unit_amount),
          total: parseFloat(item.unit_amount) * item.quantity,
          selected_options: item.selected_options || {},
          descriptive_title: item.descriptive_title || item.product_title,
          product: {
            id: item.product_id,
            title: item.product_title,
            slug: item.product_slug,
            image: item.product_image,
          },
        })),
        shippingAddress: shippingAddress[0] || null,
        billingAddress: billingAddress[0] || null,
        totals: {
          subtotal: parseFloat(orderData.subtotal),
          tax: parseFloat(orderData.tax),
          shipping: parseFloat(orderData.shipping),
          total: parseFloat(orderData.total),
        },
      };

      sendSuccessResponse(
        res,
        orderDetails,
        "Order details retrieved successfully"
      );
    } catch (error) {
      console.error("Error fetching order details:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch order details",
      });
    }
  }
);
