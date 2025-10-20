import { sendVerificationEmail } from "@/lib/email";
import { resendVerificationToken } from "@/lib/email-verification";
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

    const result = await resendVerificationToken(email);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
      });
    }

    // Get the new verification token and user info
    const { db } = await import("@/lib/db");
    const { customers } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    const user = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);

    if (user.length === 0) {
      return res.status(400).json({
        error: "User not found",
      });
    }

    const verificationToken = user[0].email_verification_token;
    if (!verificationToken) {
      return res.status(500).json({
        error: "Verification token not found",
      });
    }

    // Send verification email
    const emailResult = await sendVerificationEmail(
      email,
      verificationToken,
      user[0].name || undefined
    );

    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error);
      return res.status(500).json({
        error: "Failed to send verification email",
      });
    }

    return res.status(200).json({
      message: "Verification email sent successfully",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
