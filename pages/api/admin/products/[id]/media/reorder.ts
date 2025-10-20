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
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({
      error: "Product ID is required",
    });
  }

  if (req.method === "PUT") {
    // Bulk reorder media
    try {
      const { mediaOrder } = req.body;

      if (!Array.isArray(mediaOrder)) {
        return res.status(400).json({
          error: "mediaOrder must be an array",
        });
      }

      // Update sort order for each media item
      for (let i = 0; i < mediaOrder.length; i++) {
        const mediaId = mediaOrder[i];
        await db
          .update(productMedia)
          .set({ sort: i })
          .where(eq(productMedia.id, mediaId));
      }

      return res.status(200).json({
        message: "Media reordered successfully",
      });
    } catch (error) {
      console.error("Bulk reorder media error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withAdminProtection(handler);
