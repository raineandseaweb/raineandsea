import { eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";
import { verifyTokenAsync } from "./auth-custom";
import { db } from "./db";
import { customers } from "./db/schema";

export type UserRole = "root" | "admin" | "user";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

export function withRoleProtection(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    user: AuthenticatedUser
  ) => Promise<void>,
  requiredRoles: UserRole[] = ["admin", "root"]
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Get auth token from cookie
      const authToken = req.cookies["auth-token"];

      if (!authToken) {
        return res.status(401).json({
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        });
      }

      // Verify token (returns user payload or null)
      const tokenResult = await verifyTokenAsync(authToken);

      if (!tokenResult) {
        return res.status(401).json({
          error: "Invalid authentication token",
          code: "INVALID_TOKEN",
        });
      }

      // Get user from database
      const user = await db
        .select({
          id: customers.id,
          email: customers.email,
          name: customers.name,
          role: customers.role,
          email_verified: customers.email_verified,
        })
        .from(customers)
        .where(eq(customers.id, tokenResult.id))
        .limit(1);

      if (user.length === 0) {
        return res.status(401).json({
          error: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      const userData = user[0];

      // Check if user has required role
      if (!requiredRoles.includes(userData.role as UserRole)) {
        return res.status(403).json({
          error: "Insufficient permissions",
          code: "INSUFFICIENT_PERMISSIONS",
          required: requiredRoles,
          current: userData.role,
        });
      }

      // Check if email is verified (except for root users)
      if (userData.role !== "root" && !userData.email_verified) {
        return res.status(403).json({
          error: "Email verification required",
          code: "EMAIL_NOT_VERIFIED",
        });
      }

      // Call the original handler with authenticated user
      const authenticatedUser: AuthenticatedUser = {
        id: userData.id,
        email: userData.email,
        name: userData.name || undefined,
        role: userData.role as UserRole,
      };

      return handler(req, res, authenticatedUser);
    } catch (error) {
      console.error("Role protection error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  };
}

export function withAdminProtection(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    user: AuthenticatedUser
  ) => Promise<void>
) {
  return withRoleProtection(handler, ["admin", "root"]);
}

export function withRootProtection(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    user: AuthenticatedUser
  ) => Promise<void>
) {
  return withRoleProtection(handler, ["root"]);
}
