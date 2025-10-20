import { db } from "@/lib/db";
import {
  categories,
  prices,
  productAnalytics,
  productCategories,
  products,
  productTags,
  tags,
} from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Get popular products based on sales analytics
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { limit = "20", sortBy = "sales" } = req.query;
    const limitNum = parseInt(limit as string, 10);

    // Determine sort order
    let sortColumn;
    switch (sortBy) {
      case "revenue":
        sortColumn = productAnalytics.total_revenue;
        break;
      case "orders":
        sortColumn = productAnalytics.total_orders;
        break;
      case "views":
        sortColumn = productAnalytics.views_count;
        break;
      case "sales":
      default:
        sortColumn = productAnalytics.total_sales;
        break;
    }

    // Get popular products
    const popularProducts = await db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        description: products.description,
        image: products.image,
        base_price: products.base_price,
        status: products.status,
        price: prices.amount,
        total_sales: productAnalytics.total_sales,
        total_orders: productAnalytics.total_orders,
        total_revenue: productAnalytics.total_revenue,
        views_count: productAnalytics.views_count,
        last_sale_at: productAnalytics.last_sale_at,
      })
      .from(products)
      .innerJoin(productAnalytics, eq(productAnalytics.product_id, products.id))
      .innerJoin(prices, eq(prices.product_id, products.id))
      .where(eq(products.status, "active"))
      .orderBy(desc(sortColumn))
      .limit(limitNum);

    // Get tags for all products
    const productIds = popularProducts.map((p) => p.id);
    if (productIds.length > 0) {
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

      // Get categories for all products
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

      // Group tags by product
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

      // Group categories by product
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
      const productsWithData = popularProducts.map((product) => ({
        ...product,
        base_price: product.base_price ? parseFloat(product.base_price) : null,
        price: parseFloat(product.price),
        total_revenue: parseFloat(product.total_revenue),
        tags: tagsByProduct[product.id] || [],
        categories: categoriesByProduct[product.id] || [],
        analytics: {
          total_sales: product.total_sales,
          total_orders: product.total_orders,
          total_revenue: parseFloat(product.total_revenue),
          views_count: product.views_count,
          last_sale_at: product.last_sale_at,
        },
      }));

      return res.status(200).json({
        products: productsWithData,
        count: productsWithData.length,
      });
    }

    return res.status(200).json({ products: [], count: 0 });
  } catch (error) {
    console.error("Popular products API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
