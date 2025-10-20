import { db } from "@/lib/db";
import {
  addresses,
  customers,
  orderItems,
  orders,
  productMedia,
  products,
} from "@/lib/db/schema";
import { sendShippingConfirmationEmail } from "@/lib/email/order-emails";
import { sendSuccessResponse } from "@/lib/security/error-handling";
import { withSecureAdmin } from "@/lib/security/security-middleware";
import {
  generateTrackingUrl,
  parseTrackingNumber,
  validateTrackingNumber,
} from "@/lib/shipping-utils";
import { and, eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Admin order management API
 * GET /api/admin/orders/[id] - Get specific order details
 * PUT /api/admin/orders/[id] - Update order status
 */
export default withSecureAdmin(
  async (req: NextApiRequest, res: NextApiResponse, user: any) => {
    try {
      const { id } = req.query;

      if (!id || typeof id !== "string") {
        return res.status(400).json({ error: "Order ID is required" });
      }

      if (req.method === "GET") {
        // Get order details (including guest orders)
        const order = await db
          .select({
            id: orders.id,
            order_number: orders.order_number,
            is_guest_order: orders.is_guest_order,
            guest_email: orders.guest_email,
            status: orders.status,
            currency: orders.currency,
            subtotal: orders.subtotal,
            tax: orders.tax,
            shipping: orders.shipping,
            total: orders.total,
            created_at: orders.created_at,
            updated_at: orders.updated_at,
            // Customer information (null for guest orders)
            customer_id: customers.id,
            customer_email: customers.email,
            customer_name: customers.name,
          })
          .from(orders)
          .leftJoin(customers, eq(customers.id, orders.customer_id))
          .where(eq(orders.id, id))
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
            product_image: productMedia.blob_url,
          })
          .from(orderItems)
          .innerJoin(products, eq(products.id, orderItems.product_id))
          .leftJoin(
            productMedia,
            and(
              eq(productMedia.product_id, products.id),
              eq(productMedia.sort, 0) // Primary image
            )
          )
          .where(eq(orderItems.order_id, id));

        // Get shipping address (only for customer orders)
        let shippingAddress = [];
        let billingAddress = [];

        if (orderData.customer_id) {
          shippingAddress = await db
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
              and(
                eq(addresses.customer_id, orderData.customer_id),
                eq(addresses.type, "shipping")
              )
            )
            .limit(1);

          // Get billing address
          billingAddress = await db
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
              and(
                eq(addresses.customer_id, orderData.customer_id),
                eq(addresses.type, "billing")
              )
            )
            .limit(1);
        }

        const orderDetails = {
          ...orderData,
          orderNumber:
            orderData.order_number ||
            `#${orderData.id.slice(-8).toUpperCase()}`,
          isGuestOrder: orderData.is_guest_order,
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
          customer: orderData.is_guest_order
            ? {
                id: null,
                email: orderData.guest_email,
                name: "Guest",
                isGuest: true,
              }
            : {
                id: orderData.customer_id,
                email: orderData.customer_email,
                name: orderData.customer_name,
                isGuest: false,
              },
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
      } else if (req.method === "PUT") {
        // Update order status
        const { status, trackingNumber } = req.body;

        if (!status) {
          return res.status(400).json({ error: "Status is required" });
        }

        // Validate status
        const validStatuses = [
          "received",
          "paid",
          "shipped",
          "completed",
          "cancelled",
          "refunded",
        ];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: "Invalid status" });
        }

        // If updating to shipped, require tracking number
        if (status === "shipped" && !trackingNumber) {
          return res.status(400).json({
            error: "Tracking number is required when marking order as shipped",
          });
        }

        // Validate tracking number if provided
        if (trackingNumber) {
          const validation = validateTrackingNumber(trackingNumber);
          if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
          }
        }

        // Prepare update data
        const updateData: any = {
          status,
          updated_at: new Date(),
        };

        // If updating to shipped, add tracking info
        if (status === "shipped" && trackingNumber) {
          try {
            const trackingInfo = parseTrackingNumber(trackingNumber);
            updateData.tracking_number = trackingInfo.trackingNumber;
            updateData.shipping_provider = trackingInfo.provider;
            updateData.shipped_at = new Date();
          } catch (error) {
            return res.status(400).json({
              error:
                error instanceof Error
                  ? error.message
                  : "Invalid tracking number",
            });
          }
        }

        // Update order status
        const updatedOrder = await db
          .update(orders)
          .set(updateData)
          .where(eq(orders.id, id))
          .returning();

        if (updatedOrder.length === 0) {
          return res.status(404).json({ error: "Order not found" });
        }

        // If order was marked as shipped, send shipping confirmation email
        if (status === "shipped" && trackingNumber) {
          try {
            // Get order details for email
            const orderDetails = await db
              .select({
                id: orders.id,
                order_number: orders.order_number,
                is_guest_order: orders.is_guest_order,
                guest_email: orders.guest_email,
                subtotal: orders.subtotal,
                tax: orders.tax,
                shipping: orders.shipping,
                total: orders.total,
                customer_id: customers.id,
                customer_email: customers.email,
                customer_name: customers.name,
              })
              .from(orders)
              .leftJoin(customers, eq(customers.id, orders.customer_id))
              .where(eq(orders.id, id))
              .limit(1);

            if (orderDetails.length > 0) {
              const orderData = orderDetails[0];

              // Get order items
              const items = await db
                .select({
                  variant_id: orderItems.product_id,
                  quantity: orderItems.quantity,
                  unit_amount: orderItems.unit_amount,
                  selected_options: orderItems.selected_options,
                  descriptive_title: orderItems.descriptive_title,
                })
                .from(orderItems)
                .where(eq(orderItems.order_id, id));

              // Get shipping address
              let shippingAddress = null;
              const addressData = await db
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
                    eq(addresses.order_id, orderData.id),
                    eq(addresses.type, "shipping")
                  )
                )
                .limit(1);

              if (addressData.length > 0) {
                shippingAddress = addressData[0];
              }

              if (shippingAddress) {
                const trackingInfo = parseTrackingNumber(trackingNumber);
                const trackingUrl = generateTrackingUrl(
                  trackingNumber,
                  trackingInfo.provider
                );

                await sendShippingConfirmationEmail({
                  orderId: orderData.id,
                  orderNumber: orderData.order_number,
                  customerEmail: orderData.is_guest_order
                    ? orderData.guest_email!
                    : orderData.customer_email!,
                  customerName: orderData.customer_name,
                  trackingNumber: trackingInfo.trackingNumber,
                  shippingProvider: trackingInfo.provider,
                  trackingUrl,
                  orderItems: items.map((item) => ({
                    variant_id: item.variant_id,
                    quantity: item.quantity,
                    unit_amount: parseFloat(item.unit_amount),
                    selected_options: item.selected_options || {},
                    descriptive_title: item.descriptive_title,
                  })),
                  shippingAddress: {
                    name:
                      shippingAddress.name ||
                      orderData.customer_name ||
                      "Guest Customer",
                    email: orderData.is_guest_order
                      ? orderData.guest_email!
                      : orderData.customer_email!,
                    line1: shippingAddress.line1,
                    line2: shippingAddress.line2,
                    city: shippingAddress.city,
                    region: shippingAddress.region,
                    postal_code: shippingAddress.postal_code,
                    country: shippingAddress.country,
                  },
                  subtotal: parseFloat(orderData.subtotal),
                  tax: parseFloat(orderData.tax),
                  shipping: parseFloat(orderData.shipping),
                  total: parseFloat(orderData.total),
                });
              }
            }
          } catch (emailError) {
            console.error(
              "Error sending shipping confirmation email:",
              emailError
            );
            // Don't fail the request if email fails, just log it
          }
        }

        sendSuccessResponse(
          res,
          {
            id: updatedOrder[0].id,
            status: updatedOrder[0].status,
            tracking_number: updatedOrder[0].tracking_number,
            shipping_provider: updatedOrder[0].shipping_provider,
            shipped_at: updatedOrder[0].shipped_at,
            updated_at: updatedOrder[0].updated_at,
          },
          "Order status updated successfully"
        );
      } else {
        return res.status(405).json({ error: "Method not allowed" });
      }
    } catch (error) {
      console.error("Error in admin order API:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
);
