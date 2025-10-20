import { db } from "@/lib/db";
import { productMedia, products } from "@/lib/db/schema";
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
    // Get all media for a product
    try {
      const media = await db
        .select()
        .from(productMedia)
        .where(eq(productMedia.product_id, id))
        .orderBy(productMedia.sort);

      return res.status(200).json({
        media,
      });
    } catch (error) {
      console.error("Get media error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  if (req.method === "POST") {
    // Add new media to a product
    try {
      const { url, alt } = req.body;

      if (!url || !alt) {
        return res.status(400).json({
          error: "URL and alt text are required",
        });
      }

      // Check if product exists
      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);

      if (product.length === 0) {
        return res.status(404).json({
          error: "Product not found",
        });
      }

      // Get the highest sort order for this product
      const existingMedia = await db
        .select()
        .from(productMedia)
        .where(eq(productMedia.product_id, id))
        .orderBy(productMedia.sort);

      const nextSort =
        existingMedia.length > 0
          ? existingMedia[existingMedia.length - 1].sort + 1
          : 0;

      // Add new media
      const newMedia = await db
        .insert(productMedia)
        .values({
          product_id: id,
          blob_url: url,
          alt: alt,
          sort: nextSort,
        })
        .returning();

      return res.status(201).json({
        message: "Media added successfully",
        media: newMedia[0],
      });
    } catch (error) {
      console.error("Add media error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withAdminProtection(handler);
