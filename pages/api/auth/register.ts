import { createUser } from "@/lib/auth-custom";
import { sendVerificationEmail } from "@/lib/email";
import { registerSchema } from "@/lib/validations";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, password } = req.body;

    // Validate input using Zod schema
    const validationResult = registerSchema.safeParse({
      name,
      email,
      password,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    const {
      name: validatedName,
      email: validatedEmail,
      password: validatedPassword,
    } = validationResult.data;

    const result = await createUser(
      validatedName,
      validatedEmail,
      validatedPassword
    );

    if (!result.success) {
      return res.status(409).json({
        error: result.error,
      });
    }

    // Don't set auth cookie - user needs to verify email first
    // Get verification token from database
    const { db } = await import("@/lib/db");
    const { customers } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    const user = await db
      .select()
      .from(customers)
      .where(eq(customers.email, validatedEmail))
      .limit(1);

    if (user.length === 0) {
      return res.status(500).json({
        error: "User created but not found",
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
      validatedEmail,
      verificationToken,
      validatedName
    );

    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error);
      // Still return success but warn about email issue
      return res.status(201).json({
        message:
          "User created successfully, but verification email failed to send. Please contact support.",
        user: result.user,
        requiresVerification: true,
        emailError: true,
      });
    }

    return res.status(201).json({
      message:
        "User created successfully. Please check your email to verify your account.",
      user: result.user,
      requiresVerification: true,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
