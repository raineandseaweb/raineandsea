import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { AuthenticatedUser } from "@/lib/role-middleware";
import { withAdminRequest } from "@/lib/security/request-wrapper";
import { eq, inArray } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user?: AuthenticatedUser
) {
  if (req.method === "GET") {
    // Get all tags
    try {
      const allTags = await db
        .select({
          id: tags.id,
          name: tags.name,
        })
        .from(tags)
        .orderBy(tags.name);

      return res.status(200).json({
        tags: allTags,
      });
    } catch (error) {
      console.error("Get tags error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  if (req.method === "POST") {
    // Create new tag
    try {
      const { name } = req.body;

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({
          error: "Tag name is required",
        });
      }

      const tagName = name.trim();

      // Check if tag already exists
      const existingTag = await db
        .select()
        .from(tags)
        .where(eq(tags.name, tagName))
        .limit(1);

      if (existingTag.length > 0) {
        return res.status(409).json({
          error: "Tag with this name already exists",
        });
      }

      // Create tag
      const newTag = await db
        .insert(tags)
        .values({
          name: tagName,
        })
        .returning();

      return res.status(201).json({
        message: "Tag created successfully",
        tag: {
          id: newTag[0].id,
          name: newTag[0].name,
        },
      });
    } catch (error) {
      console.error("Create tag error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  if (req.method === "DELETE") {
    // Delete multiple tags by IDs
    try {
      const { tagIds } = req.body;

      if (!tagIds || !Array.isArray(tagIds) || tagIds.length === 0) {
        return res.status(400).json({
          error: "Tag IDs array is required",
        });
      }

      // Delete tags (cascade will handle related records)
      const deletedTags = await db
        .delete(tags)
        .where(inArray(tags.id, tagIds))
        .returning();

      return res.status(200).json({
        message: `${deletedTags.length} tags deleted successfully`,
        deletedCount: deletedTags.length,
      });
    } catch (error) {
      console.error("Delete tags error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withAdminRequest(handler as any, "manage_tags");
