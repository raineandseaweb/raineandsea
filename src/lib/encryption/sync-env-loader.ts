import { getSecret } from "./gcp-secrets";

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
 * Load a single secret from GCP Secret Manager synchronously
 * @param secretName - Name of the secret
 * @returns Secret value or empty string if not found
 */
export function loadSecretSync(secretName: string): string {
  // Check cache first
  if (secretCache.has(secretName)) {
    return secretCache.get(secretName)!;
  }

  // Check environment variables first (for development)
  const envValue = process.env[secretName];
  if (envValue) {
    secretCache.set(secretName, envValue);
    return envValue;
  }

  // Try to load from GCP Secret Manager synchronously
  try {
    // This is a hack to make it synchronous - we'll use a blocking approach
    let result: any = null;
    let error: any = null;

    getSecret(secretName)
      .then((res) => {
        result = res;
      })
      .catch((err) => {
        error = err;
      });

    // Wait for the result (this is not ideal but necessary for module initialization)
    const startTime = Date.now();
    while (result === null && error === null && Date.now() - startTime < 5000) {
      // Block until we get a result or timeout
    }

    if (result && result.success) {
      const value = result.value;
      secretCache.set(secretName, value);
      return value;
    } else {
      console.warn(
        `Secret ${secretName} not found in GCP, using environment variable`
      );
      const envValue = process.env[secretName] || "";
      secretCache.set(secretName, envValue);
      return envValue;
    }
  } catch (err) {
    console.warn(`Failed to load secret ${secretName} from GCP:`, err);
    const envValue = process.env[secretName] || "";
    secretCache.set(secretName, envValue);
    return envValue;
  }
}

/**
 * Load all GCP secrets synchronously
 * @returns Map of secret names to values
 */
export function loadAllSecretsSync(): Record<string, string> {
  const secrets: Record<string, string> = {};

  for (const secretName of GCP_SECRETS) {
    secrets[secretName] = loadSecretSync(secretName);
  }

  return secrets;
}
