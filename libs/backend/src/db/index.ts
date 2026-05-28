import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const isProduction = process.env.NODE_ENV === "production";
const connectionString = process.env.DATABASE_URL;
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (isProduction && !connectionString && !isBuildPhase) {
  throw new Error("DATABASE_URL environment variable is mandatory in production configurations.");
}

const defaultUrl = "postgresql://postgres@localhost:5432/pillar";

export const pool = new Pool({
  connectionString: connectionString || defaultUrl,
  ssl:
    process.env.DATABASE_SSL === "true" || (isProduction && process.env.DATABASE_SSL !== "false")
      ? { rejectUnauthorized: false }
      : undefined,
});

export const db = drizzle(pool, { schema });
