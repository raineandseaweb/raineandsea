import { deleteImageVariants, extractImageKeyFromUrl } from "@/lib/r2";
import { withSecureAdmin } from "@/lib/security/security-middleware";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse, user: any) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    const imageKey = extractImageKeyFromUrl(url);
    if (!imageKey) {
      return res.status(400).json({ error: "Invalid image URL" });
    }

    await deleteImageVariants(imageKey);

    return res.status(200).json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Image deletion error:", error);
    return res.status(500).json({ error: "Failed to delete image" });
  }
}

export default withSecureAdmin(handler);
