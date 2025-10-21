import { NextApiResponse } from "next";

// Error types for different scenarios
export enum ErrorType {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
  NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
  CONFLICT_ERROR = "CONFLICT_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

// Generic error response interface
export interface ErrorResponse {
  success: false;
  error: string;
  type: ErrorType;
  code?: string;
  details?: Record<string, unknown>;
}

// Success response interface
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

// Union type for API responses
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Generic error handler that logs errors and returns safe responses
 */
export class SecureErrorHandler {
  /**
   * Handle validation errors
   */
  static handleValidationError(error: Error, res: NextApiResponse): void {
    console.error("Validation error:", error.message);
    res.status(400).json({
      success: false,
      error: "Invalid request data. Please check your input and try again.",
      type: ErrorType.VALIDATION_ERROR,
      code: "VALIDATION_FAILED",
    });
  }

  /**
   * Handle authentication errors
   */
  static handleAuthenticationError(error: Error, res: NextApiResponse): void {
    console.error("Authentication error:", error.message);
    res.status(401).json({
      success: false,
      error: "Authentication required. Please sign in and try again.",
      type: ErrorType.AUTHENTICATION_ERROR,
      code: "AUTH_REQUIRED",
    });
  }

  /**
   * Handle authorization errors
   */
  static handleAuthorizationError(error: Error, res: NextApiResponse): void {
    console.error("Authorization error:", error.message);
    res.status(403).json({
      success: false,
      error: "Access denied. You don't have permission to perform this action.",
      type: ErrorType.AUTHORIZATION_ERROR,
      code: "ACCESS_DENIED",
    });
  }

  /**
   * Handle rate limit errors
   */
  static handleRateLimitError(error: Error, res: NextApiResponse): void {
    console.error("Rate limit error:", error.message);
    res.status(429).json({
      success: false,
      error: error.message, // Rate limit messages are safe to expose
      type: ErrorType.RATE_LIMIT_ERROR,
      code: "RATE_LIMIT_EXCEEDED",
    });
  }

  /**
   * Handle not found errors
   */
  static handleNotFoundError(error: Error, res: NextApiResponse): void {
    console.error("Not found error:", error.message);
    res.status(404).json({
      success: false,
      error: "The requested resource was not found.",
      type: ErrorType.NOT_FOUND_ERROR,
      code: "NOT_FOUND",
    });
  }

  /**
   * Handle conflict errors (e.g., insufficient inventory)
   */
  static handleConflictError(error: Error, res: NextApiResponse): void {
    console.error("Conflict error:", error.message);
    res.status(409).json({
      success: false,
      error: error.message, // Conflict messages are usually safe to expose
      type: ErrorType.CONFLICT_ERROR,
      code: "CONFLICT",
    });
  }

  /**
   * Handle internal server errors
   */
  static handleInternalError(error: Error, res: NextApiResponse): void {
    console.error("Internal server error:", error);
    res.status(500).json({
      success: false,
      error: "An unexpected error occurred. Please try again later.",
      type: ErrorType.INTERNAL_ERROR,
      code: "INTERNAL_ERROR",
    });
  }

  /**
   * Generic error handler that determines the appropriate response
   */
  static handleError(error: Error, res: NextApiResponse): void {
    const message = error.message.toLowerCase();

    if (message.includes("validation") || message.includes("invalid")) {
      this.handleValidationError(error, res);
    } else if (
      message.includes("auth") ||
      message.includes("token") ||
      message.includes("unauthorized")
    ) {
      this.handleAuthenticationError(error, res);
    } else if (
      message.includes("forbidden") ||
      message.includes("permission")
    ) {
      this.handleAuthorizationError(error, res);
    } else if (message.includes("rate limit") || message.includes("too many")) {
      this.handleRateLimitError(error, res);
    } else if (
      message.includes("not found") ||
      message.includes("does not exist")
    ) {
      this.handleNotFoundError(error, res);
    } else if (
      message.includes("insufficient") ||
      message.includes("conflict")
    ) {
      this.handleConflictError(error, res);
    } else {
      this.handleInternalError(error, res);
    }
  }
}

/**
 * Wrapper function for API handlers with error handling
 */
export function withErrorHandling(
  handler: (req: any, res: NextApiResponse) => Promise<void>
) {
  return async (req: any, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      SecureErrorHandler.handleError(error as Error, res);
    }
  };
}

/**
 * Send success response
 */
export function sendSuccessResponse<T>(
  res: NextApiResponse,
  data: T,
  message?: string,
  statusCode: number = 200
): void {
  res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

/**
 * Send error response
 */
export function sendErrorResponse(
  res: NextApiResponse,
  error: string,
  type: ErrorType,
  statusCode: number = 400,
  code?: string,
  details?: Record<string, unknown>
): void {
  res.status(statusCode).json({
    success: false,
    error,
    type,
    code,
    details,
  });
}

/**
 * Log error for monitoring
 */
export function logError(
  error: Error,
  context: Record<string, unknown> = {}
): void {
  console.error("Error logged:", {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log security event
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, unknown> = {}
): void {
  console.warn("Security event:", {
    event,
    details,
    timestamp: new Date().toISOString(),
  });
}
