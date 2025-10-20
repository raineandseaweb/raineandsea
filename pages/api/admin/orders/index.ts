import { db } from "@/lib/db";
import {
  addresses,
  customers,
  orderItems,
  orders,
  productMedia,
  products,
} from "@/lib/db/schema";
import { sendSuccessResponse } from "@/lib/security/error-handling";
import { withSecureAdmin } from "@/lib/security/security-middleware";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Admin orders management API
 * GET /api/admin/orders - Get all orders with filtering and pagination
 * PUT /api/admin/orders/[id] - Update order status
 */
export default withSecureAdmin(
  async (req: NextApiRequest, res: NextApiResponse, user: any) => {
    if (req.method === "GET") {
      try {
        const {
          status,
          search,
          limit = "20",
          offset = "0",
          sortBy = "created_at",
          sortOrder = "desc",
        } = req.query;

        // Build query conditions
        const conditions = [];

        // Status filter
        if (status && typeof status === "string") {
          conditions.push(eq(orders.status, status));
        }

        // Search filter (by customer email, guest email, order number, or order ID)
        if (search && typeof search === "string") {
          conditions.push(
            or(
              like(customers.email, `%${search}%`),
              like(orders.guest_email, `%${search}%`),
              like(orders.order_number, `%${search}%`),
              like(orders.id, `%${search}%`)
            )
          );
        }

        // Build order by clause with validation
        const validSortFields = [
          "id",
          "status",
          "created_at",
          "updated_at",
          "total",
          "subtotal",
        ];
        const sortField = validSortFields.includes(sortBy as string)
          ? (sortBy as string)
          : "created_at";

        const orderBy =
          sortOrder === "desc"
            ? desc(orders[sortField as keyof typeof orders])
            : orders[sortField as keyof typeof orders];

        // Get orders with customer information (including guest orders)
        const adminOrders = await db
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
            tracking_number: orders.tracking_number,
            shipping_provider: orders.shipping_provider,
            shipped_at: orders.shipped_at,
            created_at: orders.created_at,
            updated_at: orders.updated_at,
            // Customer information (null for guest orders)
            customer_id: customers.id,
            customer_email: customers.email,
            customer_name: customers.name,
          })
          .from(orders)
          .leftJoin(customers, eq(customers.id, orders.customer_id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(orderBy)
          .limit(parseInt(limit as string))
          .offset(parseInt(offset as string));

        // Get order items for each order
        const ordersWithItems = await Promise.all(
          adminOrders.map(async (order) => {
            const items = await db
              .select({
                id: orderItems.id,
                product_id: orderItems.product_id,
                quantity: orderItems.quantity,
                unit_amount: orderItems.unit_amount,
                created_at: orderItems.created_at,
                selected_options: orderItems.selected_options,
                descriptive_title: orderItems.descriptive_title,
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
              .where(eq(orderItems.order_id, order.id));

            // Get shipping address for this order (works for both customer and guest orders)
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
              orderNumber:
                order.order_number || `#${order.id.slice(-8).toUpperCase()}`,
              isGuestOrder: order.is_guest_order,
              tracking_number: order.tracking_number,
              shipping_provider: order.shipping_provider,
              shipped_at: order.shipped_at,
              items: items.map((item) => ({
                id: item.id,
                product_id: item.product_id,
                quantity: item.quantity,
                unit_amount: parseFloat(item.unit_amount),
                total: parseFloat(item.unit_amount) * item.quantity,
                selected_options: item.selected_options,
                descriptive_title: item.descriptive_title,
                product: {
                  id: item.product_id,
                  title: item.product_title,
                  slug: item.product_slug,
                  image: item.product_image,
                },
              })),
              customer: order.is_guest_order
                ? {
                    id: null,
                    email: order.guest_email,
                    name: "Guest",
                    isGuest: true,
                  }
                : {
                    id: order.customer_id,
                    email: order.customer_email,
                    name: order.customer_name,
                    isGuest: false,
                  },
              shippingAddress: shippingAddress[0] || null,
              totals: {
                subtotal: parseFloat(order.subtotal),
                tax: parseFloat(order.tax),
                shipping: parseFloat(order.shipping),
                total: parseFloat(order.total),
              },
            };
          })
        );

        // Get total count for pagination
        const totalCount = await db
          .select({ count: sql`count(*)` })
          .from(orders)
          .leftJoin(customers, eq(customers.id, orders.customer_id))
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        // Get order status counts for filtering
        const statusCounts = await db
          .select({
            status: orders.status,
            count: sql`count(*)`,
          })
          .from(orders)
          .groupBy(orders.status);

        sendSuccessResponse(
          res,
          {
            orders: ordersWithItems,
            pagination: {
              total: parseInt(totalCount[0].count as string),
              limit: parseInt(limit as string),
              offset: parseInt(offset as string),
              hasMore: ordersWithItems.length === parseInt(limit as string),
            },
            filters: {
              statusCounts: statusCounts.map((item) => ({
                status: item.status,
                count: parseInt(item.count as string),
              })),
            },
          },
          "Orders retrieved successfully"
        );
      } catch (error) {
        console.error("Error fetching admin orders:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch orders",
        });
      }
    } else if (req.method === "DELETE") {
      try {
        const { orderIds } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
          return res.status(400).json({
            error: "Order IDs array is required",
          });
        }

        // Delete order items first (foreign key constraint)
        await db
          .delete(orderItems)
          .where(inArray(orderItems.order_id, orderIds));

        // Delete addresses associated with these orders
        await db.delete(addresses).where(inArray(addresses.order_id, orderIds));

        // Delete orders
        const deletedOrders = await db
          .delete(orders)
          .where(inArray(orders.id, orderIds))
          .returning({ id: orders.id });

        sendSuccessResponse(
          res,
          {
            deletedCount: deletedOrders.length,
            deletedOrderIds: deletedOrders.map((order) => order.id),
          },
          `${deletedOrders.length} orders deleted successfully`
        );
      } catch (error) {
        console.error("Error deleting orders:", error);
        return res.status(500).json({
          success: false,
          error: "Failed to delete orders",
        });
      }
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  }
);
