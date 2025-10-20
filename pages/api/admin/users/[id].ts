import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { AuthenticatedUser, withAdminProtection } from "@/lib/role-middleware";
import { eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: AuthenticatedUser
) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({
      error: "User ID is required",
    });
  }

  if (req.method === "GET") {
    // Get specific user
    try {
      const targetUser = await db
        .select({
          id: customers.id,
          email: customers.email,
          name: customers.name,
          role: customers.role,
          email_verified: customers.email_verified,
          created_at: customers.created_at,
        })
        .from(customers)
        .where(eq(customers.id, id))
        .limit(1);

      if (targetUser.length === 0) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      return res.status(200).json({
        user: {
          ...targetUser[0],
          email_verified: targetUser[0].email_verified ? true : false,
        },
      });
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  if (req.method === "PUT") {
    // Update user
    try {
      const { email, name, role } = req.body;

      // Validate role if provided
      const validRoles = ["admin", "user"];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({
          error: "Invalid role. Must be 'admin' or 'user'",
        });
      }

      // Check if user exists
      const existingUser = await db
        .select()
        .from(customers)
        .where(eq(customers.id, id))
        .limit(1);

      if (existingUser.length === 0) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      // Prevent root users from being modified
      if (existingUser[0].role === "root") {
        return res.status(403).json({
          error: "Cannot modify root users",
        });
      }

      // Update user
      const updateData: any = {};
      if (email) updateData.email = email;
      if (name) updateData.name = name;
      if (role) updateData.role = role;

      const updatedUser = await db
        .update(customers)
        .set(updateData)
        .where(eq(customers.id, id))
        .returning();

      return res.status(200).json({
        message: "User updated successfully",
        user: {
          id: updatedUser[0].id,
          email: updatedUser[0].email,
          name: updatedUser[0].name,
          role: updatedUser[0].role,
        },
      });
    } catch (error) {
      console.error("Update user error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  if (req.method === "DELETE") {
    // Delete user
    try {
      // Check if user exists
      const existingUser = await db
        .select()
        .from(customers)
        .where(eq(customers.id, id))
        .limit(1);

      if (existingUser.length === 0) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      // Prevent root users from being deleted
      if (existingUser[0].role === "root") {
        return res.status(403).json({
          error: "Cannot delete root users",
        });
      }

      // Prevent self-deletion
      if (existingUser[0].id === user.id) {
        return res.status(403).json({
          error: "Cannot delete your own account",
        });
      }

      // Delete user
      await db.delete(customers).where(eq(customers.id, id));

      return res.status(200).json({
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Delete user error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withAdminProtection(handler);
