import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { loadSecret } from "@/lib/encryption/env-loader";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  email_verified: boolean;
  exp: number;
  iat: number;
}

export interface AuthValidationResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Validates JWT token and verifies user exists and is verified
 */
export async function validateAuthToken(
  token: string
): Promise<AuthValidationResult> {
  try {
    if (!token) {
      return { success: false, error: "No token provided" };
    }

    // Load JWT secret from GCP Secret Manager
    const secret = await loadSecret("JWT_SECRET");

    if (!secret) {
      return { success: false, error: "JWT secret not configured" };
    }

    // Verify JWT token
    const decoded = jwt.verify(token, secret) as any;

    if (!decoded || !decoded.id || !decoded.email) {
      return { success: false, error: "Invalid token structure" };
    }

    // Check if token has expired
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return { success: false, error: "Token expired" };
    }

    // Verify user exists in database
    const user = await db
      .select({
        id: customers.id,
        email: customers.email,
        name: customers.name,
        role: customers.role,
        email_verified: customers.email_verified,
      })
      .from(customers)
      .where(eq(customers.id, decoded.id))
      .limit(1);

    if (user.length === 0) {
      return { success: false, error: "User not found" };
    }

    // Check if email is verified
    if (!user[0].email_verified) {
      return { success: false, error: "Email not verified" };
    }

    // Check if user role is valid
    if (!["user", "admin", "root"].includes(user[0].role)) {
      return { success: false, error: "Invalid user role" };
    }

    return {
      success: true,
      user: {
        id: user[0].id,
        email: user[0].email,
        name: user[0].name,
        role: user[0].role,
        email_verified: !!user[0].email_verified,
        exp: decoded.exp,
        iat: decoded.iat,
      },
    };
  } catch (error) {
    console.error("Auth validation error:", error);
    return { success: false, error: "Token validation failed" };
  }
}

/**
 * Extracts token from request cookies
 */
export function extractTokenFromRequest(req: any): string | null {
  const cookies = req.cookies;
  if (!cookies || !cookies["auth-token"]) {
    return null;
  }
  return cookies["auth-token"];
}

/**
 * Middleware function to validate authentication
 */
export async function requireAuth(req: any): Promise<AuthenticatedUser> {
  const token = extractTokenFromRequest(req);
  const result = await validateAuthToken(token);

  if (!result.success || !result.user) {
    throw new Error(result.error || "Authentication required");
  }

  return result.user;
}
