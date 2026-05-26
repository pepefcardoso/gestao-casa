import { pool } from "./index";

/**
 * Validates the database connection.
 * Executes a simple query and catches common connection issues to provide
 * user-friendly error diagnostics instead of raw stack traces.
 */
export async function validateConnection(): Promise<boolean> {
  console.log("Checking database connection health...");
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ Environment Error: DATABASE_URL is not set.");
    console.error("Please configure the DATABASE_URL environment variable.");
    return false;
  }

  try {
    const parsed = new URL(connectionString);
    console.log(`Target database host: ${parsed.host}, database: ${parsed.pathname.slice(1)}`);
  } catch {
    console.log("Database connection URL format is non-standard, parsing skipped.");
  }

  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      console.log("✅ Database connection established successfully!");
      return true;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    console.error("❌ Database Connection Failed!");

    if (error && typeof error === "object") {
      const err = error as { code?: string; message?: string; errno?: string };

      if (err.code === "ECONNREFUSED" || err.errno === "ECONNREFUSED") {
        console.error(
          "👉 Diagnostic: Port unreachable. Check if PostgreSQL server is running and accessible on the specified host/port.",
        );
      } else if (err.code === "28P01") {
        console.error(
          "👉 Diagnostic: Invalid password or authentication failed. Check database credentials.",
        );
      } else if (err.code === "3D000") {
        console.error(
          "👉 Diagnostic: Database does not exist. Verify the database name in your connection string.",
        );
      } else if (err.code === "ENOTFOUND") {
        console.error(
          "👉 Diagnostic: Host name could not be resolved. Check internet/DNS settings or host configurations.",
        );
      } else {
        console.error(
          `👉 Diagnostic: Error Code: ${err.code || "unknown"}. Message: ${err.message || String(error)}`,
        );
      }
    } else {
      console.error(`👉 Diagnostic: ${String(error)}`);
    }
    return false;
  }
}
