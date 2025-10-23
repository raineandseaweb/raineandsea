import { invalidateTokenCache, invalidateUserCache } from "@/lib/auth-cache";
import { withAuthRequest } from "@/lib/security/request-wrapper";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Invalidate cache for the current token
  const token = req.cookies["auth-token"];
  if (token) {
    invalidateUserCache(token);
    invalidateTokenCache(token);
  }

  // Clear the auth cookie
  res.setHeader(
    "Set-Cookie",
    "auth-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict"
  );

  return res.status(200).json({
    message: "Logout successful",
  });
}

export default withAuthRequest(handler, "user_logout");
