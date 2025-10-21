import { NextApiRequest, NextApiResponse } from "next";
import { AuthenticatedUser, requireAuth } from "./auth-validation";
import {
  sanitizeCheckoutData,
  validateSanitizedData,
} from "./data-sanitization";
import {
  ErrorType,
  sendErrorResponse,
  withErrorHandling,
} from "./error-handling";
import { validateAndSanitizeCheckoutData } from "./input-validation";
import { withRateLimit } from "./rate-limiting";

/**
 * Security middleware for checkout endpoint
 */
export async function secureCheckoutMiddleware(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ user: AuthenticatedUser; data: unknown }> {
  console.log("Secure checkout middleware - Request cookies:", req.cookies);
  console.log("Secure checkout middleware - Request body:", req.body);

  // 1. Rate limiting
  try {
    withRateLimit(req, "CHECKOUT");
  } catch (rateLimitError) {
    console.error("Rate limit error:", rateLimitError);
    sendErrorResponse(
      res,
      (rateLimitError as Error).message,
      ErrorType.RATE_LIMIT_ERROR,
      429
    );
    throw rateLimitError;
  }

  // 2. Authentication
  let user: AuthenticatedUser;
  try {
    user = await requireAuth(req);
    console.log("Authentication successful, user:", user);
  } catch (error) {
    console.error("Authentication error:", error);
    sendErrorResponse(
      res,
      (error as Error).message,
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
    throw error;
  }

  // 3. Data sanitization
  let sanitizedData;
  try {
    sanitizedData = sanitizeCheckoutData(req.body);
    console.log("Data sanitization successful:", sanitizedData);
  } catch (error) {
    console.error("Data sanitization error:", error);
    sendErrorResponse(
      res,
      "Invalid request data",
      ErrorType.VALIDATION_ERROR,
      400
    );
    throw error;
  }

  // 4. Validate sanitized data
  if (!validateSanitizedData(sanitizedData)) {
    console.error("Sanitized data validation failed");
    sendErrorResponse(
      res,
      "Invalid request data",
      ErrorType.VALIDATION_ERROR,
      400
    );
    throw new Error("Invalid sanitized data");
  }

  // 5. Input validation
  let validatedData;
  try {
    validatedData = validateAndSanitizeCheckoutData(sanitizedData);
    console.log("Input validation successful:", validatedData);
  } catch (error) {
    console.error("Input validation error:", error);
    sendErrorResponse(
      res,
      (error as Error).message,
      ErrorType.VALIDATION_ERROR,
      400
    );
    throw error;
  }

  return { user, data: validatedData };
}

/**
 * Security middleware for general API endpoints
 */
export async function secureApiMiddleware(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ user?: AuthenticatedUser }> {
  // 1. Rate limiting
  try {
    withRateLimit(req, "API");
  } catch (error) {
    sendErrorResponse(
      res,
      (error as Error).message,
      ErrorType.RATE_LIMIT_ERROR,
      429
    );
    throw error;
  }

  // 2. Optional authentication
  let user: AuthenticatedUser | undefined;
  try {
    user = await requireAuth(req);
  } catch (error) {
    // Authentication is optional for some endpoints
    user = undefined;
  }

  return { user };
}

/**
 * Security middleware for authentication endpoints
 */
export async function secureAuthMiddleware(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // 1. Rate limiting
  try {
    withRateLimit(req, "AUTH");
  } catch (error) {
    sendErrorResponse(
      res,
      (error as Error).message,
      ErrorType.RATE_LIMIT_ERROR,
      429
    );
    throw error;
  }
}

/**
 * Security middleware for admin endpoints
 */
export async function secureAdminMiddleware(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ user: AuthenticatedUser }> {
  // 1. Rate limiting
  try {
    withRateLimit(req, "API");
  } catch (error) {
    sendErrorResponse(
      res,
      (error as Error).message,
      ErrorType.RATE_LIMIT_ERROR,
      429
    );
    throw error;
  }

  // 2. Authentication
  let user: AuthenticatedUser;
  try {
    user = await requireAuth(req);
  } catch (error) {
    sendErrorResponse(
      res,
      (error as Error).message,
      ErrorType.AUTHENTICATION_ERROR,
      401
    );
    throw error;
  }

  // 3. Authorization check
  if (user.role !== "admin" && user.role !== "root") {
    sendErrorResponse(
      res,
      "Admin access required",
      ErrorType.AUTHORIZATION_ERROR,
      403
    );
    throw new Error("Admin access required");
  }

  return { user };
}

/**
 * Wrapper for secure checkout handler
 */
export function withSecureCheckout(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    user: AuthenticatedUser,
    data: unknown
  ) => Promise<void>
) {
  return withErrorHandling(
    async (req: NextApiRequest, res: NextApiResponse) => {
      const { user, data } = await secureCheckoutMiddleware(req, res);
      await handler(req, res, user, data);
    }
  );
}

/**
 * Wrapper for secure API handler
 */
export function withSecureApi(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    user?: AuthenticatedUser
  ) => Promise<void>
) {
  return withErrorHandling(
    async (req: NextApiRequest, res: NextApiResponse) => {
      const { user } = await secureApiMiddleware(req, res);
      await handler(req, res, user);
    }
  );
}

/**
 * Wrapper for secure auth handler
 */
export function withSecureAuth(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return withErrorHandling(
    async (req: NextApiRequest, res: NextApiResponse) => {
      await secureAuthMiddleware(req, res);
      await handler(req, res);
    }
  );
}

/**
 * Wrapper for secure admin handler
 */
export function withSecureAdmin(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    user: AuthenticatedUser
  ) => Promise<void>
) {
  return withErrorHandling(
    async (req: NextApiRequest, res: NextApiResponse) => {
      const { user } = await secureAdminMiddleware(req, res);
      await handler(req, res, user);
    }
  );
}

/**
 * Utility function to check if user has required role
 */
export function hasRole(
  user: AuthenticatedUser,
  requiredRole: string
): boolean {
  const roleHierarchy = {
    user: 1,
    admin: 2,
    root: 3,
  };

  const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
  const requiredLevel =
    roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Utility function to check if user can access resource
 */
export function canAccessResource(
  user: AuthenticatedUser,
  resourceOwnerId: string
): boolean {
  // Users can access their own resources
  if (user.id === resourceOwnerId) {
    return true;
  }

  // Admins and root can access any resource
  if (user.role === "admin" || user.role === "root") {
    return true;
  }

  return false;
}
