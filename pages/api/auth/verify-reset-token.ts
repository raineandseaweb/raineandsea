import { verifyPasswordResetToken } from "@/lib/password-reset";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: "Token is required",
      });
    }

    const result = await verifyPasswordResetToken(token);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
      });
    }

    return res.status(200).json({
      message: "Token is valid",
      email: result.email,
    });
  } catch (error) {
    console.error("Verify reset token error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
