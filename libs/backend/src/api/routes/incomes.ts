import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { and, eq, gte, lt } from "drizzle-orm";
import type { TypedResponse } from "hono";
import { z } from "zod";
import { db } from "../../db";
import { incomes, insertIncomeSchema, selectIncomeSchema, uuidSchema } from "../../db/schema";

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

const getIncomesRoute = createRoute({
  method: "get",
  path: "/incomes",
  request: {
    query: z.object({
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
      description: "List of incomes, optionally filtered by month (YYYY-MM)",
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
  async (
    c,
  ): Promise<
    Response &
      (
        | TypedResponse<
            {
              id: string;
              description: string;
              amount: string;
              status: "BUDGET" | "CONFIRMED";
              category: "SALARY" | "INVESTMENT" | "REFUND" | "OTHER";
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
      const { month } = c.req.valid("query");

      let results: {
        id: string;
        description: string;
        amount: string;
        status: string;
        category: string;
        dueDate: Date;
        createdAt: Date;
      }[];
      if (month) {
        const [yearStr, monthStr] = month.split("-");
        const year = Number(yearStr);
        const monthNum = Number(monthStr);

        const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0, 0));

        results = await db
          .select()
          .from(incomes)
          .where(and(gte(incomes.dueDate, startDate), lt(incomes.dueDate, endDate)));
      } else {
        results = await db.select().from(incomes);
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
  async (
    c,
  ): Promise<
    Response &
      (
        | TypedResponse<
            {
              id: string;
              description: string;
              amount: string;
              status: "BUDGET" | "CONFIRMED";
              category: "SALARY" | "INVESTMENT" | "REFUND" | "OTHER";
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

      const [newIncome] = await db
        .insert(incomes)
        .values({
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
  async (
    c,
  ): Promise<
    Response &
      (
        | TypedResponse<
            {
              id: string;
              description: string;
              amount: string;
              status: "BUDGET" | "CONFIRMED";
              category: "SALARY" | "INVESTMENT" | "REFUND" | "OTHER";
              dueDate: string;
              createdAt: string;
            },
            200,
            "json"
          >
        | TypedResponse<{ error: string }, 400, "json">
        | TypedResponse<{ error: string }, 404, "json">
      )
  > => {
    try {
      const { id } = c.req.valid("param");
      const payload = c.req.valid("json");

      const [updatedIncome] = await db
        .update(incomes)
        .set({
          description: payload.description,
          amount: String(payload.amount),
          status: payload.status,
          category: payload.category,
          dueDate: payload.dueDate,
        })
        .where(eq(incomes.id, id))
        .returning();

      if (!updatedIncome) {
        return c.json({ error: "Income not found" }, 404);
      }

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
  async (
    c,
  ): Promise<
    Response &
      (
        | TypedResponse<{ success: boolean }, 200, "json">
        | TypedResponse<{ error: string }, 400, "json">
        | TypedResponse<{ error: string }, 404, "json">
      )
  > => {
    try {
      const { id } = c.req.valid("param");

      const [deletedIncome] = await db.delete(incomes).where(eq(incomes.id, id)).returning();

      if (!deletedIncome) {
        return c.json({ error: "Income not found" }, 404);
      }

      return c.json({ success: true }, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json({ error: message }, 400);
    }
  },
);

export { router as incomesRouter };
