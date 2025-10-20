import { db } from "@/lib/db";
import {
  inventory,
  prices,
  productMedia,
  productOptions,
  productOptionValues,
  products,
  productTags,
  tags,
} from "@/lib/db/schema";
import { getProductImageUrlFromMedia } from "@/lib/image-utils";
import { searchSchema } from "@/lib/validations";
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
    const validation = searchSchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid query parameters",
        details: validation.error.issues,
      });
    }

    const {
      q: query,
      page = 1,
      limit = 20,
      sort = "relevance",
      in_stock_only = false,
    } = validation.data;

    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [eq(products.status, "active")];

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

    // Build order by - simplified for now (price sorting disabled)
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
        data: [],
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

    // Fetch products with prices and inventory for those IDs
    const results = await db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        description: products.description,
        image: products.image,
        base_price: products.base_price,
        status: products.status,
        created_at: products.created_at,
        updated_at: products.updated_at,
        price_amount: prices.amount,
        compare_at_amount: prices.compare_at_amount,
        currency: prices.currency,
        quantity_available: inventory.quantity_available,
      })
      .from(products)
      .leftJoin(prices, eq(products.id, prices.product_id))
      .leftJoin(inventory, eq(products.id, inventory.product_id))
      .where(inArray(products.id, productIds));

    // Fetch tags separately
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

    // Fetch product media separately
    const mediaResults = await db
      .select({
        product_id: productMedia.product_id,
        blob_url: productMedia.blob_url,
        alt: productMedia.alt,
        sort: productMedia.sort,
      })
      .from(productMedia)
      .where(inArray(productMedia.product_id, productIds))
      .orderBy(productMedia.sort);

    // Group products by ID to avoid duplicates from joins
    const productMap = new Map();

    results.forEach((row) => {
      if (!productMap.has(row.id)) {
        productMap.set(row.id, {
          id: row.id,
          slug: row.slug,
          title: row.title,
          description: row.description !== row.title ? row.description : "",
          image: row.image,
          base_price: row.base_price,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          price: row.price_amount,
          compare_at_price: row.compare_at_amount,
          currency: row.currency,
          quantity_available: row.quantity_available,
          options: [],
          tags: [],
        });
      }
    });

    // Attach tags
    tagResults.forEach((row) => {
      const product = productMap.get(row.product_id);
      if (!product) return;
      const exists = product.tags.some((t: any) => t.id === row.tag_id);
      if (!exists && row.tag_id) {
        product.tags.push({
          id: row.tag_id,
          name: row.tag_name,
          color: row.tag_color,
        });
      }
    });

    // Fetch options for products
    const optionResults = await db
      .select({
        product_id: productOptions.product_id,
        option_id: productOptions.id,
        option_name: productOptions.name,
        option_display_name: productOptions.display_name,
        option_sort_order: productOptions.sort_order,
        value_id: productOptionValues.id,
        value_name: productOptionValues.name,
        value_price_adjustment: productOptionValues.price_adjustment,
        value_is_default: productOptionValues.is_default,
        value_is_sold_out: productOptionValues.is_sold_out,
        value_sort_order: productOptionValues.sort_order,
      })
      .from(productOptions)
      .leftJoin(
        productOptionValues,
        eq(productOptions.id, productOptionValues.option_id)
      )
      .where(inArray(productOptions.product_id, productIds));

    // Group options by product
    const optionMap = new Map();
    optionResults.forEach((row) => {
      if (!row.product_id || !row.option_id) return;

      if (!optionMap.has(row.product_id)) {
        optionMap.set(row.product_id, new Map());
      }

      const productOptions = optionMap.get(row.product_id);
      if (!productOptions.has(row.option_id)) {
        productOptions.set(row.option_id, {
          id: row.option_id,
          name: row.option_name,
          display_name: row.option_display_name,
          sort_order: row.option_sort_order,
          values: [],
        });
      }

      if (row.value_id) {
        productOptions.get(row.option_id).values.push({
          id: row.value_id,
          name: row.value_name,
          price_adjustment: row.value_price_adjustment,
          is_default: row.value_is_default,
          is_sold_out: row.value_is_sold_out,
          sort_order: row.value_sort_order,
        });
      }
    });

    // Attach options to products
    optionMap.forEach((productOptions, productId) => {
      const product = productMap.get(productId);
      if (product) {
        product.options = Array.from(productOptions.values()).sort(
          (a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)
        );
      }
    });

    // Use the image helper for consistent image URL handling

    // Preserve order and convert image URLs, preferring R2 URLs from productMedia and never old in-repo URLs
    const productsList = productIds
      .map((id) => {
        const product = productMap.get(id);
        if (product) {
          // Get media for this specific product (sorted by sort order)
          const productMedia = mediaResults
            .filter((m) => m.product_id === id)
            .sort((a, b) => a.sort - b.sort);

          // Only use products.image if it is already an absolute (e.g., R2) URL
          const productImageUrl =
            product.image && product.image.startsWith("http")
              ? product.image
              : null;

          const imageUrl = getProductImageUrlFromMedia(
            productImageUrl,
            productMedia
          );

          return {
            ...product,
            image: imageUrl,
          };
        }
        return product;
      })
      .filter(Boolean);

    return res.status(200).json({
      data: productsList,
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
    console.error("Products API error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
