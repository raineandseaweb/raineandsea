import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { loadSecret } from "../encryption/env-loader";
import * as schema from "./schema";

// Resolve database URL from GCP Secret Manager only
const DATABASE_URL: string =
  (await loadSecret("DATABASE_URL")) ||
  (await loadSecret("POSTGRES_URL")) ||
  "";

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL or POSTGRES_URL must be set in GCP Secret Manager"
  );
}

// Create PostgreSQL connection pool and Drizzle instance at module load
export const pool = new Pool({
  connectionString: DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
