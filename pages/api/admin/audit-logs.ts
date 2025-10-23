import { db } from "@/lib/db";
import { apiAuditLogs } from "@/lib/db/schema";
import { withAdminRequest } from "@/lib/security/request-wrapper";
import { and, count, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      page = "1",
      limit = "50",
      userId,
      userEmail,
      userRole,
      endpointType,
      action,
      requestMethod,
      responseStatus,
      errorType,
      startDate,
      endDate,
      search,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    const conditions = [];

    if (userId) {
      conditions.push(eq(apiAuditLogs.userId, userId as string));
    }

    if (userEmail) {
      conditions.push(ilike(apiAuditLogs.userEmail, `%${userEmail}%`));
    }

    if (userRole) {
      conditions.push(eq(apiAuditLogs.userRole, userRole as string));
    }

    if (endpointType) {
      conditions.push(eq(apiAuditLogs.endpointType, endpointType as string));
    }

    if (action) {
      conditions.push(ilike(apiAuditLogs.action, `%${action}%`));
    }

    if (requestMethod) {
      conditions.push(eq(apiAuditLogs.requestMethod, requestMethod as string));
    }

    if (responseStatus) {
      const statusNum = parseInt(responseStatus as string, 10);
      conditions.push(eq(apiAuditLogs.responseStatus, statusNum));
    }

    if (errorType) {
      conditions.push(eq(apiAuditLogs.errorType, errorType as string));
    }

    if (startDate) {
      conditions.push(
        gte(apiAuditLogs.createdAt, new Date(startDate as string))
      );
    }

    if (endDate) {
      conditions.push(lte(apiAuditLogs.createdAt, new Date(endDate as string)));
    }

    if (search) {
      const searchStr = search as string;
      const searchConditions = [];

      // Check if search term is an email (contains @)
      if (searchStr.includes("@")) {
        searchConditions.push(ilike(apiAuditLogs.userEmail, `%${searchStr}%`));
      } else {
        // If not an email, search other fields
        searchConditions.push(
          ilike(apiAuditLogs.requestPath, `%${searchStr}%`)
        );
        searchConditions.push(ilike(apiAuditLogs.action, `%${searchStr}%`));
      }

      // Check if search term is a UUID (try exact match for user ID)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(searchStr)) {
        searchConditions.push(eq(apiAuditLogs.userId, searchStr));
      }

      // Check if search term is a number (could be status code)
      const searchNum = parseInt(searchStr, 10);
      if (!isNaN(searchNum)) {
        searchConditions.push(eq(apiAuditLogs.responseStatus, searchNum));
      }

      conditions.push(or(...searchConditions));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count: totalCount }] = await db
      .select({ count: count() })
      .from(apiAuditLogs)
      .where(whereClause);

    // Get paginated results
    const logs = await db
      .select()
      .from(apiAuditLogs)
      .where(whereClause)
      .orderBy(desc(apiAuditLogs.createdAt))
      .limit(limitNum)
      .offset(offset);

    // Get statistics
    const stats = await db
      .select({
        totalRequests: count(),
        avgResponseTime: sql<number>`AVG(${apiAuditLogs.responseTimeMs})`,
        errorCount: sql<number>`COUNT(*) FILTER (WHERE ${apiAuditLogs.errorType} IS NOT NULL OR ${apiAuditLogs.errorMessage} IS NOT NULL OR ${apiAuditLogs.responseStatus} >= 400)`,
      })
      .from(apiAuditLogs)
      .where(whereClause);

    return res.status(200).json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      stats: stats[0],
    });
  } catch (error) {
    console.error("Audit logs API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAdminRequest(handler, "admin_view_audit_logs");
