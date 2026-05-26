import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index";

/**
 * Programmatically runs all database migrations from the 'drizzle' directory.
 */
export async function runMigrations(): Promise<void> {
  console.log("Starting database migrations...");
  try {
    const migrationsFolder = path.resolve(process.cwd(), "drizzle");
    console.log(`Resolving migrations from: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    console.log("Migrations successfully applied.");
  } catch (error: unknown) {
    console.error("Migration failed:", error);
    throw error;
  }
}
