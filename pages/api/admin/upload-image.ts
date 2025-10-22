import { generateImageKey, uploadImageVariants } from "@/lib/r2";
import { withSecureAdmin } from "@/lib/security/security-middleware";
import formidable from "formidable";
import fs from "fs";
import { NextApiRequest, NextApiResponse } from "next";
import os from "os";
import sharp from "sharp";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: "10mb",
  },
};

async function handler(req: NextApiRequest, res: NextApiResponse, user: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Use /tmp directory for Vercel serverless environment
    const uploadDir = process.env.VERCEL ? "/tmp" : os.tmpdir();

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        return mimetype?.startsWith("image/") || false;
      },
      keepExtensions: true,
      uploadDir,
    });

    const [fields, files] = await form.parse(req);

    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    const productSlug = Array.isArray(fields.productSlug)
      ? fields.productSlug[0]
      : fields.productSlug;

    if (!file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    if (!productSlug) {
      return res.status(400).json({ error: "Product slug is required" });
    }

    // Generate unique key for the image
    const imageKey = generateImageKey(
      productSlug,
      file.originalFilename || "image.jpg"
    );

    // Read file buffer
    const fileBuffer = fs.readFileSync(file.filepath);

    // Generate thumbnail using Sharp
    const thumbnailBuffer = await sharp(fileBuffer)
      .resize(300, 300, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Upload both variants to R2
    const result = await uploadImageVariants(
      fileBuffer,
      thumbnailBuffer,
      imageKey,
      file.mimetype || "image/jpeg"
    );

    // Clean up temporary file if it exists
    try {
      if (file.filepath && fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
    } catch (cleanupError) {
      console.warn("Failed to cleanup temp file:", cleanupError);
    }

    return res.status(200).json({
      success: true,
      url: result.full.url,
      thumbnailUrl: result.thumbnail.url,
      imageKey,
    });
  } catch (error) {
    console.error("Image upload error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack"
    );
    return res.status(500).json({
      error: "Failed to upload image",
      details: error instanceof Error ? error.message : String(error),
      isVercel: !!process.env.VERCEL,
    });
  }
}

export default withSecureAdmin(handler);
