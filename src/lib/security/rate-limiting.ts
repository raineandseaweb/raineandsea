import { NextApiRequest } from "next";

// In-memory rate limiter (in production, use Redis or similar)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request is within rate limit
   */
  checkLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (entry.count >= maxRequests) {
      return false; // Rate limit exceeded
    }

    // Increment counter
    entry.count++;
    return true;
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string, maxRequests: number): number {
    const entry = this.limits.get(key);
    if (!entry) {
      return maxRequests;
    }
    return Math.max(0, maxRequests - entry.count);
  }

  /**
   * Get reset time for a key
   */
  getResetTime(key: string): number | null {
    const entry = this.limits.get(key);
    return entry ? entry.resetTime : null;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.limits.clear();
  }

  /**
   * Cleanup on process exit
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// Rate limit configurations
export const RATE_LIMITS = {
  // Checkout: 5 orders per hour per user
  CHECKOUT: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // General API: 100 requests per hour per IP
  API: {
    maxRequests: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Auth endpoints: 10 attempts per hour per IP
  AUTH: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
} as const;

/**
 * Get client identifier for rate limiting
 */
function getClientId(req: NextApiRequest, userId?: string): string {
  // Use user ID if available, otherwise use IP address
  if (userId) {
    return `user:${userId}`;
  }

  // Get IP address from various headers
  const forwarded = req.headers["x-forwarded-for"];
  const realIp = req.headers["x-real-ip"];
  const remoteAddress = req.connection?.remoteAddress;

  let ip = "unknown";
  if (forwarded) {
    ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
  } else if (realIp) {
    ip = Array.isArray(realIp) ? realIp[0] : realIp;
  } else if (remoteAddress) {
    ip = remoteAddress;
  }

  return `ip:${ip}`;
}

/**
 * Check rate limit for checkout requests
 */
export function checkCheckoutRateLimit(
  req: NextApiRequest,
  userId?: string
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  error?: string;
} {
  const clientId = getClientId(req, userId);
  const limit = RATE_LIMITS.CHECKOUT;

  const allowed = rateLimiter.checkLimit(
    clientId,
    limit.maxRequests,
    limit.windowMs
  );
  const remaining = rateLimiter.getRemaining(clientId, limit.maxRequests);
  const resetTime =
    rateLimiter.getResetTime(clientId) || Date.now() + limit.windowMs;

  if (!allowed) {
    const resetDate = new Date(resetTime);
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      error: `Too many orders. You can place ${
        limit.maxRequests
      } orders per hour. Try again after ${resetDate.toLocaleTimeString()}.`,
    };
  }

  return {
    allowed: true,
    remaining,
    resetTime,
  };
}

/**
 * Check rate limit for general API requests
 */
export function checkApiRateLimit(
  req: NextApiRequest,
  userId?: string
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  error?: string;
} {
  const clientId = getClientId(req, userId);
  const limit = RATE_LIMITS.API;

  const allowed = rateLimiter.checkLimit(
    clientId,
    limit.maxRequests,
    limit.windowMs
  );
  const remaining = rateLimiter.getRemaining(clientId, limit.maxRequests);
  const resetTime =
    rateLimiter.getResetTime(clientId) || Date.now() + limit.windowMs;

  if (!allowed) {
    const resetDate = new Date(resetTime);
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      error: `Rate limit exceeded. You can make ${
        limit.maxRequests
      } requests per hour. Try again after ${resetDate.toLocaleTimeString()}.`,
    };
  }

  return {
    allowed: true,
    remaining,
    resetTime,
  };
}

/**
 * Check rate limit for authentication requests
 */
export function checkAuthRateLimit(req: NextApiRequest): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  error?: string;
} {
  const clientId = getClientId(req);
  const limit = RATE_LIMITS.AUTH;

  const allowed = rateLimiter.checkLimit(
    clientId,
    limit.maxRequests,
    limit.windowMs
  );
  const remaining = rateLimiter.getRemaining(clientId, limit.maxRequests);
  const resetTime =
    rateLimiter.getResetTime(clientId) || Date.now() + limit.windowMs;

  if (!allowed) {
    const resetDate = new Date(resetTime);
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      error: `Too many authentication attempts. You can try ${
        limit.maxRequests
      } times per hour. Try again after ${resetDate.toLocaleTimeString()}.`,
    };
  }

  return {
    allowed: true,
    remaining,
    resetTime,
  };
}

/**
 * Middleware function to check rate limits
 */
export function withRateLimit(
  req: NextApiRequest,
  limitType: keyof typeof RATE_LIMITS,
  userId?: string
): void {
  let result;

  switch (limitType) {
    case "CHECKOUT":
      result = checkCheckoutRateLimit(req, userId);
      break;
    case "API":
      result = checkApiRateLimit(req, userId);
      break;
    case "AUTH":
      result = checkAuthRateLimit(req);
      break;
    default:
      throw new Error(`Unknown rate limit type: ${limitType}`);
  }

  if (!result.allowed) {
    throw new Error(result.error);
  }
}

// Cleanup on process exit
process.on("SIGINT", () => {
  rateLimiter.destroy();
});

process.on("SIGTERM", () => {
  rateLimiter.destroy();
});

export { rateLimiter };
