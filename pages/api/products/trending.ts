import { db } from "@/lib/db";
import {
  categories,
  prices,
  productCategories,
  productPurchases,
  products,
  productTags,
  tags,
} from "@/lib/db/schema";
import { eq, gte, sql } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Get trending products based on recent sales
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { limit = "20", days = "30" } = req.query;
    const limitNum = parseInt(limit as string, 10);
    const daysNum = parseInt(days as string, 10);

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysNum);

    // Get trending products based on recent purchases
    const trendingData = await db
      .select({
        product_id: productPurchases.product_id,
        recent_sales: sql<number>`COUNT(*)::int`,
        recent_quantity: sql<number>`SUM(${productPurchases.quantity})::int`,
        recent_revenue: sql<string>`SUM(${productPurchases.total_price})`,
        last_purchase: sql<Date>`MAX(${productPurchases.purchased_at})`,
      })
      .from(productPurchases)
      .where(gte(productPurchases.purchased_at, cutoffDate))
      .groupBy(productPurchases.product_id)
      .orderBy(sql`recent_quantity DESC`)
      .limit(limitNum);

    if (trendingData.length === 0) {
      return res.status(200).json({ products: [], count: 0 });
    }

    // Get product details
    const productIds = trendingData.map((t) => t.product_id);
    const productsData = await db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        description: products.description,
        image: products.image,
        base_price: products.base_price,
        status: products.status,
        price: prices.amount,
      })
      .from(products)
      .innerJoin(prices, eq(prices.product_id, products.id))
      .where(sql`${products.id} = ANY(${productIds})`);

    // Get tags
    const productTagsData = await db
      .select({
        product_id: productTags.product_id,
        tag_id: productTags.tag_id,
        tag_name: tags.name,
        tag_id_field: tags.id,
      })
      .from(productTags)
      .innerJoin(tags, eq(productTags.tag_id, tags.id))
      .where(sql`${productTags.product_id} = ANY(${productIds})`);

    // Get categories
    const productCategoriesData = await db
      .select({
        product_id: productCategories.product_id,
        category_id: productCategories.category_id,
        category_name: categories.name,
        category_id_field: categories.id,
      })
      .from(productCategories)
      .innerJoin(categories, eq(productCategories.category_id, categories.id))
      .where(sql`${productCategories.product_id} = ANY(${productIds})`);

    // Group tags and categories by product
    const tagsByProduct = productTagsData.reduce((acc, item) => {
      if (!acc[item.product_id]) {
        acc[item.product_id] = [];
      }
      acc[item.product_id].push({
        id: item.tag_id_field,
        name: item.tag_name,
      });
      return acc;
    }, {} as Record<string, Array<{ id: string; name: string }>>);

    const categoriesByProduct = productCategoriesData.reduce((acc, item) => {
      if (!acc[item.product_id]) {
        acc[item.product_id] = [];
      }
      acc[item.product_id].push({
        id: item.category_id_field,
        name: item.category_name,
      });
      return acc;
    }, {} as Record<string, Array<{ id: string; name: string }>>);

    // Combine data
    const productsWithTrending = productsData.map((product) => {
      const trending = trendingData.find((t) => t.product_id === product.id);
      return {
        ...product,
        base_price: product.base_price ? parseFloat(product.base_price) : null,
        price: parseFloat(product.price),
        tags: tagsByProduct[product.id] || [],
        categories: categoriesByProduct[product.id] || [],
        trending: {
          recent_sales: trending?.recent_sales || 0,
          recent_quantity: trending?.recent_quantity || 0,
          recent_revenue: parseFloat(trending?.recent_revenue || "0"),
          last_purchase: trending?.last_purchase,
          days: daysNum,
        },
      };
    });

    // Sort by recent quantity
    productsWithTrending.sort(
      (a, b) => b.trending.recent_quantity - a.trending.recent_quantity
    );

    return res.status(200).json({
      products: productsWithTrending,
      count: productsWithTrending.length,
      period_days: daysNum,
    });
  } catch (error) {
    console.error("Trending products API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
