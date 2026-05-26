import { pool } from "./index";
import { runMigrations } from "./migrate";

/**
 * Main execution block for running database migrations programmatically.
 */
async function main(): Promise<void> {
  try {
    await runMigrations();
    process.exit(0);
  } catch (error: unknown) {
    console.error("Fatal: Migration script crashed.", error);
    process.exit(1);
  } finally {
    // Ensure Node process can terminate cleanly
    await pool.end();
  }
}

main();
