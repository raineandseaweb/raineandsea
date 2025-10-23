import { cacheUser, getCachedToken, getCachedUser } from "@/lib/auth-cache";
import { verifyTokenAsync } from "@/lib/auth-custom";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { withAuthenticatedRequest } from "@/lib/security/request-wrapper";
import { eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = req.cookies["auth-token"];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Check cache first
    const cachedUser = getCachedUser(token);
    if (cachedUser) {
      return res.status(200).json({ user: cachedUser });
    }

    // Verify token (with token cache)
    const cachedToken = getCachedToken(token);
    let tokenResult;

    if (cachedToken) {
      tokenResult = { id: cachedToken.id };
    } else {
      tokenResult = await verifyTokenAsync(token);
      if (tokenResult) {
        // Cache the token verification result
        const { cacheToken } = await import("@/lib/auth-cache");
        cacheToken(token, tokenResult.id);
      }
    }

    if (!tokenResult) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Get user from database to include role
    const user = await db
      .select({
        id: customers.id,
        email: customers.email,
        name: customers.name,
        role: customers.role,
      })
      .from(customers)
      .where(eq(customers.id, tokenResult.id))
      .limit(1);

    if (user.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    // Cache the user data
    cacheUser(token, {
      ...user[0],
      name: user[0].name || "",
    });

    return res.status(200).json({ user: user[0] });
  } catch (error) {
    console.error("Auth check error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default withAuthenticatedRequest(handler, "get_user_profile");
