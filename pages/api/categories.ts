import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { withPublicRequest } from "@/lib/security/request-wrapper";
import { asc } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const categoriesList = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        thumbnail: categories.thumbnail,
        parent_id: categories.parent_id,
        created_at: categories.created_at,
        updated_at: categories.updated_at,
      })
      .from(categories)
      .orderBy(asc(categories.name));

    return res.status(200).json({ data: categoriesList });
  } catch (error) {
    console.error("Categories API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withPublicRequest(handler, "get_categories");
