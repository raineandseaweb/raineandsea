import { NextApiRequest, NextApiResponse } from "next";
import { getCSRFTokenFromRequest, verifyCSRFToken } from "./csrf";

export function withCSRFProtection(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Only protect state-changing methods
    const protectedMethods = ["POST", "PUT", "PATCH", "DELETE"];

    if (!protectedMethods.includes(req.method || "")) {
      return handler(req, res);
    }

    // Skip CSRF protection for certain endpoints
    const skipCSRF = [
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/logout",
      "/api/auth/verify-email",
      "/api/auth/resend-verification",
      "/api/auth/forgot-password",
      "/api/auth/reset-password",
      "/api/auth/verify-reset-token",
      "/api/csrf-token",
    ];

    if (skipCSRF.some((path) => req.url?.startsWith(path))) {
      return handler(req, res);
    }

    const token = getCSRFTokenFromRequest(req);

    if (!token) {
      return res.status(403).json({
        error: "CSRF token missing",
        code: "CSRF_TOKEN_MISSING",
      });
    }

    if (!verifyCSRFToken(token)) {
      return res.status(403).json({
        error: "Invalid CSRF token",
        code: "CSRF_TOKEN_INVALID",
      });
    }

    return handler(req, res);
  };
}
