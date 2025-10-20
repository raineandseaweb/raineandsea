/**
 * Simple in-memory cache for authentication verification
 * Reduces database hits for frequently accessed user data
 */

interface CachedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  cachedAt: number;
}

interface CachedToken {
  id: string;
  cachedAt: number;
}

// In-memory caches with TTL
const userCache = new Map<string, CachedUser>();
const tokenCache = new Map<string, CachedToken>();

// Cache TTL in milliseconds (5 minutes for users, 1 minute for tokens)
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const TOKEN_CACHE_TTL = 1 * 60 * 1000; // 1 minute

/**
 * Check if a cached item is still valid
 */
function isCacheValid<T extends { cachedAt: number }>(
  item: T | undefined,
  ttl: number
): boolean {
  if (!item) return false;
  return Date.now() - item.cachedAt < ttl;
}

/**
 * Cache user data
 */
export function cacheUser(
  token: string,
  user: Omit<CachedUser, "cachedAt">
): void {
  userCache.set(token, {
    ...user,
    cachedAt: Date.now(),
  });
}

/**
 * Get cached user data
 */
export function getCachedUser(token: string): CachedUser | null {
  const cached = userCache.get(token);
  if (isCacheValid(cached, USER_CACHE_TTL)) {
    return cached!;
  }

  // Remove expired cache entry
  if (cached) {
    userCache.delete(token);
  }

  return null;
}

/**
 * Cache token verification result
 */
export function cacheToken(token: string, userId: string): void {
  tokenCache.set(token, {
    id: userId,
    cachedAt: Date.now(),
  });
}

/**
 * Get cached token verification result
 */
export function getCachedToken(token: string): CachedToken | null {
  const cached = tokenCache.get(token);
  if (isCacheValid(cached, TOKEN_CACHE_TTL)) {
    return cached!;
  }

  // Remove expired cache entry
  if (cached) {
    tokenCache.delete(token);
  }

  return null;
}

/**
 * Invalidate user cache (call when user data changes)
 */
export function invalidateUserCache(token: string): void {
  userCache.delete(token);
}

/**
 * Invalidate token cache (call when token is invalidated)
 */
export function invalidateTokenCache(token: string): void {
  tokenCache.delete(token);
}

/**
 * Clear all caches (useful for testing or memory management)
 */
export function clearAllCaches(): void {
  userCache.clear();
  tokenCache.clear();
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  return {
    userCacheSize: userCache.size,
    tokenCacheSize: tokenCache.size,
    userCacheEntries: Array.from(userCache.keys()),
    tokenCacheEntries: Array.from(tokenCache.keys()),
  };
}

