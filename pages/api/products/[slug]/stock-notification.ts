import { db } from "@/lib/db";
import { products, stockNotifications } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    // Check subscription status
    try {
      const { slug } = req.query;
      const { email } = req.query;

      if (!slug || typeof slug !== "string") {
        return res.status(400).json({ error: "Product slug is required" });
      }

      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      // Find the product by slug
      const productResult = await db
        .select()
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1);

      if (productResult.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      const product = productResult[0];

      // Check if notification exists for this email and product
      const existingNotification = await db
        .select()
        .from(stockNotifications)
        .where(
          and(
            eq(stockNotifications.product_id, product.id),
            eq(stockNotifications.email, (email as string).toLowerCase().trim())
          )
        )
        .limit(1);

      if (existingNotification.length > 0) {
        // Treat already-notified users as unsubscribed for UI purposes
        if (existingNotification[0].is_notified) {
          return res.status(200).json({ subscribed: false, notified: true });
        }
        return res.status(200).json({
          subscribed: true,
          notified: false,
        });
      }

      return res.status(200).json({
        subscribed: false,
        notified: false,
      });
    } catch (error) {
      console.error("Stock notification check error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { slug } = req.query;
    const { email } = req.body;

    if (!slug || typeof slug !== "string") {
      return res.status(400).json({ error: "Product slug is required" });
    }

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Find the product by slug
    const productResult = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (productResult.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = productResult[0];

    // Check if notification already exists for this email and product
    const normalizedEmail = email.toLowerCase().trim();

    const existingNotification = await db
      .select()
      .from(stockNotifications)
      .where(
        and(
          eq(stockNotifications.product_id, product.id),
          eq(stockNotifications.email, normalizedEmail)
        )
      )
      .limit(1);

    if (existingNotification.length > 0) {
      // If already notified, allow re-subscribe by resetting flags
      if (existingNotification[0].is_notified) {
        await db
          .update(stockNotifications)
          .set({
            is_notified: false,
            notified_at: null,
            created_at: new Date(),
          })
          .where(eq(stockNotifications.id, existingNotification[0].id));

        return res.status(201).json({
          message: "Successfully signed up for stock notifications",
        });
      }

      // If not notified yet, return idempotent success
      return res.status(200).json({
        message: "You're already signed up for stock notifications",
      });
    }

    // Create new stock notification
    await db.insert(stockNotifications).values({
      product_id: product.id,
      email: normalizedEmail,
      is_notified: false,
    });

    return res.status(201).json({
      message: "Successfully signed up for stock notifications",
    });
  } catch (error) {
    console.error("Stock notification signup error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
