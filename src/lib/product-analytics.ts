import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { productAnalytics, productPurchases } from "./db/schema";

/**
 * Track a product purchase and update analytics
 */
export async function trackProductPurchase(data: {
  productId: string;
  orderId: string;
  customerId: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}) {
  const { productId, orderId, customerId, quantity, unitPrice, totalPrice } =
    data;

  try {
    // Insert purchase record
    await db.insert(productPurchases).values({
      product_id: productId,
      order_id: orderId,
      customer_id: customerId,
      quantity,
      unit_price: unitPrice.toString(),
      total_price: totalPrice.toString(),
      purchased_at: new Date(),
    });

    // Update or insert analytics
    await db
      .insert(productAnalytics)
      .values({
        product_id: productId,
        total_sales: quantity,
        total_orders: 1,
        total_revenue: totalPrice.toString(),
        last_sale_at: new Date(),
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: productAnalytics.product_id,
        set: {
          total_sales: sql`${productAnalytics.total_sales} + ${quantity}`,
          total_orders: sql`${productAnalytics.total_orders} + 1`,
          total_revenue: sql`${productAnalytics.total_revenue} + ${totalPrice}`,
          last_sale_at: new Date(),
          updated_at: new Date(),
        },
      });

    return { success: true };
  } catch (error) {
    console.error("Error tracking product purchase:", error);
    return { success: false, error };
  }
}

/**
 * Track product views
 */
export async function trackProductView(productId: string) {
  try {
    await db
      .insert(productAnalytics)
      .values({
        product_id: productId,
        views_count: 1,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: productAnalytics.product_id,
        set: {
          views_count: sql`${productAnalytics.views_count} + 1`,
          updated_at: new Date(),
        },
      });

    return { success: true };
  } catch (error) {
    console.error("Error tracking product view:", error);
    return { success: false, error };
  }
}

/**
 * Get product analytics
 */
export async function getProductAnalytics(productId: string) {
  try {
    const analytics = await db
      .select()
      .from(productAnalytics)
      .where(eq(productAnalytics.product_id, productId))
      .limit(1);

    return analytics[0] || null;
  } catch (error) {
    console.error("Error fetching product analytics:", error);
    return null;
  }
}

/**
 * Get popular products based on sales
 */
export async function getPopularProducts(limit: number = 10) {
  try {
    const popular = await db
      .select({
        product_id: productAnalytics.product_id,
        total_sales: productAnalytics.total_sales,
        total_orders: productAnalytics.total_orders,
        total_revenue: productAnalytics.total_revenue,
        views_count: productAnalytics.views_count,
        last_sale_at: productAnalytics.last_sale_at,
      })
      .from(productAnalytics)
      .orderBy(sql`${productAnalytics.total_sales} DESC`)
      .limit(limit);

    return popular;
  } catch (error) {
    console.error("Error fetching popular products:", error);
    return [];
  }
}

/**
 * Get trending products (based on recent sales)
 */
export async function getTrendingProducts(
  limit: number = 10,
  daysBack: number = 30
) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const trending = await db
      .select({
        product_id: productPurchases.product_id,
        recent_sales: sql<number>`COUNT(*)::int`,
        recent_quantity: sql<number>`SUM(${productPurchases.quantity})::int`,
        recent_revenue: sql<string>`SUM(${productPurchases.total_price})`,
      })
      .from(productPurchases)
      .where(sql`${productPurchases.purchased_at} >= ${cutoffDate}`)
      .groupBy(productPurchases.product_id)
      .orderBy(sql`recent_quantity DESC`)
      .limit(limit);

    return trending;
  } catch (error) {
    console.error("Error fetching trending products:", error);
    return [];
  }
}

/**
 * Get customers who bought a specific product
 */
export async function getProductCustomers(
  productId: string,
  limit: number = 50
) {
  try {
    const customers = await db
      .select({
        customer_id: productPurchases.customer_id,
        order_id: productPurchases.order_id,
        quantity: productPurchases.quantity,
        total_price: productPurchases.total_price,
        purchased_at: productPurchases.purchased_at,
      })
      .from(productPurchases)
      .where(eq(productPurchases.product_id, productId))
      .orderBy(sql`${productPurchases.purchased_at} DESC`)
      .limit(limit);

    return customers;
  } catch (error) {
    console.error("Error fetching product customers:", error);
    return [];
  }
}
