import { validateConnection } from "./connection-check";
import { pool } from "./index";

/**
 * Main execution block for validation CLI command.
 */
async function main(): Promise<void> {
  try {
    const isHealthy = await validateConnection();
    await pool.end();
    if (isHealthy) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error: unknown) {
    console.error("Fatal: Connection check script crashed.", error);
    process.exit(1);
  }
}

main();
