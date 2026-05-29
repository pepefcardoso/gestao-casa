import { hashPassword, verifyPassword } from "@gestao-casa/shared-logic/utils/auth-helpers";
import { createRoute, OpenAPIHono, type RouteConfigToTypedResponse } from "@hono/zod-openapi";
import { eq, inArray } from "drizzle-orm";
import { deleteCookie, setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { z } from "zod";
import { db } from "../../db";
import {
  changeUserPasswordSchema,
  expenses,
  financing,
  houseMemberships,
  houses,
  incomes,
  loginUserSchema,
  registerUserSchema,
  rooms,
  selectUserSchema,
  updateUserProfileSchema,
  users,
} from "../../db/schema";
import { authMiddleware } from "../auth";
import { badRequest, ErrorSchema, unauthorized } from "../errors";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-12345";

const router = new OpenAPIHono<{ Variables: { userId: string } }>({
  defaultHook: (result, c): Response | undefined => {
    if (!result.success) {
      return c.json(
        {
          error: result.error.message,
        },
        400,
      );
    }
    return undefined;
  },
});

// Route Configuration for Register
const postRegisterRoute = createRoute({
  method: "post",
  path: "/auth/register",
  request: {
    body: {
      content: {
        "application/json": {
          schema: registerUserSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({
            user: selectUserSchema,
            token: z.string(),
          }),
        },
      },
      description: "User registered successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Registration failed or email already in use",
    },
  },
});

// Route Configuration for Login
const postLoginRoute = createRoute({
  method: "post",
  path: "/auth/login",
  request: {
    body: {
      content: {
        "application/json": {
          schema: loginUserSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            user: selectUserSchema,
            token: z.string(),
          }),
        },
      },
      description: "Logged in successfully",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Invalid email or password",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Invalid inputs",
    },
  },
});

// Route Configuration for Logout
const postLogoutRoute = createRoute({
  method: "post",
  path: "/auth/logout",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
          }),
        },
      },
      description: "Logged out successfully",
    },
  },
});

// Route Configuration for Me
const getMeRoute = createRoute({
  method: "get",
  path: "/auth/me",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            user: selectUserSchema,
            memberships: z.array(
              z.object({
                id: z.string(),
                houseId: z.string(),
                role: z.string(),
                houseName: z.string(),
              }),
            ),
          }),
        },
      },
      description: "Current user profile and memberships retrieved successfully",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Unauthorized",
    },
  },
});

// Route Configuration for Update Profile
const putProfileRoute = createRoute({
  method: "put",
  path: "/auth/profile",
  request: {
    body: {
      content: {
        "application/json": {
          schema: updateUserProfileSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: selectUserSchema,
        },
      },
      description: "Profile updated successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Invalid inputs or email already in use",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Unauthorized",
    },
  },
});

// Route Configuration for Update Password
const putPasswordRoute = createRoute({
  method: "put",
  path: "/auth/password",
  request: {
    body: {
      content: {
        "application/json": {
          schema: changeUserPasswordSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
          }),
        },
      },
      description: "Password updated successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Incorrect current password or invalid input",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Unauthorized",
    },
  },
});

// Route Configuration for Delete Account
const deleteProfileRoute = createRoute({
  method: "delete",
  path: "/auth/profile",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
          }),
        },
      },
      description: "Account deleted successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Database or processing error",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Unauthorized",
    },
  },
});

// Route Configuration for Export Data
const getExportDataRoute = createRoute({
  method: "get",
  path: "/auth/export-data",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.unknown(),
        },
      },
      description: "Exported personal and financial data successfully as JSON file",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Database or processing error",
    },
    401: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Unauthorized",
    },
  },
});

// Implement Register Endpoint
router.openapi(
  postRegisterRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof postRegisterRoute>> => {
    try {
      const payload = c.req.valid("json");
      const normalizedEmail = payload.email.toLowerCase().trim();

      const [existingUser] = await db.select().from(users).where(eq(users.email, normalizedEmail));

      if (existingUser) {
        return c.json(badRequest("E-mail já cadastrado"), 400);
      }

      const passwordHash = hashPassword(payload.password);
      const [newUser] = await db
        .insert(users)
        .values({
          name: payload.name.trim(),
          email: normalizedEmail,
          passwordHash,
          termsAcceptedAt: new Date(),
        })
        .returning();

      if (!newUser) {
        return c.json(badRequest("Falha ao criar usuário"), 400);
      }

      const FALLBACK_HOUSE_ID = "9519c5f5-e74b-49dc-88d9-e484fda2c3c2";
      await db
        .insert(houseMemberships)
        .values({
          userId: newUser.id,
          houseId: FALLBACK_HOUSE_ID,
          role: "OWNER",
        })
        .onConflictDoNothing();

      const jwtPayload = {
        sub: newUser.id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      };
      const token = await sign(jwtPayload, JWT_SECRET);

      setCookie(c, "auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      const responseUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        termsAcceptedAt: newUser.termsAcceptedAt ? newUser.termsAcceptedAt.toISOString() : null,
        createdAt: newUser.createdAt.toISOString(),
      };

      return c.json({ user: responseUser, token }, 201);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

// Implement Login Endpoint
router.openapi(
  postLoginRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof postLoginRoute>> => {
    try {
      const payload = c.req.valid("json");
      const normalizedEmail = payload.email.toLowerCase().trim();

      const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));

      if (!user?.passwordHash) {
        return c.json(unauthorized("E-mail ou senha inválidos"), 401);
      }

      const isValidPassword = verifyPassword(payload.password, user.passwordHash);
      if (!isValidPassword) {
        return c.json(unauthorized("E-mail ou senha inválidos"), 401);
      }

      const jwtPayload = {
        sub: user.id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      };
      const token = await sign(jwtPayload, JWT_SECRET);

      setCookie(c, "auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      const responseUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        termsAcceptedAt: user.termsAcceptedAt ? user.termsAcceptedAt.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
      };

      return c.json({ user: responseUser, token }, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

// Implement Logout Endpoint
router.openapi(
  postLogoutRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof postLogoutRoute>> => {
    deleteCookie(c, "auth_token", { path: "/" });
    return c.json({ success: true }, 200);
  },
);

// Implement Me Endpoint
router.use("/auth/me", authMiddleware);
router.openapi(getMeRoute, async (c): Promise<RouteConfigToTypedResponse<typeof getMeRoute>> => {
  try {
    const userId = c.var.userId;

    const [user] = await db.select().from(users).where(eq(users.id, userId));

    if (!user) {
      return c.json(unauthorized("Usuário não encontrado"), 401);
    }

    const membershipsData = await db
      .select({
        id: houseMemberships.id,
        houseId: houseMemberships.houseId,
        role: houseMemberships.role,
        houseName: houses.name,
      })
      .from(houseMemberships)
      .innerJoin(houses, eq(houseMemberships.houseId, houses.id))
      .where(eq(houseMemberships.userId, userId));

    const responseUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      termsAcceptedAt: user.termsAcceptedAt ? user.termsAcceptedAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
    };

    return c.json({ user: responseUser, memberships: membershipsData }, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Database error";
    return c.json(unauthorized(message), 401);
  }
});

// Implement Update Profile Endpoint
router.use("/auth/profile", authMiddleware);
router.openapi(
  putProfileRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof putProfileRoute>> => {
    try {
      const userId = c.var.userId;
      const payload = c.req.valid("json");

      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user) {
        return c.json(unauthorized("Usuário não encontrado"), 401);
      }

      let emailToUpdate: string | undefined;
      if (payload.email) {
        const normalizedEmail = payload.email.toLowerCase().trim();
        if (normalizedEmail !== user.email) {
          const [emailInUse] = await db
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail));
          if (emailInUse) {
            return c.json(badRequest("E-mail já está em uso"), 400);
          }
          emailToUpdate = normalizedEmail;
        }
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          name: payload.name ? payload.name.trim() : undefined,
          email: emailToUpdate,
        })
        .where(eq(users.id, userId))
        .returning();

      const responseUser = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        termsAcceptedAt: updatedUser.termsAcceptedAt
          ? updatedUser.termsAcceptedAt.toISOString()
          : null,
        createdAt: updatedUser.createdAt.toISOString(),
      };

      return c.json(responseUser, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

// Implement Update Password Endpoint
router.use("/auth/password", authMiddleware);
router.openapi(
  putPasswordRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof putPasswordRoute>> => {
    try {
      const userId = c.var.userId;
      const payload = c.req.valid("json");

      const [user] = await db.select().from(users).where(eq(users.id, userId));

      if (!user?.passwordHash) {
        return c.json(unauthorized("Usuário não autorizado"), 401);
      }

      const isValid = verifyPassword(payload.currentPassword, user.passwordHash);
      if (!isValid) {
        return c.json(badRequest("Senha atual incorreta"), 400);
      }

      const newPasswordHash = hashPassword(payload.newPassword);
      await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, userId));

      return c.json({ success: true }, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

// Implement Delete Account Endpoint
router.use("/auth/profile", authMiddleware);
router.openapi(
  deleteProfileRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof deleteProfileRoute>> => {
    try {
      const userId = c.var.userId;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return c.json(unauthorized("Usuário não encontrado"), 401);
      }

      await db.delete(users).where(eq(users.id, userId));
      deleteCookie(c, "auth_token", { path: "/" });

      return c.json({ success: true }, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

// Implement Export Data Endpoint
router.use("/auth/export-data", authMiddleware);
router.openapi(
  getExportDataRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof getExportDataRoute>> => {
    try {
      const userId = c.var.userId;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return c.json(unauthorized("Usuário não encontrado"), 401);
      }

      const membershipsData = await db
        .select()
        .from(houseMemberships)
        .where(eq(houseMemberships.userId, userId));

      const houseIds = membershipsData.map((m) => m.houseId);

      let housesData: unknown[] = [];
      let roomsData: unknown[] = [];
      let expensesData: unknown[] = [];
      let incomesData: unknown[] = [];
      let financingData: unknown[] = [];

      if (houseIds.length > 0) {
        housesData = await db.select().from(houses).where(inArray(houses.id, houseIds));
        roomsData = await db.select().from(rooms).where(inArray(rooms.houseId, houseIds));
        expensesData = await db.select().from(expenses).where(inArray(expenses.houseId, houseIds));
        incomesData = await db.select().from(incomes).where(inArray(incomes.houseId, houseIds));
        financingData = await db
          .select()
          .from(financing)
          .where(inArray(financing.houseId, houseIds));
      }

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          termsAcceptedAt: user.termsAcceptedAt ? user.termsAcceptedAt.toISOString() : null,
          createdAt: user.createdAt.toISOString(),
        },
        memberships: membershipsData,
        houses: housesData,
        rooms: roomsData,
        expenses: expensesData,
        incomes: incomesData,
        financing: financingData,
      };

      c.header("Content-Disposition", 'attachment; filename="pillar-data-export.json"');
      return c.json(exportPayload, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

export { router as authRouter };
