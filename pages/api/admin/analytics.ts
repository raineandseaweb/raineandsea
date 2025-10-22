import { db } from "@/lib/db";
import { customers, orderItems, orders } from "@/lib/db/schema";
import { sendSuccessResponse } from "@/lib/security/error-handling";
import { withSecureAdmin } from "@/lib/security/security-middleware";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

type TimePeriod = "7d" | "30d" | "6m" | "1y" | "all";

interface DateRange {
  start: Date;
  end: Date;
}

function getDateRange(period: TimePeriod): DateRange {
  const now = new Date();
  const end = new Date(now);

  switch (period) {
    case "7d":
      return {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        end,
      };
    case "30d":
      return {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end,
      };
    case "6m":
      return {
        start: new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000),
        end,
      };
    case "1y":
      return {
        start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        end,
      };
    case "all":
      return {
        start: new Date(0), // Beginning of time
        end,
      };
  }
}

function getPreviousDateRange(period: TimePeriod): DateRange {
  const now = new Date();
  const currentRange = getDateRange(period);
  const duration = currentRange.end.getTime() - currentRange.start.getTime();

  return {
    start: new Date(currentRange.start.getTime() - duration),
    end: currentRange.start,
  };
}

/**
 * Get analytics data for orders - aggregates by day
 */
async function getOrdersData(range: DateRange) {
  const result = await db
    .select({
      date: sql<string>`DATE_TRUNC('day', ${orders.created_at})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.created_at, range.start),
        lte(orders.created_at, range.end)
      )
    )
    .groupBy(sql`DATE_TRUNC('day', ${orders.created_at})`)
    .orderBy(sql`DATE_TRUNC('day', ${orders.created_at})`);

  return result;
}

/**
 * Get analytics data for revenue - aggregates by day
 */
async function getRevenueData(range: DateRange) {
  const result = await db
    .select({
      date: sql<string>`DATE_TRUNC('day', ${orders.created_at})`,
      revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.created_at, range.start),
        lte(orders.created_at, range.end),
        sql`${orders.status} IN ('paid', 'shipped', 'completed')`
      )
    )
    .groupBy(sql`DATE_TRUNC('day', ${orders.created_at})`)
    .orderBy(sql`DATE_TRUNC('day', ${orders.created_at})`);

  return result;
}

/**
 * Get analytics data for sales (items sold) - aggregates by day
 */
async function getSalesData(range: DateRange) {
  const result = await db
    .select({
      date: sql<string>`DATE_TRUNC('day', ${orders.created_at})`,
      sales: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.order_id, orders.id))
    .where(
      and(
        gte(orders.created_at, range.start),
        lte(orders.created_at, range.end),
        sql`${orders.status} IN ('paid', 'shipped', 'completed')`
      )
    )
    .groupBy(sql`DATE_TRUNC('day', ${orders.created_at})`)
    .orderBy(sql`DATE_TRUNC('day', ${orders.created_at})`);

  return result;
}

/**
 * Get analytics data for users - aggregates by day
 */
async function getUsersData(range: DateRange) {
  const result = await db
    .select({
      date: sql<string>`DATE_TRUNC('day', ${customers.created_at})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(customers)
    .where(
      and(
        gte(customers.created_at, range.start),
        lte(customers.created_at, range.end)
      )
    )
    .groupBy(sql`DATE_TRUNC('day', ${customers.created_at})`)
    .orderBy(sql`DATE_TRUNC('day', ${customers.created_at})`);

  return result;
}

/**
 * Get summary totals for a date range
 */
async function getSummaryTotals(range: DateRange) {
  // Get totals for current period
  const ordersResult = await db
    .select({
      total: sql<number>`COUNT(*)`,
      revenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} IN ('paid', 'shipped', 'completed') THEN ${orders.total} ELSE 0 END), 0)`,
    })
    .from(orders)
    .where(
      and(
        gte(orders.created_at, range.start),
        lte(orders.created_at, range.end)
      )
    );

  const salesResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.order_id, orders.id))
    .where(
      and(
        gte(orders.created_at, range.start),
        lte(orders.created_at, range.end),
        sql`${orders.status} IN ('paid', 'shipped', 'completed')`
      )
    );

  const usersResult = await db
    .select({
      total: sql<number>`COUNT(*)`,
    })
    .from(customers)
    .where(
      and(
        gte(customers.created_at, range.start),
        lte(customers.created_at, range.end)
      )
    );

  return {
    orders: ordersResult[0]?.total || 0,
    revenue: Number(ordersResult[0]?.revenue || 0),
    sales: Number(salesResult[0]?.total || 0),
    users: usersResult[0]?.total || 0,
  };
}

/**
 * Admin analytics API
 * GET /api/admin/analytics?period=7d|30d|6m|1y|all
 */
export default withSecureAdmin(
  async (req: NextApiRequest, res: NextApiResponse, user: any) => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const period = (req.query.period as TimePeriod) || "30d";

      // Validate period
      if (!["7d", "30d", "6m", "1y", "all"].includes(period)) {
        return res.status(400).json({ error: "Invalid period" });
      }

      const currentRange = getDateRange(period);
      const previousRange = getPreviousDateRange(period);

      // Fetch current period data
      const [ordersData, revenueData, salesData, usersData, currentTotals] =
        await Promise.all([
          getOrdersData(currentRange),
          getRevenueData(currentRange),
          getSalesData(currentRange),
          getUsersData(currentRange),
          getSummaryTotals(currentRange),
        ]);

      // Fetch previous period totals for comparison
      const previousTotals = await getSummaryTotals(previousRange);

      // Calculate percentage changes
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      const changes = {
        orders: calculateChange(currentTotals.orders, previousTotals.orders),
        revenue: calculateChange(currentTotals.revenue, previousTotals.revenue),
        sales: calculateChange(currentTotals.sales, previousTotals.sales),
        users: calculateChange(currentTotals.users, previousTotals.users),
      };

      return sendSuccessResponse(res, {
        period,
        currentRange: {
          start: currentRange.start.toISOString(),
          end: currentRange.end.toISOString(),
        },
        previousRange: {
          start: previousRange.start.toISOString(),
          end: previousRange.end.toISOString(),
        },
        data: {
          orders: ordersData,
          revenue: revenueData,
          sales: salesData,
          users: usersData,
        },
        totals: currentTotals,
        previousTotals,
        changes,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      return res.status(500).json({ error: "Failed to fetch analytics" });
    }
  }
);
