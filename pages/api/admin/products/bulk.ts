import { db } from "@/lib/db";
import { inventory, products, productTags } from "@/lib/db/schema";
import { AuthenticatedUser } from "@/lib/role-middleware";
import { withAdminRequest } from "@/lib/security/request-wrapper";
import { eq, inArray } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user?: AuthenticatedUser
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { operation, productIds, data } = req.body;

    if (!operation || !productIds || !Array.isArray(productIds)) {
      return res.status(400).json({
        error: "Operation and productIds array are required",
      });
    }

    if (productIds.length === 0) {
      return res.status(400).json({
        error: "At least one product must be selected",
      });
    }

    let result;

    switch (operation) {
      case "update_status":
        if (!data?.status) {
          return res.status(400).json({ error: "Status is required" });
        }
        result = await db
          .update(products)
          .set({ status: data.status, updated_at: new Date() })
          .where(inArray(products.id, productIds))
          .returning();
        break;

      case "update_stock":
        if (typeof data?.quantity !== "number") {
          return res.status(400).json({ error: "Quantity is required" });
        }
        // For each product, update or insert inventory
        for (const productId of productIds) {
          await db
            .insert(inventory)
            .values({
              product_id: productId,
              quantity_available: data.quantity,
              quantity_reserved: 0,
              updated_at: new Date(),
            })
            .onConflictDoUpdate({
              target: inventory.product_id,
              set: {
                quantity_available: data.quantity,
                updated_at: new Date(),
              },
            });
        }
        result = { updated: productIds.length };
        break;

      case "adjust_stock":
        if (typeof data?.adjustment !== "number") {
          return res.status(400).json({ error: "Adjustment is required" });
        }
        // Get current inventory for all products
        const currentInventory = await db
          .select()
          .from(inventory)
          .where(inArray(inventory.product_id, productIds));

        const inventoryMap = new Map(
          currentInventory.map((inv) => [inv.product_id, inv])
        );

        // Update each product's stock
        for (const productId of productIds) {
          const current = inventoryMap.get(productId);
          const newQuantity = Math.max(
            0,
            (current?.quantity_available || 0) + data.adjustment
          );

          await db
            .insert(inventory)
            .values({
              product_id: productId,
              quantity_available: newQuantity,
              quantity_reserved: current?.quantity_reserved || 0,
              updated_at: new Date(),
            })
            .onConflictDoUpdate({
              target: inventory.product_id,
              set: {
                quantity_available: newQuantity,
                updated_at: new Date(),
              },
            });
        }
        result = { updated: productIds.length };
        break;

      case "add_tags":
        if (!data?.tagIds || !Array.isArray(data.tagIds)) {
          return res.status(400).json({ error: "Tag IDs are required" });
        }
        // Add tags to all selected products
        const tagInserts = productIds.flatMap((productId) =>
          data.tagIds.map((tagId: string) => ({
            product_id: productId,
            tag_id: tagId,
          }))
        );
        // Use insert ignore to avoid duplicates
        await db.insert(productTags).values(tagInserts).onConflictDoNothing();
        result = { updated: productIds.length };
        break;

      case "remove_tags":
        if (!data?.tagIds || !Array.isArray(data.tagIds)) {
          return res.status(400).json({ error: "Tag IDs are required" });
        }
        // Remove tags from all selected products
        await db
          .delete(productTags)
          .where(
            inArray(productTags.product_id, productIds) &&
              inArray(productTags.tag_id, data.tagIds)
          );
        result = { updated: productIds.length };
        break;

      case "update_price":
        if (typeof data?.basePrice !== "number") {
          return res.status(400).json({ error: "Base price is required" });
        }
        result = await db
          .update(products)
          .set({
            base_price: data.basePrice.toString(),
            updated_at: new Date(),
          })
          .where(inArray(products.id, productIds))
          .returning();
        break;

      case "adjust_price":
        if (typeof data?.adjustment !== "number") {
          return res.status(400).json({
            error: "Price adjustment is required",
          });
        }
        // Get current products
        const currentProducts = await db
          .select()
          .from(products)
          .where(inArray(products.id, productIds));

        for (const product of currentProducts) {
          const currentPrice = parseFloat(product.base_price || "0");
          const newPrice = Math.max(0, currentPrice + data.adjustment);

          await db
            .update(products)
            .set({
              base_price: newPrice.toFixed(2),
              updated_at: new Date(),
            })
            .where(eq(products.id, product.id));
        }
        result = { updated: productIds.length };
        break;

      case "delete":
        // Delete products (cascade will handle related data)
        result = await db
          .delete(products)
          .where(inArray(products.id, productIds))
          .returning();
        break;

      default:
        return res.status(400).json({ error: "Invalid operation" });
    }

    return res.status(200).json({
      message: `Bulk operation '${operation}' completed successfully`,
      result,
    });
  } catch (error) {
    console.error("Bulk operation error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}

export default withAdminRequest(handler as any, "bulk_product_operations");
