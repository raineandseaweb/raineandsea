import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

// Initialize Secret Manager client
const secretClient = new SecretManagerServiceClient({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_SERVICE_ACCOUNT_KEY_PATH,
});

const PROJECT_ID = process.env.GCP_PROJECT_ID!;

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
    const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/${version}`;
    
    const [secret] = await secretClient.accessSecretVersion({
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
      error: error instanceof Error ? error.message : "Unknown secret access error",
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
    // Create the secret
    const [secret] = await secretClient.createSecret({
      parent: `projects/${PROJECT_ID}`,
      secretId: secretName,
      secret: {
        replication: {
          automatic: {},
        },
      },
    });

    // Add the secret version
    await secretClient.addSecretVersion({
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
      error: error instanceof Error ? error.message : "Unknown secret creation error",
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
    await secretClient.addSecretVersion({
      parent: `projects/${PROJECT_ID}/secrets/${secretName}`,
      payload: {
        data: Buffer.from(secretValue, "utf8"),
      },
    });

    return { success: true };
  } catch (error) {
    console.error(`Error updating secret ${secretName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown secret update error",
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
      error: error instanceof Error ? error.message : "Unknown secret deletion error",
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
      error: error instanceof Error ? error.message : "Unknown list secrets error",
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
      error: error instanceof Error ? error.message : "Unknown Secret Manager error",
    };
  }
}

// Export the client for advanced usage
export { secretClient };
