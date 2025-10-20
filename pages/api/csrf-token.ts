import { generateCSRFTokenWithSecret } from "@/lib/csrf";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = generateCSRFTokenWithSecret();

    // Set the token in a cookie for easy access
    res.setHeader(
      "Set-Cookie",
      `csrf-token=${token}; HttpOnly; Path=/; Max-Age=${
        60 * 60
      }; SameSite=Strict`
    );

    return res.status(200).json({ csrfToken: token });
  } catch (error) {
    console.error("CSRF token generation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
