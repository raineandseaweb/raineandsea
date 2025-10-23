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
import { withPublicRequest } from "@/lib/security/request-wrapper";
import { eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { slug } = req.query;

    if (!slug || typeof slug !== "string") {
      return res.status(400).json({ error: "Product slug or ID is required" });
    }

    // Check if slug is a UUID (product ID) or a regular slug
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        slug
      );

    // Fetch product with prices and inventory
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
      .where(isUUID ? eq(products.id, slug) : eq(products.slug, slug));

    if (results.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Fetch product media separately
    const mediaResults = await db
      .select()
      .from(productMedia)
      .where(eq(productMedia.product_id, results[0]?.id || ""))
      .orderBy(productMedia.sort);

    // Fetch product options and values
    const optionsData = await db
      .select({
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
      .where(eq(productOptions.product_id, results[0]?.id || ""))
      .orderBy(productOptions.sort_order, productOptionValues.sort_order);

    // Fetch tags separately
    const tagResults = await db
      .select({ id: tags.id, name: tags.name, color: tags.color })
      .from(productTags)
      .leftJoin(tags, eq(productTags.tag_id, tags.id))
      .where(eq(productTags.product_id, results[0].id));

    // Use the image helper for consistent image URL handling

    // Group options by option_id
    const optionsMap = new Map();
    optionsData.forEach((row) => {
      if (row.option_id) {
        if (!optionsMap.has(row.option_id)) {
          optionsMap.set(row.option_id, {
            id: row.option_id,
            name: row.option_name,
            display_name: row.option_display_name,
            sort_order: row.option_sort_order,
            values: [],
          });
        }

        if (row.value_id) {
          optionsMap.get(row.option_id).values.push({
            id: row.value_id,
            name: row.value_name,
            price_adjustment: parseFloat(row.value_price_adjustment || "0"),
            is_default: row.value_is_default,
            is_sold_out: row.value_is_sold_out,
            sort_order: row.value_sort_order,
          });
        }
      }
    });

    let options = Array.from(optionsMap.values()).sort(
      (a, b) => a.sort_order - b.sort_order
    );

    // Build product object
    const product = {
      id: results[0].id,
      slug: results[0].slug,
      title: results[0].title,
      description:
        results[0].description !== results[0].title
          ? results[0].description
          : "",
      // Use the image helper for consistent image URL handling
      image: getProductImageUrlFromMedia(
        results[0].image?.startsWith("http") ? results[0].image : null,
        mediaResults
      ),
      base_price: results[0].base_price,
      price: results[0].price_amount,
      compare_at_price: results[0].compare_at_amount,
      currency: results[0].currency,
      quantity_available: results[0].quantity_available,
      status: results[0].status,
      created_at: results[0].created_at,
      updated_at: results[0].updated_at,
      media: mediaResults.map((media) => {
        const fullUrl = getProductImageUrlFromMedia(null, [media]);
        // Convert full.jpg to thumbnail.jpg for thumbnail URL
        const thumbnailUrl =
          fullUrl?.replace("/full.jpg", "/thumbnail.jpg") || fullUrl;
        return {
          id: media.id,
          url: fullUrl,
          thumbnailUrl: thumbnailUrl,
          alt: media.alt,
          sort: media.sort,
        };
      }),
      options: options,
      tags: tagResults
        .filter((t) => t.id)
        .map((t) => ({
          id: t.id as string,
          name: t.name as string,
          color: t.color as string,
        })),
    };

    return res.status(200).json({ data: product });
  } catch (error) {
    console.error("Product detail API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withPublicRequest(handler, "get_product_detail");
