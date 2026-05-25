import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import type { TypedResponse } from "hono";
import { z } from "zod";
import { db } from "../../db";
import { financing, insertFinancingSchema, selectFinancingSchema, houses } from "../../db/schema";

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

const postFinancingRoute = createRoute({
  method: "post",
  path: "/financing",
  request: {
    body: {
      content: {
        "application/json": {
          schema: insertFinancingSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: selectFinancingSchema,
        },
      },
      description: "Financing record upserted successfully",
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

router.openapi(
  postFinancingRoute,
  async (
    c,
  ): Promise<
    Response &
      (
        | TypedResponse<
            {
              id: string;
              houseId: string;
              propertyValue: string;
              downPayment: string;
              termMonths: number;
              interestRate: string;
              amortizationSystem: "SAC" | "PRICE";
              firstParcelOverride: string | null;
              lastParcelOverride: string | null;
              createdAt: string;
            },
            200,
            "json"
          >
        | TypedResponse<{ error: string }, 400, "json">
      )
  > => {
    try {
      const payload = c.req.valid("json");

      // Ensure that the referenced house exists in the database
      await db
        .insert(houses)
        .values({
          id: payload.houseId,
          name: "Minha Casa",
        })
        .onConflictDoNothing();

      const [upserted] = await db
        .insert(financing)
        .values({
          houseId: payload.houseId,
          propertyValue: String(payload.propertyValue),
          downPayment: String(payload.downPayment),
          termMonths: payload.termMonths,
          interestRate: String(payload.interestRate),
          amortizationSystem: payload.amortizationSystem,
          firstParcelOverride:
            payload.firstParcelOverride !== undefined && payload.firstParcelOverride !== null
              ? String(payload.firstParcelOverride)
              : null,
          lastParcelOverride:
            payload.lastParcelOverride !== undefined && payload.lastParcelOverride !== null
              ? String(payload.lastParcelOverride)
              : null,
        })
        .onConflictDoUpdate({
          target: financing.houseId,
          set: {
            propertyValue: String(payload.propertyValue),
            downPayment: String(payload.downPayment),
            termMonths: payload.termMonths,
            interestRate: String(payload.interestRate),
            amortizationSystem: payload.amortizationSystem,
            firstParcelOverride:
              payload.firstParcelOverride !== undefined && payload.firstParcelOverride !== null
                ? String(payload.firstParcelOverride)
                : null,
            lastParcelOverride:
              payload.lastParcelOverride !== undefined && payload.lastParcelOverride !== null
                ? String(payload.lastParcelOverride)
                : null,
          },
        })
        .returning();

      if (!upserted) {
        return c.json({ error: "Failed to upsert financing record" }, 400);
      }

      const responseRecord = {
        ...upserted,
        amortizationSystem: upserted.amortizationSystem as "SAC" | "PRICE",
        createdAt: upserted.createdAt.toISOString(),
      };

      return c.json(responseRecord, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json({ error: message }, 400);
    }
  },
);

const getFinancingRoute = createRoute({
  method: "get",
  path: "/financing/{house_id}",
  request: {
    params: z.object({
      house_id: z.string().uuid(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: selectFinancingSchema,
        },
      },
      description: "Financing record retrieved successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Financing record not found",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: "Invalid parameter format",
    },
  },
});

router.openapi(
  getFinancingRoute,
  async (
    c,
  ): Promise<
    Response &
      (
        | TypedResponse<
            {
              id: string;
              houseId: string;
              propertyValue: string;
              downPayment: string;
              termMonths: number;
              interestRate: string;
              amortizationSystem: "SAC" | "PRICE";
              firstParcelOverride: string | null;
              lastParcelOverride: string | null;
              createdAt: string;
            },
            200,
            "json"
          >
        | TypedResponse<{ error: string }, 404, "json">
        | TypedResponse<{ error: string }, 400, "json">
      )
  > => {
    try {
      const { house_id } = c.req.valid("param");

      const [record] = await db.select().from(financing).where(eq(financing.houseId, house_id));

      if (!record) {
        return c.json({ error: "Financing record not found" }, 404);
      }

      const responseRecord = {
        ...record,
        amortizationSystem: record.amortizationSystem as "SAC" | "PRICE",
        createdAt: record.createdAt.toISOString(),
      };

      return c.json(responseRecord, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json({ error: message }, 400);
    }
  },
);

export { router as financingRouter };
