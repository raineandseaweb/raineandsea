import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { verifyEmailToken } from "@/lib/email-verification";
import { getSecretAsync } from "@/lib/encryption/async-secrets";
import { withAuthRequest } from "@/lib/security/request-wrapper";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: "Verification token is required",
      });
    }

    const result = await verifyEmailToken(token);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
      });
    }

    // Get the verified user
    const user = await db
      .select()
      .from(customers)
      .where(eq(customers.email, result.email!))
      .limit(1);

    if (user.length === 0) {
      return res.status(400).json({
        error: "User not found after verification",
      });
    }

    // Load JWT_SECRET from GCP Secret Manager
    const JWT_SECRET = await getSecretAsync("JWT_SECRET");

    if (!JWT_SECRET) {
      console.error("JWT_SECRET not configured in GCP Secret Manager");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Generate JWT token for immediate login
    const jwtToken = jwt.sign(
      {
        id: user[0].id,
        email: user[0].email,
        name: user[0].name,
        role: user[0].role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set HTTP-only cookie for immediate login
    res.setHeader(
      "Set-Cookie",
      `auth-token=${jwtToken}; HttpOnly; Path=/; Max-Age=${
        7 * 24 * 60 * 60
      }; SameSite=Strict`
    );

    return res.status(200).json({
      message: "Email verified successfully. You are now logged in.",
      user: {
        id: user[0].id,
        email: user[0].email,
        name: user[0].name || undefined,
        role: user[0].role,
      },
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}

export default withAuthRequest(handler, "verify_email");
