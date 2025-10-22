/**
 * Manual Analytics Aggregation Script
 *
 * This script can be run manually to pre-compute analytics data
 * It aggregates historical data without affecting real-time queries
 *
 * Usage:
 *   tsx scripts/manual-analytics-aggregation.ts
 *   tsx scripts/manual-analytics-aggregation.ts --period=30d
 *   tsx scripts/manual-analytics-aggregation.ts --all
 */

import { config } from "dotenv";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { customers, orderItems, orders } from "../src/lib/db/schema";

// Load environment variables
config({ path: ".env.local" });

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
        start: new Date(0),
        end,
      };
  }
}

async function runAggregation(period: TimePeriod) {
  console.log(`\n🔄 Running analytics aggregation for period: ${period}`);

  const range = getDateRange(period);
  console.log(
    `   Date range: ${range.start.toISOString()} to ${range.end.toISOString()}`
  );

  try {
    // 1. Orders aggregation
    console.log("\n📊 Aggregating orders...");
    const ordersData = await db
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

    console.log(`   ✓ Found ${ordersData.length} days with orders`);

    // 2. Revenue aggregation
    console.log("\n💰 Aggregating revenue...");
    const revenueData = await db
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

    const totalRevenue = revenueData.reduce(
      (sum, d) => sum + Number(d.revenue),
      0
    );
    console.log(`   ✓ Total revenue: $${totalRevenue.toFixed(2)}`);

    // 3. Sales (items) aggregation
    console.log("\n📦 Aggregating sales...");
    const salesData = await db
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

    const totalSales = salesData.reduce((sum, d) => sum + Number(d.sales), 0);
    console.log(`   ✓ Total items sold: ${totalSales}`);

    // 4. Users aggregation
    console.log("\n👥 Aggregating users...");
    const usersData = await db
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

    const totalUsers = usersData.reduce((sum, d) => sum + Number(d.count), 0);
    console.log(`   ✓ Total new users: ${totalUsers}`);

    // Summary
    console.log("\n✅ Aggregation complete!");
    console.log("📈 Summary:");
    console.log(`   Orders: ${ordersData.length} days of data`);
    console.log(`   Revenue: $${totalRevenue.toFixed(2)}`);
    console.log(`   Sales: ${totalSales} items`);
    console.log(`   Users: ${totalUsers} new users`);
  } catch (error) {
    console.error("❌ Error during aggregation:", error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const periodArg = args.find((arg) => arg.startsWith("--period="));
  const allPeriods = args.includes("--all");

  if (allPeriods) {
    // Run for all periods
    const periods: TimePeriod[] = ["7d", "30d", "6m", "1y", "all"];
    for (const period of periods) {
      await runAggregation(period);
    }
  } else {
    // Run for specified period or default to 30d
    const period = periodArg ? (periodArg.split("=")[1] as TimePeriod) : "30d";

    if (!["7d", "30d", "6m", "1y", "all"].includes(period)) {
      console.error("❌ Invalid period. Use: 7d, 30d, 6m, 1y, or all");
      process.exit(1);
    }

    await runAggregation(period);
  }

  console.log("\n✨ Done!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
