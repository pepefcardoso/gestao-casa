import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import type { TypedResponse } from "hono";
import { z } from "zod";
import { db } from "../../db";
import { expenses, insertExpenseSchema, selectExpenseSchema } from "../../db/schema";

const router = new OpenAPIHono({
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
  },
});

const getExpensesRoute = createRoute({
  method: "get",
  path: "/expenses",
  request: {
    query: z.object({
      room_id: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(selectExpenseSchema),
        },
      },
      description: "List of expenses, optionally filtered by room_id",
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
  },
});

router.openapi(
  postExpenseRoute,
  async (
    c,
  ): Promise<
    Response &
      (
        | TypedResponse<
            {
              id: string;
              roomId: string | null;
              description: string;
              totalAmount: string;
              installmentsCount: number;
              status: "BUDGET" | "CONFIRMED";
              category: "TAX" | "PRODUCT" | "SERVICE" | "FURNITURE" | "APPLIANCE" | "RENOVATION";
              priority: "HIGH" | "MEDIUM" | "LOW";
              dueDate: string;
              createdAt: string;
            },
            201,
            "json"
          >
        | TypedResponse<{ error: string }, 400, "json">
      )
  > => {
    try {
      const payload = c.req.valid("json");

      const [newExpense] = await db
        .insert(expenses)
        .values({
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
        category: newExpense.category as "TAX" | "PRODUCT" | "SERVICE" | "FURNITURE" | "APPLIANCE" | "RENOVATION",
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
  async (
    c,
  ): Promise<
    Response &
      (
        | TypedResponse<
            {
              id: string;
              roomId: string | null;
              description: string;
              totalAmount: string;
              installmentsCount: number;
              status: "BUDGET" | "CONFIRMED";
              category: "TAX" | "PRODUCT" | "SERVICE" | "FURNITURE" | "APPLIANCE" | "RENOVATION";
              priority: "HIGH" | "MEDIUM" | "LOW";
              dueDate: string;
              createdAt: string;
            }[],
            200,
            "json"
          >
        | TypedResponse<{ error: string }, 400, "json">
      )
  > => {
    try {
      const { room_id } = c.req.valid("query");

      if (!room_id) {
        const allExpenses = await db.select().from(expenses);
        const serialized = allExpenses.map((expense) => ({
          ...expense,
          status: expense.status as "BUDGET" | "CONFIRMED",
          category: expense.category as "TAX" | "PRODUCT" | "SERVICE" | "FURNITURE" | "APPLIANCE" | "RENOVATION",
          priority: expense.priority as "HIGH" | "MEDIUM" | "LOW",
          dueDate: expense.dueDate.toISOString(),
          createdAt: expense.createdAt.toISOString(),
        }));
        return c.json(serialized, 200);
      }

      const filtered = await db.select().from(expenses).where(eq(expenses.roomId, room_id));
      const serialized = filtered.map((expense) => ({
        ...expense,
        status: expense.status as "BUDGET" | "CONFIRMED",
        category: expense.category as "TAX" | "PRODUCT" | "SERVICE" | "FURNITURE" | "APPLIANCE" | "RENOVATION",
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

export { router as expensesRouter };
