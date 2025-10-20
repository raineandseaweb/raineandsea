import { db } from "@/lib/db";
import {
  inventory,
  prices,
  productCrystals,
  productMedia,
  productOptions,
  productOptionValues,
  products,
  productTags,
  tags,
} from "@/lib/db/schema";
import { AuthenticatedUser, withAdminProtection } from "@/lib/role-middleware";
import { eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: AuthenticatedUser
) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({
      error: "Product ID is required",
    });
  }

  if (req.method === "GET") {
    // Get specific product
    try {
      const product = await db
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
        .where(eq(products.id, id))
        .limit(1);

      if (product.length === 0) {
        return res.status(404).json({
          error: "Product not found",
        });
      }

      // Get tags for this product
      const productTagsData = await db
        .select({
          tag_id: tags.id,
          tag_name: tags.name,
        })
        .from(productTags)
        .innerJoin(tags, eq(productTags.tag_id, tags.id))
        .where(eq(productTags.product_id, id));

      // Get media for this product
      const productMediaData = await db
        .select({
          id: productMedia.id,
          url: productMedia.blob_url,
          alt: productMedia.alt,
          sort: productMedia.sort,
        })
        .from(productMedia)
        .where(eq(productMedia.product_id, id))
        .orderBy(productMedia.sort);

      // Get product options for this product
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
        .where(eq(productOptions.product_id, id))
        .orderBy(productOptions.sort_order, productOptionValues.sort_order);

      // Group options
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
              price_adjustment: row.value_price_adjustment,
              is_default: row.value_is_default,
              is_sold_out: row.value_is_sold_out,
              sort_order: row.value_sort_order,
            });
          }
        }
      });

      // If no options found in new system, check for legacy variants with options
      let options = Array.from(optionsMap.values()).sort(
        (a, b) => a.sort_order - b.sort_order
      );

      if (options.length === 0) {
        // Check for legacy product crystals and convert to unified options
        const crystalsData = await db
          .select()
          .from(productCrystals)
          .where(eq(productCrystals.product_id, id))
          .orderBy(productCrystals.sort_order);

        // Convert crystals to unified options
        if (crystalsData.length > 0) {
          options.push({
            id: "legacy-crystal",
            name: "Crystal",
            display_name: "Select Crystal",
            sort_order: 0,
            values: crystalsData.map((crystal) => ({
              id: crystal.id,
              name: crystal.name,
              price_adjustment: crystal.price_adjustment,
              is_default: crystal.is_default,
              is_sold_out: !crystal.is_available,
              sort_order: crystal.sort_order,
            })),
          });
        }
      }

      return res.status(200).json({
        product: {
          ...product[0],
          tags: productTagsData.map((tag) => ({
            id: tag.tag_id,
            name: tag.tag_name,
          })),
          media: productMediaData,
          options: options,
        },
      });
    } catch (error) {
      console.error("Get product error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  if (req.method === "PUT") {
    // Update product
    try {
      const {
        title,
        slug,
        description,
        image,
        base_price,
        status,
        tags,
        options,
        media,
      } = req.body;

      if (!title || !slug || !description) {
        return res.status(400).json({
          error: "Title, slug, and description are required",
        });
      }

      // Check if product exists
      const existingProduct = await db
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);

      if (existingProduct.length === 0) {
        return res.status(404).json({
          error: "Product not found",
        });
      }

      // Check if slug is being changed and if new slug already exists
      if (slug !== existingProduct[0].slug) {
        const slugExists = await db
          .select()
          .from(products)
          .where(eq(products.slug, slug))
          .limit(1);

        if (slugExists.length > 0) {
          return res.status(409).json({
            error: "Product with this slug already exists",
          });
        }
      }

      // Update product
      const updatedProduct = await db
        .update(products)
        .set({
          title,
          slug,
          description,
          image: image || null,
          base_price: base_price || null,
          status: status || "draft",
          updated_at: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

      // Update tags
      // First, remove existing tags
      await db.delete(productTags).where(eq(productTags.product_id, id));

      // Then add new tags
      if (tags && tags.length > 0) {
        const tagInserts = tags.map((tagId: string) => ({
          product_id: id,
          tag_id: tagId,
        }));

        await db.insert(productTags).values(tagInserts);
      }

      // Handle product options
      if (options && Array.isArray(options)) {
        // First, remove existing product options and their related data
        const existingOptions = await db
          .select({ id: productOptions.id })
          .from(productOptions)
          .where(eq(productOptions.product_id, id));

        // Delete product option values
        for (const option of existingOptions) {
          await db
            .delete(productOptionValues)
            .where(eq(productOptionValues.option_id, option.id));
        }

        // Delete product options
        await db
          .delete(productOptions)
          .where(eq(productOptions.product_id, id));

        // Create new product options
        for (let optionIndex = 0; optionIndex < options.length; optionIndex++) {
          const option = options[optionIndex];

          if (
            !option.name ||
            !option.display_name ||
            !option.values ||
            option.values.length === 0
          ) {
            continue;
          }

          // Create the product option
          const newProductOption = await db
            .insert(productOptions)
            .values({
              product_id: id,
              name: option.name,
              display_name: option.display_name,
              sort_order: optionIndex,
            })
            .returning();

          // Create option values
          for (
            let valueIndex = 0;
            valueIndex < option.values.length;
            valueIndex++
          ) {
            const value = option.values[valueIndex];

            if (!value.name) continue;

            await db.insert(productOptionValues).values({
              option_id: newProductOption[0].id,
              name: value.name,
              price_adjustment: parseFloat(
                value.price_adjustment || "0"
              ).toString(),
              is_default: value.is_default || false,
              is_sold_out: value.is_sold_out || false,
              sort_order: valueIndex,
            });
          }
        }

        // Ensure product has price and inventory records
        const existingPrice = await db
          .select()
          .from(prices)
          .where(eq(prices.product_id, id))
          .limit(1);

        if (existingPrice.length === 0) {
          await db.insert(prices).values({
            product_id: id,
            currency: "USD",
            amount: base_price || "0",
          });
        }

        const existingInventory = await db
          .select()
          .from(inventory)
          .where(eq(inventory.product_id, id))
          .limit(1);

        if (existingInventory.length === 0) {
          await db.insert(inventory).values({
            product_id: id,
            quantity_available: 10,
            quantity_reserved: 0,
          });
        }
      }

      // Handle media updates
      if (media && Array.isArray(media)) {
        // Delete existing media
        await db.delete(productMedia).where(eq(productMedia.product_id, id));

        // Insert new media
        if (media.length > 0) {
          const mediaInserts = media.map((mediaItem: any, index: number) => ({
            product_id: id,
            blob_url: mediaItem.url,
            alt: mediaItem.alt || "Product image",
            sort: index,
          }));

          await db.insert(productMedia).values(mediaInserts);
        }
      }

      return res.status(200).json({
        message: "Product updated successfully",
        product: {
          id: updatedProduct[0].id,
          slug: updatedProduct[0].slug,
          title: updatedProduct[0].title,
          description: updatedProduct[0].description,
          image: updatedProduct[0].image,
          status: updatedProduct[0].status,
        },
      });
    } catch (error) {
      console.error("Update product error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  if (req.method === "DELETE") {
    // Delete product
    try {
      // Check if product exists
      const existingProduct = await db
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);

      if (existingProduct.length === 0) {
        return res.status(404).json({
          error: "Product not found",
        });
      }

      // Delete product (cascade will handle related records)
      await db.delete(products).where(eq(products.id, id));

      return res.status(200).json({
        message: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Delete product error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withAdminProtection(handler);
