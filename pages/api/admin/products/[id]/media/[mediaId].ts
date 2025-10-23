import { db } from "@/lib/db";
import { productMedia } from "@/lib/db/schema";
import { AuthenticatedUser } from "@/lib/role-middleware";
import { withAdminRequest } from "@/lib/security/request-wrapper";
import { eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user?: AuthenticatedUser
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

  if (req.method === "DELETE") {
    // Delete media
    try {
      // Check if media exists
      const media = await db
        .select()
        .from(productMedia)
        .where(eq(productMedia.id, mediaId))
        .limit(1);

      if (media.length === 0) {
        return res.status(404).json({
          error: "Media not found",
        });
      }

      // Delete media
      await db.delete(productMedia).where(eq(productMedia.id, mediaId));

      return res.status(200).json({
        message: "Media deleted successfully",
      });
    } catch (error) {
      console.error("Delete media error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withAdminRequest(handler as any, "manage_product_media_item");
