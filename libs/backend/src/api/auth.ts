import { and, eq } from "drizzle-orm";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import { db } from "../db";
import { houseMemberships } from "../db/schema";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-12345";

export const authMiddleware = createMiddleware<{ Variables: { userId: string } }>(
  async (c, next): Promise<Response | undefined> => {
    // 1. Try to read token from Authorization header or cookie
    const authHeader = c.req.header("authorization");
    const cookieToken = getCookie(c, "auth_token");
    let token = cookieToken;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (token) {
      try {
        const payload = await verify(token, JWT_SECRET, "HS256");
        if (payload?.sub && typeof payload.sub === "string") {
          c.set("userId", payload.sub);
          await next();
          return;
        }
      } catch (_err) {
        // Token is invalid, continue to fallback or reject
      }
    }

    // 2. Dev mode / Backward compatibility check
    if (process.env.NODE_ENV !== "production") {
      const xUserId = c.req.header("x-user-id");
      if (xUserId) {
        const uuidRegex =
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
        if (uuidRegex.test(xUserId)) {
          c.set("userId", xUserId);
          await next();
          return;
        }
      }

      // Default fallback to Alice's UUID for backward compatibility in dev/test
      c.set("userId", "a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0");
      await next();
      return;
    }

    // 3. Reject if not authenticated
    return c.json({ error: "Sessão expirada ou não autenticada" }, 401);
  },
);

export async function verifyHouseAccess(
  userId: string,
  houseId: string,
  allowedRoles: ("OWNER" | "COLLABORATOR" | "VIEWER")[],
): Promise<{ success: boolean; role?: "OWNER" | "COLLABORATOR" | "VIEWER"; error?: string }> {
  try {
    const [membership] = await db
      .select()
      .from(houseMemberships)
      .where(and(eq(houseMemberships.userId, userId), eq(houseMemberships.houseId, houseId)));

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
