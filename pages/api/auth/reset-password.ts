import { resetPassword, verifyPasswordResetToken } from "@/lib/password-reset";
import { withAuthRequest } from "@/lib/security/request-wrapper";
import { passwordSchema } from "@/lib/validations";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: "Token and password are required",
      });
    }

    // Validate password
    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      return res.status(400).json({
        error: "Password validation failed",
        details: passwordValidation.error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    // Verify token first
    const tokenResult = await verifyPasswordResetToken(token);
    if (!tokenResult.success) {
      return res.status(400).json({
        error: tokenResult.error,
      });
    }

    // Reset password
    const resetResult = await resetPassword(token, password);
    if (!resetResult.success) {
      return res.status(400).json({
        error: resetResult.error,
      });
    }

    return res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAuthRequest(handler, "reset_password");
