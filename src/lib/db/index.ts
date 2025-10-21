import { config } from "dotenv";

// Load environment variables from .env.local, but don't override existing env vars
// This ensures Vercel production env vars take precedence
config({ path: ".env.local", override: false });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Get database URL from environment variables
// In Vercel production, environment variables take precedence over .env.local
// In local development, .env.local provides the DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL or POSTGRES_URL must be set in environment variables"
  );
}

console.log(
  "🔗 Database URL loaded:",
  DATABASE_URL.includes("localhost") ? "Local" : "Remote"
);

// Create PostgreSQL connection pool and Drizzle instance
export const pool = new Pool({
  connectionString: DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
