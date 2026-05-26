import { createRoute, OpenAPIHono, type RouteConfigToTypedResponse } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import { expenses, insertExpenseSchema, selectExpenseSchema, uuidSchema, rooms, houseMemberships } from "../../db/schema";
import { authMiddleware, verifyHouseAccess } from "../auth";

const router = new OpenAPIHono<{ Variables: { userId: string } }>({
  defaultHook: (result, c): Response | undefined => {
    if (!result.success) {
      console.log("Validation Failed:", JSON.stringify(result.error, null, 2));
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

router.use("*", authMiddleware);

const postExpenseRoute = createRoute({
  method: "post",
  path: "/expenses",
  request: {
    body: {
      content: {
        "application/json": {
          schema: insertExpenseSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: selectExpenseSchema,
        },
      },
      description: "Expense created successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Invalid input payload",
    },
    403: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Access denied",
    },
  },
});

const getExpensesRoute = createRoute({
  method: "get",
  path: "/expenses",
  request: {
    query: z.object({
      house_id: uuidSchema.optional(),
      room_id: uuidSchema.optional(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(selectExpenseSchema),
        },
      },
      description: "List of expenses, optionally filtered by house_id or room_id",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Invalid query parameters",
    },
    403: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Access denied",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Room not found",
    },
  },
});

router.openapi(
  postExpenseRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof postExpenseRoute>> => {
    try {
      const userId = c.var.userId;
      const payload = c.req.valid("json");

      let targetHouseId = payload.houseId;
      if (!targetHouseId && payload.roomId) {
        const [room] = await db.select().from(rooms).where(eq(rooms.id, payload.roomId));
        if (room) {
          targetHouseId = room.houseId;
        }
      }

      if (!targetHouseId) {
        return c.json({ error: "houseId is required" }, 400);
      }

      // Verify write access to target house
      const check = await verifyHouseAccess(userId, targetHouseId, ["OWNER", "COLLABORATOR"]);
      if (!check.success) {
        return c.json({ error: check.error || "Access denied" }, 403);
      }

      const [newExpense] = await db
        .insert(expenses)
        .values({
          houseId: targetHouseId,
          roomId: payload.roomId ?? null,
          description: payload.description,
          totalAmount: String(payload.totalAmount),
          installmentsCount: payload.installmentsCount,
          status: payload.status,
          category: payload.category,
          priority: payload.priority,
          dueDate: payload.dueDate,
        })
        .returning();

      if (!newExpense) {
        return c.json({ error: "Failed to create expense" }, 400);
      }

      const responseExpense = {
        ...newExpense,
        status: newExpense.status as "BUDGET" | "CONFIRMED",
        category: newExpense.category as
          | "TAX"
          | "PRODUCT"
          | "SERVICE"
          | "FURNITURE"
          | "APPLIANCE"
          | "RENOVATION",
        priority: newExpense.priority as "HIGH" | "MEDIUM" | "LOW",
        dueDate: newExpense.dueDate.toISOString(),
        createdAt: newExpense.createdAt.toISOString(),
      };

      return c.json(responseExpense, 201);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json({ error: message }, 400);
    }
  },
);

router.openapi(
  getExpensesRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof getExpensesRoute>> => {
    try {
      const userId = c.var.userId;
      const { house_id, room_id } = c.req.valid("query");

      let results: (typeof expenses.$inferSelect)[] = [];
      if (room_id) {
        const [room] = await db.select().from(rooms).where(eq(rooms.id, room_id));
        if (!room) {
          return c.json({ error: "Room not found" }, 404);
        }

        const check = await verifyHouseAccess(userId, room.houseId, ["OWNER", "COLLABORATOR", "VIEWER"]);
        if (!check.success) {
          return c.json({ error: check.error || "Access denied" }, 403);
        }

        results = await db.select().from(expenses).where(eq(expenses.roomId, room_id));
      } else if (house_id) {
        const check = await verifyHouseAccess(userId, house_id, ["OWNER", "COLLABORATOR", "VIEWER"]);
        if (!check.success) {
          return c.json({ error: check.error || "Access denied" }, 403);
        }

        results = await db.select().from(expenses).where(eq(expenses.houseId, house_id));
      } else {
        // Return all expenses for all houses the user belongs to
        results = await db
          .select({
            id: expenses.id,
            houseId: expenses.houseId,
            roomId: expenses.roomId,
            description: expenses.description,
            totalAmount: expenses.totalAmount,
            installmentsCount: expenses.installmentsCount,
            status: expenses.status,
            category: expenses.category,
            priority: expenses.priority,
            dueDate: expenses.dueDate,
            createdAt: expenses.createdAt,
          })
          .from(expenses)
          .innerJoin(houseMemberships, eq(expenses.houseId, houseMemberships.houseId))
          .where(eq(houseMemberships.userId, userId));
      }

      const serialized = results.map((expense) => ({
        ...expense,
        status: expense.status as "BUDGET" | "CONFIRMED",
        category: expense.category as
          | "TAX"
          | "PRODUCT"
          | "SERVICE"
          | "FURNITURE"
          | "APPLIANCE"
          | "RENOVATION",
        priority: expense.priority as "HIGH" | "MEDIUM" | "LOW",
        dueDate: expense.dueDate.toISOString(),
        createdAt: expense.createdAt.toISOString(),
      }));
      return c.json(serialized, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json({ error: message }, 400);
    }
  },
);

const putExpenseRoute = createRoute({
  method: "put",
  path: "/expenses/{id}",
  request: {
    params: z.object({
      id: uuidSchema,
    }),
    body: {
      content: {
        "application/json": {
          schema: insertExpenseSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: selectExpenseSchema,
        },
      },
      description: "Expense updated successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Invalid input payload",
    },
    403: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Access denied",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Expense not found",
    },
  },
});

const deleteExpenseRoute = createRoute({
  method: "delete",
  path: "/expenses/{id}",
  request: {
    params: z.object({
      id: uuidSchema,
    }),
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
      description: "Expense deleted successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Invalid ID parameter",
    },
    403: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Access denied",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Expense not found",
    },
  },
});

router.openapi(
  putExpenseRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof putExpenseRoute>> => {
    try {
      const userId = c.var.userId;
      const { id } = c.req.valid("param");
      const payload = c.req.valid("json");

      const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));

      if (!expense) {
        return c.json({ error: "Expense not found" }, 404);
      }

      // Verify write access to the expense's house
      const check = await verifyHouseAccess(userId, expense.houseId, ["OWNER", "COLLABORATOR"]);
      if (!check.success) {
        return c.json({ error: check.error || "Access denied" }, 403);
      }

      // Ensure that if they change roomId, the new room belongs to the same house or they have access
      let updatedHouseId = expense.houseId;
      if (payload.roomId && payload.roomId !== expense.roomId) {
        const [room] = await db.select().from(rooms).where(eq(rooms.id, payload.roomId));
        if (room) {
          const roomCheck = await verifyHouseAccess(userId, room.houseId, ["OWNER", "COLLABORATOR"]);
          if (!roomCheck.success) {
            return c.json({ error: "Cannot assign expense to a room you do not have write access to." }, 403);
          }
          updatedHouseId = room.houseId;
        }
      }

      const [updatedExpense] = await db
        .update(expenses)
        .set({
          houseId: updatedHouseId,
          roomId: payload.roomId ?? null,
          description: payload.description,
          totalAmount: String(payload.totalAmount),
          installmentsCount: payload.installmentsCount,
          status: payload.status,
          category: payload.category,
          priority: payload.priority,
          dueDate: payload.dueDate,
        })
        .where(eq(expenses.id, id))
        .returning();

      const responseExpense = {
        ...updatedExpense,
        status: updatedExpense.status as "BUDGET" | "CONFIRMED",
        category: updatedExpense.category as
          | "TAX"
          | "PRODUCT"
          | "SERVICE"
          | "FURNITURE"
          | "APPLIANCE"
          | "RENOVATION",
        priority: updatedExpense.priority as "HIGH" | "MEDIUM" | "LOW",
        dueDate: updatedExpense.dueDate.toISOString(),
        createdAt: updatedExpense.createdAt.toISOString(),
      };

      return c.json(responseExpense, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json({ error: message }, 400);
    }
  },
);

router.openapi(
  deleteExpenseRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof deleteExpenseRoute>> => {
    try {
      const userId = c.var.userId;
      const { id } = c.req.valid("param");

      const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));

      if (!expense) {
        return c.json({ error: "Expense not found" }, 404);
      }

      // Verify write access to the expense's house
      const check = await verifyHouseAccess(userId, expense.houseId, ["OWNER", "COLLABORATOR"]);
      if (!check.success) {
        return c.json({ error: check.error || "Access denied" }, 403);
      }

      await db.delete(expenses).where(eq(expenses.id, id));

      return c.json({ success: true }, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json({ error: message }, 400);
    }
  },
);

export { router as expensesRouter };
