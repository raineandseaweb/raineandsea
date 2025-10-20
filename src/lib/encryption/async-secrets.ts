import { loadSecret } from "./env-loader";

// Cache for secrets to avoid repeated API calls
const secretCache = new Map<string, string>();

/**
 * Load a secret from GCP Secret Manager with caching
 * @param secretName - Name of the secret
 * @returns Promise with secret value
 */
export async function getSecretAsync(secretName: string): Promise<string> {
  // Check cache first
  if (secretCache.has(secretName)) {
    return secretCache.get(secretName)!;
  }

  try {
    const value = await loadSecret(secretName);
    secretCache.set(secretName, value);
    return value;
  } catch (error) {
    console.warn(`Failed to load secret ${secretName} from GCP:`, error);
    // Fallback to environment variable
    const envValue = process.env[secretName] || "";
    secretCache.set(secretName, envValue);
    return envValue;
  }
}

/**
 * Load multiple secrets from GCP Secret Manager
 * @param secretNames - Array of secret names
 * @returns Promise with map of secret names to values
 */
export async function getSecretsAsync(
  secretNames: string[]
): Promise<Record<string, string>> {
  const secrets: Record<string, string> = {};

  // Load all secrets in parallel
  const promises = secretNames.map(async (name) => {
    const value = await getSecretAsync(name);
    return { name, value };
  });

  const results = await Promise.all(promises);

  for (const { name, value } of results) {
    secrets[name] = value;
  }

  return secrets;
}

/**
 * Initialize secrets at application startup
 * This should be called early in the application lifecycle
 */
export async function initializeSecrets(): Promise<void> {
  const secretsToLoad = [
    "DATABASE_URL",
    "POSTGRES_URL",
    "JWT_SECRET",
    "NEXTAUTH_SECRET",
    "CSRF_SECRET",
    "ROOT_SECRET",
    "SMTP_USER",
    "SMTP_PASS",
    "GMAIL_PASSWORD",
    "FROM_EMAIL",
    "CLOUDFLARE_ACCESS_KEY_ID",
    "CLOUDFLARE_SECRET_ACCESS_KEY",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_R2_API_TOKEN",
  ];

  console.log("🔐 Initializing secrets from GCP Secret Manager...");

  try {
    await getSecretsAsync(secretsToLoad);
    console.log("✅ Secrets initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize secrets:", error);
    throw error;
  }
}
