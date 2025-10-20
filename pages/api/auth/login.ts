import { authenticateUser } from "@/lib/auth-custom";
import { loginSchema } from "@/lib/validations";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;

    // Validate input using Zod schema
    const validationResult = loginSchema.safeParse({ email, password });

    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    const { email: validatedEmail, password: validatedPassword } =
      validationResult.data;

    const result = await authenticateUser(validatedEmail, validatedPassword);

    if (!result.success) {
      return res.status(401).json({
        error: result.error,
      });
    }

    // Set HTTP-only cookie
    res.setHeader(
      "Set-Cookie",
      `auth-token=${result.token}; HttpOnly; Path=/; Max-Age=${
        7 * 24 * 60 * 60
      }; SameSite=Strict`
    );

    return res.status(200).json({
      message: "Login successful",
      user: result.user,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
