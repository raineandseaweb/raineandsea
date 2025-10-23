import { logApiCall } from "@/lib/audit/audit-logger";
import { NextApiRequest, NextApiResponse } from "next";
import { AuthenticatedUser } from "./auth-validation";
import { ErrorType, sendErrorResponse } from "./error-handling";

export interface RequestWrapperOptions {
  /**
   * Endpoint type for categorization (auth, checkout, api, admin, public)
   */
  endpointType: string;

  /**
   * Descriptive action name for audit logging
   */
  action: string;

  /**
   * Whether authentication is required
   */
  requireAuth?: boolean;

  /**
   * Required role if authentication is needed
   */
  requiredRole?: "user" | "admin" | "root";

  /**
   * Rate limit type
   */
  rateLimitType?: "API" | "AUTH" | "CHECKOUT";

  /**
   * Custom error handler
   */
  onError?: (error: Error, req: NextApiRequest, res: NextApiResponse) => void;
}

/**
 * General request wrapper that handles authentication, authorization,
 * rate limiting, error handling, and audit logging
 */
export function withRequest(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    user?: AuthenticatedUser
  ) => Promise<void>,
  options: RequestWrapperOptions
) {
  return async function (req: NextApiRequest, res: NextApiResponse) {
    const startTime = Date.now();
    const sessionId = (req.headers["x-session-id"] as string) || undefined;

    // Track state for audit logging
    let user: AuthenticatedUser | undefined;
    let error: { type: string; message: string } | undefined;

    try {
      // 1. Rate limiting (if specified)
      if (options.rateLimitType) {
        try {
          const { withRateLimit } = await import("./rate-limiting");
          withRateLimit(req, options.rateLimitType);
        } catch (rateLimitError) {
          error = {
            type: "RateLimitError",
            message: (rateLimitError as Error).message,
          };
          sendErrorResponse(
            res,
            (rateLimitError as Error).message,
            ErrorType.RATE_LIMIT_ERROR,
            429
          );
          throw rateLimitError;
        }
      }

      // 2. Authentication (if required)
      if (options.requireAuth) {
        try {
          const { requireAuth } = await import("./auth-validation");
          user = await requireAuth(req);
        } catch (authError) {
          error = {
            type: "AuthenticationError",
            message: (authError as Error).message,
          };
          sendErrorResponse(
            res,
            (authError as Error).message,
            ErrorType.AUTHENTICATION_ERROR,
            401
          );
          throw authError;
        }
      } else {
        // Try to get user if available, but don't require it
        try {
          const { requireAuth } = await import("./auth-validation");
          user = await requireAuth(req);
        } catch {
          // Not authenticated, continue
        }
      }

      // 3. Authorization (if required role specified)
      if (options.requiredRole && user) {
        const { hasRole } = await import("./security-middleware");
        if (!hasRole(user, options.requiredRole)) {
          error = {
            type: "AuthorizationError",
            message: `Required role: ${options.requiredRole}`,
          };
          sendErrorResponse(
            res,
            "Insufficient permissions",
            ErrorType.AUTHORIZATION_ERROR,
            403
          );
          throw new Error("Insufficient permissions");
        }
      }

      // 4. Execute handler
      await handler(req, res, user);
    } catch (err: any) {
      // Capture error for audit logging
      if (!error) {
        error = {
          type: err.name || "Error",
          message: err.message || "Unknown error",
        };
      }

      // Custom error handler if provided
      if (options.onError) {
        options.onError(err, req, res);
      } else {
        // Default error handling
        if (!res.headersSent) {
          res.status(500).json({
            error: "Internal server error",
            details: err.message || "Unknown error",
          });
        }
      }

      // Re-throw to let caller handle
      throw err;
    } finally {
      // 5. Audit logging (fire-and-forget, doesn't block response)
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

/**
 * Convenience wrapper for public endpoints (no auth required)
 */
export function withPublicRequest(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  action: string
) {
  return withRequest(
    async (req, res) => {
      await handler(req, res);
    },
    {
      endpointType: "public",
      action,
      requireAuth: false,
    }
  );
}

/**
 * Convenience wrapper for authenticated user endpoints
 */
export function withAuthenticatedRequest(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    user: AuthenticatedUser
  ) => Promise<void>,
  action: string
) {
  return withRequest(
    async (req, res, user) => {
      if (!user) {
        throw new Error("Authentication required");
      }
      await handler(req, res, user);
    },
    {
      endpointType: "api",
      action,
      requireAuth: true,
      rateLimitType: "API",
    }
  );
}

/**
 * Convenience wrapper for admin endpoints
 */
export function withAdminRequest(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    user: AuthenticatedUser
  ) => Promise<void>,
  action: string
) {
  return withRequest(
    async (req, res, user) => {
      if (!user) {
        throw new Error("Authentication required");
      }
      await handler(req, res, user);
    },
    {
      endpointType: "admin",
      action,
      requireAuth: true,
      requiredRole: "admin",
      rateLimitType: "API",
    }
  );
}

/**
 * Convenience wrapper for auth endpoints
 */
export function withAuthRequest(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  action: string
) {
  return withRequest(
    async (req, res) => {
      await handler(req, res);
    },
    {
      endpointType: "auth",
      action,
      requireAuth: false,
      rateLimitType: "AUTH",
    }
  );
}

/**
 * Convenience wrapper for checkout endpoints
 */
export function withCheckoutRequest(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    user?: AuthenticatedUser
  ) => Promise<void>,
  action: string
) {
  return withRequest(
    async (req, res, user) => {
      await handler(req, res, user);
    },
    {
      endpointType: "checkout",
      action,
      requireAuth: false, // Guest checkout allowed
      rateLimitType: "CHECKOUT",
    }
  );
}
