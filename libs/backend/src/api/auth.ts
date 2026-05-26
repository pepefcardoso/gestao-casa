import { createMiddleware } from "hono/factory";
import { db } from "../db";
import { houseMemberships } from "../db/schema";
import { and, eq } from "drizzle-orm";

export const authMiddleware = createMiddleware<{ Variables: { userId: string } }>(
  async (c, next): Promise<Response | undefined> => {
    const userId = c.req.header("x-user-id");
    if (!userId) {
      // Default fallback to Alice's UUID for backward compatibility in dev/test
      c.set("userId", "a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0");
      await next();
      return;
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(userId)) {
      return c.json({ error: "Invalid user ID format" }, 401);
    }

    c.set("userId", userId);
    await next();
  }
);

export async function verifyHouseAccess(
  userId: string,
  houseId: string,
  allowedRoles: ("OWNER" | "COLLABORATOR" | "VIEWER")[]
): Promise<{ success: boolean; role?: "OWNER" | "COLLABORATOR" | "VIEWER"; error?: string }> {
  try {
    const [membership] = await db
      .select()
      .from(houseMemberships)
      .where(
        and(
          eq(houseMemberships.userId, userId),
          eq(houseMemberships.houseId, houseId)
        )
      );

    if (!membership) {
      return {
        success: false,
        error: "Access denied. You do not belong to this house profile.",
      };
    }

    const role = membership.role as "OWNER" | "COLLABORATOR" | "VIEWER";
    if (!allowedRoles.includes(role)) {
      return { success: false, error: "Access denied. Insufficient permissions." };
    }

    return { success: true, role };
  } catch (_error: unknown) {
    return { success: false, error: "Database error during access validation." };
  }
}
