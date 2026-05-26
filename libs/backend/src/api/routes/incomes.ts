import { createRoute, OpenAPIHono, type RouteConfigToTypedResponse } from "@hono/zod-openapi";
import { and, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import {
  houseMemberships,
  incomes,
  insertIncomeSchema,
  selectIncomeSchema,
  uuidSchema,
} from "../../db/schema";
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

const getIncomesRoute = createRoute({
  method: "get",
  path: "/incomes",
  request: {
    query: z.object({
      house_id: uuidSchema.optional(),
      month: z
        .string()
        .regex(/^\d{4}-\d{2}$/, { message: "Month must be in YYYY-MM format" })
        .optional(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(selectIncomeSchema),
        },
      },
      description: "List of incomes, optionally filtered by house_id and/or month (YYYY-MM)",
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
  },
});

const postIncomeRoute = createRoute({
  method: "post",
  path: "/incomes",
  request: {
    body: {
      content: {
        "application/json": {
          schema: insertIncomeSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: selectIncomeSchema,
        },
      },
      description: "Income created successfully",
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

const putIncomeRoute = createRoute({
  method: "put",
  path: "/incomes/{id}",
  request: {
    params: z.object({
      id: uuidSchema,
    }),
    body: {
      content: {
        "application/json": {
          schema: insertIncomeSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: selectIncomeSchema,
        },
      },
      description: "Income updated successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Invalid input payload or ID parameter",
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
      description: "Income not found",
    },
  },
});

const deleteIncomeRoute = createRoute({
  method: "delete",
  path: "/incomes/{id}",
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
      description: "Income deleted successfully",
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
      description: "Income not found",
    },
  },
});

router.openapi(
  getIncomesRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof getIncomesRoute>> => {
    try {
      const userId = c.var.userId;
      const { house_id, month } = c.req.valid("query");

      const checkHouseId = house_id;
      if (!checkHouseId) {
        // If not specified, we check if the user is authorized for any house
        // Or fetch memberships
        const userMembs = await db
          .select()
          .from(houseMemberships)
          .where(eq(houseMemberships.userId, userId));
        if (userMembs.length === 0) {
          return c.json([], 200);
        }
      } else {
        const check = await verifyHouseAccess(userId, checkHouseId, [
          "OWNER",
          "COLLABORATOR",
          "VIEWER",
        ]);
        if (!check.success) {
          return c.json({ error: check.error || "Access denied" }, 403);
        }
      }

      const dateClause = month
        ? (() => {
            const [yearStr, monthStr] = month.split("-");
            const year = Number(yearStr);
            const monthNum = Number(monthStr);

            const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
            const endDate = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0, 0));
            return and(gte(incomes.dueDate, startDate), lt(incomes.dueDate, endDate));
          })()
        : undefined;

      let results: (typeof incomes.$inferSelect)[] = [];
      if (checkHouseId) {
        results = await db
          .select()
          .from(incomes)
          .where(
            dateClause
              ? and(eq(incomes.houseId, checkHouseId), dateClause)
              : eq(incomes.houseId, checkHouseId),
          );
      } else {
        // Fetch all incomes the user has access to across all houses
        results = await db
          .select({
            id: incomes.id,
            houseId: incomes.houseId,
            description: incomes.description,
            amount: incomes.amount,
            status: incomes.status,
            category: incomes.category,
            dueDate: incomes.dueDate,
            createdAt: incomes.createdAt,
          })
          .from(incomes)
          .innerJoin(houseMemberships, eq(incomes.houseId, houseMemberships.houseId))
          .where(
            dateClause
              ? and(eq(houseMemberships.userId, userId), dateClause)
              : eq(houseMemberships.userId, userId),
          );
      }

      const serialized = results.map((income) => ({
        ...income,
        status: income.status as "BUDGET" | "CONFIRMED",
        category: income.category as "SALARY" | "INVESTMENT" | "REFUND" | "OTHER",
        dueDate: income.dueDate.toISOString(),
        createdAt: income.createdAt.toISOString(),
      }));

      return c.json(serialized, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json({ error: message }, 400);
    }
  },
);

router.openapi(
  postIncomeRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof postIncomeRoute>> => {
    try {
      const userId = c.var.userId;
      const payload = c.req.valid("json");

      const targetHouseId = payload.houseId;
      if (!targetHouseId) {
        return c.json({ error: "houseId is required" }, 400);
      }

      // Verify write access to target house
      const check = await verifyHouseAccess(userId, targetHouseId, ["OWNER", "COLLABORATOR"]);
      if (!check.success) {
        return c.json({ error: check.error || "Access denied" }, 403);
      }

      const [newIncome] = await db
        .insert(incomes)
        .values({
          houseId: targetHouseId,
          description: payload.description,
          amount: String(payload.amount),
          status: payload.status,
          category: payload.category,
          dueDate: payload.dueDate,
        })
        .returning();

      if (!newIncome) {
        return c.json({ error: "Failed to create income" }, 400);
      }

      const responseIncome = {
        ...newIncome,
        status: newIncome.status as "BUDGET" | "CONFIRMED",
        category: newIncome.category as "SALARY" | "INVESTMENT" | "REFUND" | "OTHER",
        dueDate: newIncome.dueDate.toISOString(),
        createdAt: newIncome.createdAt.toISOString(),
      };

      return c.json(responseIncome, 201);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json({ error: message }, 400);
    }
  },
);

router.openapi(
  putIncomeRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof putIncomeRoute>> => {
    try {
      const userId = c.var.userId;
      const { id } = c.req.valid("param");
      const payload = c.req.valid("json");

      const [income] = await db.select().from(incomes).where(eq(incomes.id, id));

      if (!income) {
        return c.json({ error: "Income not found" }, 404);
      }

      // Verify write access to target house
      const check = await verifyHouseAccess(userId, income.houseId, ["OWNER", "COLLABORATOR"]);
      if (!check.success) {
        return c.json({ error: check.error || "Access denied" }, 403);
      }

      // If they changed the houseId, check permissions
      let updatedHouseId = income.houseId;
      if (payload.houseId && payload.houseId !== income.houseId) {
        const checkNew = await verifyHouseAccess(userId, payload.houseId, [
          "OWNER",
          "COLLABORATOR",
        ]);
        if (!checkNew.success) {
          return c.json(
            { error: "Cannot move income to a house you do not have write access to." },
            403,
          );
        }
        updatedHouseId = payload.houseId;
      }

      const [updatedIncome] = await db
        .update(incomes)
        .set({
          houseId: updatedHouseId,
          description: payload.description,
          amount: String(payload.amount),
          status: payload.status,
          category: payload.category,
          dueDate: payload.dueDate,
        })
        .where(eq(incomes.id, id))
        .returning();

      const responseIncome = {
        ...updatedIncome,
        status: updatedIncome.status as "BUDGET" | "CONFIRMED",
        category: updatedIncome.category as "SALARY" | "INVESTMENT" | "REFUND" | "OTHER",
        dueDate: updatedIncome.dueDate.toISOString(),
        createdAt: updatedIncome.createdAt.toISOString(),
      };

      return c.json(responseIncome, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json({ error: message }, 400);
    }
  },
);

router.openapi(
  deleteIncomeRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof deleteIncomeRoute>> => {
    try {
      const userId = c.var.userId;
      const { id } = c.req.valid("param");

      const [income] = await db.select().from(incomes).where(eq(incomes.id, id));

      if (!income) {
        return c.json({ error: "Income not found" }, 404);
      }

      // Verify write access to target house
      const check = await verifyHouseAccess(userId, income.houseId, ["OWNER", "COLLABORATOR"]);
      if (!check.success) {
        return c.json({ error: check.error || "Access denied" }, 403);
      }

      await db.delete(incomes).where(eq(incomes.id, id));

      return c.json({ success: true }, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json({ error: message }, 400);
    }
  },
);

export { router as incomesRouter };
