import { db } from "@/lib/db";
import {
  categories,
  inventory,
  prices,
  productCategories,
  productMedia,
  productTags,
  products,
  tags,
} from "@/lib/db/schema";
import { getProductImageUrlFromMedia } from "@/lib/image-utils";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { slug } = req.query;

    if (!slug || typeof slug !== "string") {
      return res.status(400).json({ error: "Category slug is required" });
    }

    // Simplified validation for now
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sort = (req.query.sort as string) || "relevance";
    const query = req.query.q as string;
    const in_stock_only = req.query.in_stock_only === "true";

    const offset = (page - 1) * limit;

    // First, find the category by slug
    const categoryResult = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    if (categoryResult.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    const category = categoryResult[0];

    // Add category filtering using the junction table
    const categoryProductsQuery = await db
      .select({ product_id: productCategories.product_id })
      .from(productCategories)
      .where(eq(productCategories.category_id, category.id));

    const categoryProductIds = categoryProductsQuery.map(
      (row) => row.product_id
    );

    if (categoryProductIds.length === 0) {
      return res.status(200).json({
        data: {
          category,
          products: [],
        },
        pagination: {
          page,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });
    }

    // Build conditions for products
    const conditions = [
      eq(products.status, "active"),
      inArray(products.id, categoryProductIds),
    ];

    if (query) {
      conditions.push(
        sql`(${products.title} ILIKE ${`%${query}%`} OR ${
          products.description
        } ILIKE ${`%${query}%`})`
      );
    }

    // Add stock filtering if requested
    if (in_stock_only) {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM inventory 
        WHERE inventory.product_id = ${products.id} 
        AND inventory.quantity_available > 0
      )`);
    }

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(...conditions));

    const totalCount = totalCountResult[0]?.count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Build order by
    let orderBy;
    switch (sort) {
      case "newest":
        orderBy = desc(products.created_at);
        break;
      case "price_asc":
      case "price_desc":
        // For now, fall back to newest for price sorting
        orderBy = desc(products.created_at);
        break;
      default:
        orderBy = desc(products.created_at);
    }

    // First, get the paginated product IDs
    const productIdsQuery = await db
      .select({ id: products.id })
      .from(products)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    const productIds = productIdsQuery.map((row) => row.id);

    if (productIds.length === 0) {
      return res.status(200).json({
        data: {
          category,
          products: [],
        },
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    }

    // Get basic product data first
    const productResults = await db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        description: products.description,
        image: products.image,
        status: products.status,
        created_at: products.created_at,
        updated_at: products.updated_at,
      })
      .from(products)
      .where(inArray(products.id, productIds));

    // Get tags separately to avoid complex joins
    const tagResults = await db
      .select({
        product_id: productTags.product_id,
        tag_id: tags.id,
        tag_name: tags.name,
        tag_color: tags.color,
      })
      .from(productTags)
      .leftJoin(tags, eq(productTags.tag_id, tags.id))
      .where(inArray(productTags.product_id, productIds));

    // Get prices and inventory for these products
    const priceResults = await db
      .select({
        product_id: prices.product_id,
        price_amount: prices.amount,
        compare_at_amount: prices.compare_at_amount,
        currency: prices.currency,
      })
      .from(prices)
      .where(inArray(prices.product_id, productIds));

    const inventoryResults = await db
      .select({
        product_id: inventory.product_id,
        quantity_available: inventory.quantity_available,
      })
      .from(inventory)
      .where(inArray(inventory.product_id, productIds));

    // Use the image helper for consistent image URL handling

    // Fetch media for all products
    const mediaResults = await db
      .select({
        product_id: productMedia.product_id,
        blob_url: productMedia.blob_url,
        sort: productMedia.sort,
      })
      .from(productMedia)
      .where(inArray(productMedia.product_id, productIds))
      .orderBy(productMedia.sort);

    // Group media by product_id
    const mediaMap = new Map();
    mediaResults.forEach((media) => {
      if (!mediaMap.has(media.product_id)) {
        mediaMap.set(media.product_id, []);
      }
      mediaMap.get(media.product_id).push(media);
    });

    // Group products and tags
    const productMap = new Map();

    // Create maps for prices and inventory
    const priceMap = new Map();
    priceResults.forEach((price) => {
      priceMap.set(price.product_id, price);
    });

    const inventoryMap = new Map();
    inventoryResults.forEach((inv) => {
      inventoryMap.set(inv.product_id, inv);
    });

    // Process products
    productResults.forEach((row) => {
      const price = priceMap.get(row.id);
      const inventory = inventoryMap.get(row.id);

      productMap.set(row.id, {
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description !== row.title ? row.description : "", // Avoid duplicate title in description
        image: getProductImageUrlFromMedia(
          row.image,
          mediaMap.get(row.id) || []
        ),
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        tags: [],
        price: price
          ? {
              amount: price.price_amount,
              compare_at_amount: price.compare_at_amount,
              currency: price.currency,
            }
          : null,
        inventory: inventory
          ? {
              quantity_available: inventory.quantity_available,
            }
          : null,
      });
    });

    // Process tags
    tagResults.forEach((row) => {
      if (productMap.has(row.product_id)) {
        const product = productMap.get(row.product_id);
        const tagExists = product.tags.some((tag) => tag.id === row.tag_id);
        if (!tagExists && row.tag_id) {
          product.tags.push({
            id: row.tag_id,
            name: row.tag_name,
            color: row.tag_color,
          });
        }
      }
    });

    // Preserve the order from the first query
    const productsList = productIds
      .map((id) => productMap.get(id))
      .filter(Boolean);

    return res.status(200).json({
      data: {
        category,
        products: productsList,
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Category products API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
