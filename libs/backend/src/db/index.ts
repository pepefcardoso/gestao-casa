import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/gestao_casa",
});

export const db = drizzle(pool, { schema });
