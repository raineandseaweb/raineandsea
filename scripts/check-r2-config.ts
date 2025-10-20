import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

console.log("🔍 Checking R2 Configuration...");
console.log("Bucket Name:", process.env.CLOUDFLARE_R2_PRODUCTS_BUCKET);
console.log("Public URL Base:", process.env.CLOUDFLARE_PUBLIC_URL_BASE);
console.log("Account ID:", process.env.CLOUDFLARE_ACCOUNT_ID);
console.log(
  "Access Key ID:",
  process.env.CLOUDFLARE_ACCESS_KEY_ID
    ? "***" + process.env.CLOUDFLARE_ACCESS_KEY_ID.slice(-4)
    : "Not set"
);

// Test different possible bucket URLs
const bucketName = process.env.CLOUDFLARE_R2_PRODUCTS_BUCKET;
const publicUrlBase = process.env.CLOUDFLARE_PUBLIC_URL_BASE;

console.log("\n📋 Possible bucket URLs:");
if (bucketName) {
  console.log(`1. https://${bucketName}.r2.dev/`);
}
if (publicUrlBase) {
  console.log(`2. ${publicUrlBase}/`);
}
console.log("3. https://pub-388d6713083a716719486cb6810c1d35.r2.dev/");

console.log(
  "\n💡 The bucket name in your environment should match the domain you're trying to access."
);
console.log("If they don't match, that's why you're getting 401 errors.");
