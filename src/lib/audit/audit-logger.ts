import { db } from "@/lib/db";
import { apiAuditLogs } from "@/lib/db/schema";
import { AuthenticatedUser } from "@/lib/security/auth-validation";
import { NextApiRequest, NextApiResponse } from "next";

export interface AuditLogData {
  request: NextApiRequest;
  response: NextApiResponse;
  user?: AuthenticatedUser;
  sessionId?: string;
  endpointType: string;
  action: string;
  startTime: number;
  error?: {
    type: string;
    message: string;
  };
}

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== "object") {
    return body;
  }

  const sensitiveFields = [
    "password",
    "confirmPassword",
    "oldPassword",
    "newPassword",
    "cvv",
    "cardNumber",
    "expiryDate",
    "cardToken",
    "paymentIntentId",
    "clientSecret",
    "secret",
    "token",
    "apiKey",
  ];

  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  }

  // Redact nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitizeRequestBody(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Extract IP address from request
 */
function getIpAddress(req: NextApiRequest): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  const realIp = req.headers["x-real-ip"];

  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
  }

  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp.split(",")[0];
  }

  return req.socket?.remoteAddress || null;
}

/**
 * Log API call to audit trail
 */
export async function logApiCall(data: AuditLogData): Promise<void> {
  try {
    const {
      request,
      response,
      user,
      sessionId,
      endpointType,
      action,
      startTime,
      error,
    } = data;

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Get response status (default to 500 if not set)
    const statusCode = response.statusCode || 500;

    // Calculate request size
    const requestBody = request.body ? JSON.stringify(request.body) : "";
    const requestSize = Buffer.byteLength(
      requestBody + JSON.stringify(request.query || {})
    );

    // Sanitize request body
    const sanitizedBody = request.body
      ? sanitizeRequestBody(request.body)
      : null;

    // Prepare audit log entry
    const auditLog = {
      userId: user?.id || null,
      userEmail: user?.email || null,
      userRole: user?.role || null,
      sessionId: sessionId || null,

      requestMethod: request.method || "UNKNOWN",
      requestPath: request.url?.split("?")[0] || "",
      requestQuery: request.query || null,
      requestBody: sanitizedBody,
      requestSize,

      responseStatus: statusCode,
      responseTimeMs: responseTime,
      responseSize: response.getHeader("content-length")
        ? parseInt(response.getHeader("content-length") as string, 10)
        : null,

      ipAddress: getIpAddress(request),
      userAgent: request.headers["user-agent"] || null,
      referer: request.headers["referer"] || null,

      endpointType,
      action,
      errorType: error?.type || null,
      errorMessage: error?.message || null,

      metadata: {
        headers: {
          accept: request.headers["accept"],
          "content-type": request.headers["content-type"],
        },
      },
    };

    // Insert audit log asynchronously (don't block request)
    // Use fire-and-forget pattern to avoid blocking the response
    db.insert(apiAuditLogs)
      .values(auditLog)
      .catch((error) => {
        // Silently fail - don't log errors to console as this would spam logs
        // Audit logging failures should not affect the user experience
      });
  } catch (error) {
    // Don't fail the request if audit logging fails
    // This catch is for the try block above, not the database insert
  }
}

/**
 * Create audit middleware wrapper
 */
export function withAuditLog(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    user?: AuthenticatedUser
  ) => Promise<any>,
  options: {
    endpointType: string;
    action: string;
  }
) {
  return async function (req: NextApiRequest, res: NextApiResponse) {
    const startTime = Date.now();
    const sessionId = (req.headers["x-session-id"] as string) || undefined;

    // Get user if authenticated
    let user: AuthenticatedUser | undefined;
    try {
      const { requireAuth } = await import("@/lib/security/auth-validation");
      user = await requireAuth(req);
    } catch {
      // Not authenticated, continue
    }

    // Capture original res.json to intercept response
    const originalJson = res.json.bind(res);
    let responseBody: any = null;

    res.json = function (body: any) {
      responseBody = body;
      return originalJson(body);
    };

    // Wrap handler execution to catch errors
    let error: { type: string; message: string } | undefined;

    try {
      await handler(req, res, user);
    } catch (err: any) {
      error = {
        type: err.name || "Error",
        message: err.message || "Unknown error",
      };
      throw err;
    } finally {
      // Log audit trail asynchronously - fire and forget
      // Don't await this to avoid blocking the response
      logApiCall({
        request: req,
        response: res,
        user,
        sessionId,
        endpointType: options.endpointType,
        action: options.action,
        startTime,
        error,
      }).catch(() => {
        // Silent failure - audit logging should never affect user experience
      });
    }
  };
}
