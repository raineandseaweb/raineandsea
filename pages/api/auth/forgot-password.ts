import { sendPasswordResetEmail } from "@/lib/email";
import { createPasswordResetToken } from "@/lib/password-reset";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    const result = await createPasswordResetToken(email);

    if (result.success && result.token) {
      // Get user info for email
      const { db } = await import("@/lib/db");
      const { customers } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      const user = await db
        .select()
        .from(customers)
        .where(eq(customers.email, email))
        .limit(1);

      const userName = user.length > 0 ? user[0].name : undefined;

      // Send password reset email
      await sendPasswordResetEmail(email, result.token, userName || undefined);
    }

    // Always return success to prevent email enumeration
    return res.status(200).json({
      message:
        "If an account with that email exists, a password reset link has been sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
