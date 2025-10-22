import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { AuthenticatedUser, withAdminProtection } from "@/lib/role-middleware";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: AuthenticatedUser
) {
  if (req.method === "GET") {
    // Get all users with advanced filtering
    try {
      const {
        search,
        role,
        emailVerified,
        sortBy = "created_at",
        sortOrder = "desc",
        page = "1",
        limit = "50",
      } = req.query;

      // Build where conditions
      const conditions = [];

      // Text search (ID, name, email)
      if (search && typeof search === "string") {
        const searchTerm = search.trim();
        // Check if search term looks like a UUID
        const isUUID =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            searchTerm
          );

        if (isUUID) {
          // Exact match for UUID
          conditions.push(eq(customers.id, searchTerm));
        } else {
          // Text search for name and email
          conditions.push(
            or(
              ilike(customers.name, `%${searchTerm}%`),
              ilike(customers.email, `%${searchTerm}%`)
            )
          );
        }
      }

      // Role filter
      if (role && typeof role === "string" && role !== "all") {
        conditions.push(eq(customers.role, role));
      }

      // Email verified filter
      if (emailVerified && typeof emailVerified === "string") {
        if (emailVerified === "verified") {
          conditions.push(sql`${customers.email_verified} IS NOT NULL`);
        } else if (emailVerified === "unverified") {
          conditions.push(sql`${customers.email_verified} IS NULL`);
        }
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Sorting
      let sortColumn;
      switch (sortBy) {
        case "name":
          sortColumn = customers.name;
          break;
        case "email":
          sortColumn = customers.email;
          break;
        case "role":
          sortColumn = customers.role;
          break;
        case "created_at":
        default:
          sortColumn = customers.created_at;
          break;
      }

      // Pagination
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      // Get total count for pagination
      let countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(customers)
        .$dynamic();

      if (whereClause) {
        countQuery = countQuery.where(whereClause);
      }

      const totalCountResult = await countQuery;
      const total = totalCountResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limitNum);

      // Get users with filters
      let query = db
        .select({
          id: customers.id,
          email: customers.email,
          name: customers.name,
          role: customers.role,
          email_verified: customers.email_verified,
          created_at: customers.created_at,
        })
        .from(customers)
        .$dynamic();

      if (whereClause) {
        query = query.where(whereClause);
      }

      // Apply sorting and pagination
      query =
        sortOrder === "asc"
          ? query.orderBy(asc(sortColumn))
          : query.orderBy(desc(sortColumn));

      query = query.limit(limitNum).offset(offset);

      const users = await query;

      return res.status(200).json({
        users: users.map((u) => ({
          ...u,
          email_verified: u.email_verified ? true : false,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
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
