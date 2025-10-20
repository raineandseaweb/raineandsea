import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { AuthenticatedUser, withAdminProtection } from "@/lib/role-middleware";
import { desc, eq, inArray } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: AuthenticatedUser
) {
  if (req.method === "GET") {
    // Get all users
    try {
      const users = await db
        .select({
          id: customers.id,
          email: customers.email,
          name: customers.name,
          role: customers.role,
          email_verified: customers.email_verified,
          created_at: customers.created_at,
        })
        .from(customers)
        .orderBy(desc(customers.created_at));

      return res.status(200).json({
        users: users.map((u) => ({
          ...u,
          email_verified: u.email_verified ? true : false,
        })),
      });
    } catch (error) {
      console.error("Get users error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  if (req.method === "POST") {
    // Create new admin user
    try {
      const { email, name, password, role } = req.body;

      if (!email || !name || !password) {
        return res.status(400).json({
          error: "Email, name, and password are required",
        });
      }

      // Validate role
      const validRoles = ["admin", "user"];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({
          error: "Invalid role. Must be 'admin' or 'user'",
        });
      }

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(customers)
        .where(eq(customers.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(409).json({
          error: "User with this email already exists",
        });
      }

      // Hash password
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const newUser = await db
        .insert(customers)
        .values({
          email,
          name,
          password: hashedPassword,
          role: role || "user",
          email_verified: new Date(), // Admin-created users are auto-verified
        })
        .returning();

      return res.status(201).json({
        message: "User created successfully",
        user: {
          id: newUser[0].id,
          email: newUser[0].email,
          name: newUser[0].name,
          role: newUser[0].role,
        },
      });
    } catch (error) {
      console.error("Create user error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  if (req.method === "DELETE") {
    // Delete multiple users by IDs
    try {
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          error: "User IDs array is required",
        });
      }

      // Delete users (cascade will handle related records)
      const deletedUsers = await db
        .delete(customers)
        .where(inArray(customers.id, userIds))
        .returning();

      return res.status(200).json({
        message: `${deletedUsers.length} users deleted successfully`,
        deletedCount: deletedUsers.length,
      });
    } catch (error) {
      console.error("Delete users error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withAdminProtection(handler);
