import { db } from "@/lib/db";
import { productMedia } from "@/lib/db/schema";
import { AuthenticatedUser, withAdminProtection } from "@/lib/role-middleware";
import { eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: AuthenticatedUser
) {
  const { id, mediaId } = req.query;

  if (
    !id ||
    typeof id !== "string" ||
    !mediaId ||
    typeof mediaId !== "string"
  ) {
    return res.status(400).json({
      error: "Product ID and Media ID are required",
    });
  }

  if (req.method === "PUT") {
    // Reorder media
    try {
      const { direction } = req.body;

      if (!direction || (direction !== "up" && direction !== "down")) {
        return res.status(400).json({
          error: "Direction must be 'up' or 'down'",
        });
      }

      // Get current media
      const currentMedia = await db
        .select()
        .from(productMedia)
        .where(eq(productMedia.id, mediaId))
        .limit(1);

      if (currentMedia.length === 0) {
        return res.status(404).json({
          error: "Media not found",
        });
      }

      // Get all media for this product
      const allMedia = await db
        .select()
        .from(productMedia)
        .where(eq(productMedia.product_id, id))
        .orderBy(productMedia.sort);

      const currentIndex = allMedia.findIndex((m) => m.id === mediaId);

      if (currentIndex === -1) {
        return res.status(404).json({
          error: "Media not found",
        });
      }

      // Determine target index
      let targetIndex;
      if (direction === "up") {
        targetIndex = currentIndex - 1;
      } else {
        targetIndex = currentIndex + 1;
      }

      // Check bounds
      if (targetIndex < 0 || targetIndex >= allMedia.length) {
        return res.status(400).json({
          error: "Cannot move media in that direction",
        });
      }

      // Swap sort orders
      const currentSort = allMedia[currentIndex].sort;
      const targetSort = allMedia[targetIndex].sort;

      // Update both media items
      await db
        .update(productMedia)
        .set({ sort: targetSort })
        .where(eq(productMedia.id, mediaId));

      await db
        .update(productMedia)
        .set({ sort: currentSort })
        .where(eq(productMedia.id, allMedia[targetIndex].id));

      return res.status(200).json({
        message: "Media reordered successfully",
      });
    } catch (error) {
      console.error("Reorder media error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withAdminProtection(handler);
