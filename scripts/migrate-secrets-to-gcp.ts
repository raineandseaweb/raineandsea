import { config } from "dotenv";
import {
  createSecret,
  getSecret,
  listSecrets,
  testSecretManagerConnection,
} from "../src/lib/encryption/gcp-secrets";

config({ path: ".env.local" });

// Secrets to migrate to GCP Secret Manager
const SECRETS_TO_MIGRATE = [
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

async function migrateSecretsToGCP() {
  try {
    console.log("🔐 Migrating secrets to GCP Secret Manager");
    console.log("==========================================");

    // Test Secret Manager connection
    console.log("\n1. Testing Secret Manager connection...");
    const connectionTest = await testSecretManagerConnection();
    if (!connectionTest.success) {
      throw new Error(
        `Secret Manager connection failed: ${connectionTest.error}`
      );
    }
    console.log("✅ Secret Manager connection successful");

    // List existing secrets
    console.log("\n2. Checking existing secrets...");
    const existingSecrets = await listSecrets();
    if (!existingSecrets.success) {
      throw new Error(`Failed to list secrets: ${existingSecrets.error}`);
    }
    console.log(`Found ${existingSecrets.secrets.length} existing secrets`);

    // Check which secrets need to be created
    const secretsToCreate = SECRETS_TO_MIGRATE.filter(
      (secretName) => !existingSecrets.secrets.includes(secretName)
    );

    if (secretsToCreate.length === 0) {
      console.log("✅ All secrets already exist in GCP Secret Manager");
      return;
    }

    console.log(`\n3. Creating ${secretsToCreate.length} new secrets...`);

    // Create missing secrets
    for (const secretName of secretsToCreate) {
      const secretValue = process.env[secretName];

      if (!secretValue) {
        console.log(`⚠️  Skipping ${secretName} - not found in environment`);
        continue;
      }

      try {
        const result = await createSecret(secretName, secretValue);
        if (result.success) {
          console.log(`✅ Created secret: ${secretName}`);
        } else {
          console.error(
            `❌ Failed to create secret ${secretName}:`,
            result.error
          );
        }
      } catch (error) {
        console.error(`❌ Error creating secret ${secretName}:`, error);
      }
    }

    // Verify secrets were created
    console.log("\n4. Verifying created secrets...");
    const updatedSecrets = await listSecrets();
    if (updatedSecrets.success) {
      const nowExisting = SECRETS_TO_MIGRATE.filter((secretName) =>
        updatedSecrets.secrets.includes(secretName)
      );
      console.log(
        `✅ ${nowExisting.length}/${SECRETS_TO_MIGRATE.length} secrets now exist in GCP`
      );

      // Test reading a few secrets
      console.log("\n5. Testing secret retrieval...");
      for (const secretName of nowExisting.slice(0, 3)) {
        const result = await getSecret(secretName);
        if (result.success) {
          console.log(`✅ Successfully retrieved: ${secretName}`);
        } else {
          console.error(`❌ Failed to retrieve ${secretName}:`, result.error);
        }
      }
    }

    console.log("\n🎉 Secret migration completed!");
    console.log("\nNext steps:");
    console.log("1. Update your application to use GCP Secret Manager");
    console.log("2. Remove secrets from .env.local (keep GCP config vars)");
    console.log("3. Test application with GCP secrets");
    console.log("4. Update deployment configuration");
  } catch (error) {
    console.error("❌ Secret migration failed:", error);
    process.exit(1);
  }
}

// Add command line argument to run migration
if (process.argv.includes("--dry-run")) {
  console.log("🔍 Dry run mode - testing Secret Manager connection only");
  testSecretManagerConnection()
    .then((result) => {
      if (result.success) {
        console.log(
          "✅ Secret Manager connection successful - ready for migration"
        );
        console.log("\nSecrets that will be migrated:");
        SECRETS_TO_MIGRATE.forEach((secret) => {
          const hasValue = !!process.env[secret];
          console.log(
            `  ${hasValue ? "✅" : "⚠️ "} ${secret} ${
              hasValue ? "(has value)" : "(missing)"
            }`
          );
        });
      } else {
        console.error("❌ Secret Manager connection failed:", result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Secret Manager test failed:", error);
      process.exit(1);
    });
} else {
  migrateSecretsToGCP();
}
