import { getMultipleSecrets, getSecret } from "./gcp-secrets";

// Cache for secrets to avoid repeated API calls
const secretCache = new Map<string, string>();

// Secrets that should be loaded from GCP Secret Manager
const GCP_SECRETS = [
  // Database
  "DATABASE_URL",
  "POSTGRES_URL",
  
  // Redis / KV
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  
  // Blob Storage (Vercel / R2)
  "BLOB_READ_WRITE_TOKEN",
  "CLOUDFLARE_ACCESS_KEY_ID",
  "CLOUDFLARE_SECRET_ACCESS_KEY",
  "CLOUDFLARE_R2_API_TOKEN",
  
  // Stripe
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  
  // Algolia
  "ALGOLIA_ADMIN_API_KEY",
  
  // Email (Resend / Gmail)
  "RESEND_API_KEY",
  "SMTP_USER",
  "SMTP_PASS",
  "GMAIL_PASSWORD",
  "FROM_EMAIL",
  
  // Auth
  "NEXTAUTH_SECRET",
  "JWT_SECRET",
  "CSRF_SECRET",
  "ROOT_SECRET",
  
  // Tax & Shipping
  "TAXJAR_API_KEY",
  "SHIPPO_API_KEY",
  
  // Cloudflare (if not public)
  "CLOUDFLARE_ACCOUNT_ID",
  
  // Google Cloud
  "GCP_SERVICE_ACCOUNT_KEY_PATH",
];

/**
 * Load a single secret from GCP Secret Manager
 * @param secretName - Name of the secret
 * @param useCache - Whether to use cached value (default: true)
 * @returns Promise with secret value
 */
export async function loadSecret(
  secretName: string,
  useCache: boolean = true
): Promise<string> {
  // Check cache first
  if (useCache && secretCache.has(secretName)) {
    return secretCache.get(secretName)!;
  }

  // Load from GCP Secret Manager
  const result = await getSecret(secretName);

  if (result.success) {
    // Cache the result
    if (useCache) {
      secretCache.set(secretName, result.value);
    }
    return result.value;
  } else {
    console.error(`Failed to load secret ${secretName}:`, result.error);
    // Fallback to environment variable
    return process.env[secretName] || "";
  }
}

/**
 * Load all GCP secrets at once
 * @param useCache - Whether to use cached values (default: true)
 * @returns Promise with map of secret names to values
 */
export async function loadAllSecrets(
  useCache: boolean = true
): Promise<Record<string, string>> {
  const secrets: Record<string, string> = {};

  // Load all secrets in parallel
  const secretResults = await getMultipleSecrets(GCP_SECRETS);

  for (const secretName of GCP_SECRETS) {
    const value = secretResults[secretName];

    if (value) {
      secrets[secretName] = value;
      // Cache the result
      if (useCache) {
        secretCache.set(secretName, value);
      }
    } else {
      // Fallback to environment variable
      const envValue = process.env[secretName] || "";
      secrets[secretName] = envValue;
      console.warn(
        `Secret ${secretName} not found in GCP, using environment variable`
      );
    }
  }

  return secrets;
}

/**
 * Get environment variable with GCP Secret Manager fallback
 * @param key - Environment variable key
 * @returns Promise with environment variable value
 */
export async function getEnvVar(key: string): Promise<string> {
  // Check if it's a GCP secret
  if (GCP_SECRETS.includes(key)) {
    return await loadSecret(key);
  }

  // Return regular environment variable
  return process.env[key] || "";
}

/**
 * Initialize environment by loading all GCP secrets
 * Call this at application startup
 */
export async function initializeEnvironment(): Promise<void> {
  try {
    console.log("🔐 Loading secrets from GCP Secret Manager...");
    const secrets = await loadAllSecrets();

    const loadedCount = Object.values(secrets).filter((value) => value).length;
    console.log(
      `✅ Loaded ${loadedCount}/${GCP_SECRETS.length} secrets from GCP`
    );

    // Set environment variables for compatibility
    for (const [key, value] of Object.entries(secrets)) {
      if (value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    console.error("❌ Failed to initialize environment:", error);
    console.log("Falling back to environment variables");
  }
}

/**
 * Clear the secret cache (useful for testing or key rotation)
 */
export function clearSecretCache(): void {
  secretCache.clear();
}

/**
 * Check if a secret is loaded from GCP
 * @param secretName - Name of the secret
 * @returns boolean indicating if secret is from GCP
 */
export function isSecretFromGCP(secretName: string): boolean {
  return secretCache.has(secretName);
}

/**
 * Get all loaded secrets (for debugging)
 * @returns Map of secret names to values
 */
export function getLoadedSecrets(): Map<string, string> {
  return new Map(secretCache);
}
