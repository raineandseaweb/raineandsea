import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

// Initialize Secret Manager client with environment-aware configuration
function createSecretManagerClient() {
  console.log("🔧 Initializing GCP Secret Manager client...");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("GCP_PROJECT_ID:", process.env.GCP_PROJECT_ID ? "✅ Set" : "❌ Missing");
  console.log("GCP_SERVICE_ACCOUNT_KEY:", process.env.GCP_SERVICE_ACCOUNT_KEY ? "✅ Set" : "❌ Missing");
  console.log("GCP_SERVICE_ACCOUNT_KEY_PATH:", process.env.GCP_SERVICE_ACCOUNT_KEY_PATH ? "✅ Set" : "❌ Missing");

  const config: any = {
    projectId: process.env.GCP_PROJECT_ID,
  };

  // For production (Vercel), use service account JSON from environment variable
  if (
    process.env.NODE_ENV === "production" &&
    process.env.GCP_SERVICE_ACCOUNT_KEY
  ) {
    console.log("🔧 Using production GCP credentials from environment variable");
    try {
      config.credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY);
      console.log("✅ Successfully parsed GCP service account credentials");
    } catch (error) {
      console.error("❌ Failed to parse GCP_SERVICE_ACCOUNT_KEY:", error);
      throw new Error("Invalid GCP_SERVICE_ACCOUNT_KEY format");
    }
  } else if (process.env.GCP_SERVICE_ACCOUNT_KEY_PATH) {
    // For local development, use file path
    console.log("🔧 Using local GCP credentials from file path");
    config.keyFilename = process.env.GCP_SERVICE_ACCOUNT_KEY_PATH;
  } else {
    console.error("❌ GCP service account configuration not found");
    console.error("Required: GCP_SERVICE_ACCOUNT_KEY_PATH (local) or GCP_SERVICE_ACCOUNT_KEY (production)");
    throw new Error(
      "GCP service account configuration not found. Set either GCP_SERVICE_ACCOUNT_KEY_PATH (local) or GCP_SERVICE_ACCOUNT_KEY (production)"
    );
  }

  return new SecretManagerServiceClient(config);
}

// Lazy initialization - don't create client at module load time
let secretClient: SecretManagerServiceClient | null = null;
let PROJECT_ID: string | null = null;

function getSecretClient(): SecretManagerServiceClient {
  if (!secretClient) {
    secretClient = createSecretManagerClient();
  }
  return secretClient;
}

function getProjectId(): string {
  if (!PROJECT_ID) {
    PROJECT_ID = process.env.GCP_PROJECT_ID!;
    if (!PROJECT_ID) {
      throw new Error("GCP_PROJECT_ID environment variable is required");
    }
  }
  return PROJECT_ID;
}

export interface SecretResult {
  value: string;
  success: boolean;
  error?: string;
}

/**
 * Get a secret from GCP Secret Manager
 * @param secretName - Name of the secret (without project path)
 * @param version - Secret version (defaults to 'latest')
 * @returns Promise with secret value or error
 */
export async function getSecret(
  secretName: string,
  version: string = "latest"
): Promise<SecretResult> {
  try {
    const client = getSecretClient();
    const projectId = getProjectId();
    const name = `projects/${projectId}/secrets/${secretName}/versions/${version}`;
    
    const [secret] = await client.accessSecretVersion({
      name: name,
    });

    const secretValue = secret.payload?.data?.toString();

    if (!secretValue) {
      return {
        value: "",
        success: false,
        error: "Secret value is empty",
      };
    }

    return {
      value: secretValue,
      success: true,
    };
  } catch (error) {
    console.error(`Error accessing secret ${secretName}:`, error);
    return {
      value: "",
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown secret access error",
    };
  }
}

/**
 * Create a new secret in GCP Secret Manager
 * @param secretName - Name of the secret
 * @param secretValue - Value to store
 * @returns Promise with creation result
 */
export async function createSecret(
  secretName: string,
  secretValue: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSecretClient();
    const projectId = getProjectId();
    // Create the secret
    const [secret] = await client.createSecret({
      parent: `projects/${projectId}`,
      secretId: secretName,
      secret: {
        replication: {
          automatic: {},
        },
      },
    });

    // Add the secret version
    await client.addSecretVersion({
      parent: secret.name!,
      payload: {
        data: Buffer.from(secretValue, "utf8"),
      },
    });

    return { success: true };
  } catch (error) {
    console.error(`Error creating secret ${secretName}:`, error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown secret creation error",
    };
  }
}

/**
 * Update an existing secret with a new version
 * @param secretName - Name of the secret
 * @param secretValue - New value to store
 * @returns Promise with update result
 */
export async function updateSecret(
  secretName: string,
  secretValue: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getSecretClient();
    const projectId = getProjectId();
    await client.addSecretVersion({
      parent: `projects/${projectId}/secrets/${secretName}`,
      payload: {
        data: Buffer.from(secretValue, "utf8"),
      },
    });

    return { success: true };
  } catch (error) {
    console.error(`Error updating secret ${secretName}:`, error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown secret update error",
    };
  }
}

/**
 * Delete a secret from GCP Secret Manager
 * @param secretName - Name of the secret to delete
 * @returns Promise with deletion result
 */
export async function deleteSecret(
  secretName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await secretClient.deleteSecret({
      name: `projects/${PROJECT_ID}/secrets/${secretName}`,
    });

    return { success: true };
  } catch (error) {
    console.error(`Error deleting secret ${secretName}:`, error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown secret deletion error",
    };
  }
}

/**
 * List all secrets in the project
 * @returns Promise with list of secret names
 */
export async function listSecrets(): Promise<{
  secrets: string[];
  success: boolean;
  error?: string;
}> {
  try {
    const [secrets] = await secretClient.listSecrets({
      parent: `projects/${PROJECT_ID}`,
    });

    const secretNames = secrets.map((secret) => {
      const name = secret.name!;
      return name.split("/").pop()!;
    });

    return {
      secrets: secretNames,
      success: true,
    };
  } catch (error) {
    console.error("Error listing secrets:", error);
    return {
      secrets: [],
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown list secrets error",
    };
  }
}

/**
 * Get multiple secrets at once
 * @param secretNames - Array of secret names
 * @returns Promise with map of secret names to values
 */
export async function getMultipleSecrets(
  secretNames: string[]
): Promise<Record<string, string>> {
  const secrets: Record<string, string> = {};

  const results = await Promise.all(
    secretNames.map(async (name) => {
      const result = await getSecret(name);
      return { name, result };
    })
  );

  for (const { name, result } of results) {
    if (result.success) {
      secrets[name] = result.value;
    } else {
      console.error(`Failed to get secret ${name}:`, result.error);
    }
  }

  return secrets;
}

/**
 * Test Secret Manager connection
 * @returns Promise with test result
 */
export async function testSecretManagerConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const result = await listSecrets();
    if (!result.success) {
      return {
        success: false,
        error: `Failed to list secrets: ${result.error}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown Secret Manager error",
    };
  }
}

// Export the client for advanced usage
export { secretClient };
