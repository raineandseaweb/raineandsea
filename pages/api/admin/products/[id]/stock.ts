import { db } from "@/lib/db";
import { inventory, products, stockNotifications } from "@/lib/db/schema";
import { sendStockNotificationEmail } from "@/lib/email";
import { withSecureAdmin } from "@/lib/security/security-middleware";
import { and, eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse, user: any) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    const { quantity_available } = req.body;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Product ID is required" });
    }

    if (typeof quantity_available !== "number" || quantity_available < 0) {
      return res.status(400).json({
        error: "Valid quantity_available number is required",
      });
    }

    // Verify product exists and get current inventory
    const productResult = await db
      .select()
      .from(products)
      .leftJoin(inventory, eq(inventory.product_id, products.id))
      .where(eq(products.id, id))
      .limit(1);

    if (productResult.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = productResult[0].products;
    const currentInventory = productResult[0].inventory;
    const previousStock = currentInventory?.quantity_available || 0;

    // Update or create inventory record
    let updatedInventory = await db
      .update(inventory)
      .set({
        quantity_available: quantity_available,
        updated_at: new Date(),
      })
      .where(eq(inventory.product_id, id))
      .returning();

    // If no inventory record exists, create one
    if (updatedInventory.length === 0) {
      updatedInventory = await db
        .insert(inventory)
        .values({
          product_id: id,
          quantity_available: quantity_available,
          quantity_reserved: 0,
          location_id: "default",
        })
        .returning();
    }

    // Send stock notifications if stock went from 0 to positive
    if (previousStock === 0 && quantity_available > 0) {
      try {
        // Get all pending stock notifications for this product
        const pendingNotifications = await db
          .select()
          .from(stockNotifications)
          .where(
            and(
              eq(stockNotifications.product_id, id),
              eq(stockNotifications.is_notified, false)
            )
          )
          .limit(100); // Limit to prevent overwhelming the email service

        // Send notifications to all pending subscribers
        const notificationPromises = pendingNotifications.map(
          async (notification) => {
            try {
              const emailResult = await sendStockNotificationEmail(
                notification.email,
                product.title,
                product.slug
              );

              if (emailResult.success) {
                // Mark as notified
                await db
                  .update(stockNotifications)
                  .set({ is_notified: true, notified_at: new Date() })
                  .where(eq(stockNotifications.id, notification.id));
              }

              return emailResult;
            } catch (error) {
              console.error(
                `Failed to send notification to ${notification.email}:`,
                error
              );
              return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
              };
            }
          }
        );

        const results = await Promise.all(notificationPromises);
        const successCount = results.filter((r) => r.success).length;
        console.log(
          `Sent ${successCount}/${pendingNotifications.length} stock notifications for product ${product.title}`
        );
      } catch (error) {
        console.error("Error sending stock notifications:", error);
        // Don't fail the stock update if notifications fail
      }
    }

    return res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: {
        product_id: id,
        quantity_available: quantity_available,
      },
    });
  } catch (error) {
    console.error("Stock update error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withSecureAdmin(handler);
