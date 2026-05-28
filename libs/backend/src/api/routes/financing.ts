import { createRoute, OpenAPIHono, type RouteConfigToTypedResponse } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import {
  financing,
  insertFinancingSchema,
  selectFinancingSchema,
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

router.openapi(
  postFinancingRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof postFinancingRoute>> => {
    try {
      const userId = c.var.userId;
      const payload = c.req.valid("json");

      // Verify write access to target house
      const check = await verifyHouseAccess(userId, payload.houseId, ["OWNER", "COLLABORATOR"]);
      if (!check.success) {
        return c.json({ error: check.error || "Access denied" }, 403);
      }

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
          adminFee:
            payload.adminFee !== undefined && payload.adminFee !== null
              ? String(payload.adminFee)
              : null,
          mipRate:
            payload.mipRate !== undefined && payload.mipRate !== null
              ? String(payload.mipRate)
              : null,
          dfiRate:
            payload.dfiRate !== undefined && payload.dfiRate !== null
              ? String(payload.dfiRate)
              : null,
          trRate:
            payload.trRate !== undefined && payload.trRate !== null ? String(payload.trRate) : null,
          interestMethod: payload.interestMethod ?? null,
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
            adminFee:
              payload.adminFee !== undefined && payload.adminFee !== null
                ? String(payload.adminFee)
                : null,
            mipRate:
              payload.mipRate !== undefined && payload.mipRate !== null
                ? String(payload.mipRate)
                : null,
            dfiRate:
              payload.dfiRate !== undefined && payload.dfiRate !== null
                ? String(payload.dfiRate)
                : null,
            trRate:
              payload.trRate !== undefined && payload.trRate !== null
                ? String(payload.trRate)
                : null,
            interestMethod: payload.interestMethod ?? null,
          },
        })
        .returning();

      if (!upserted) {
        return c.json({ error: "Failed to upsert financing record" }, 400);
      }

      const responseRecord = {
        ...upserted,
        amortizationSystem: upserted.amortizationSystem as "SAC" | "PRICE",
        interestMethod: upserted.interestMethod as "compound" | "linear" | null,
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
      house_id: uuidSchema,
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
  async (c): Promise<RouteConfigToTypedResponse<typeof getFinancingRoute>> => {
    try {
      const userId = c.var.userId;
      const { house_id } = c.req.valid("param");

      const check = await verifyHouseAccess(userId, house_id, ["OWNER", "COLLABORATOR", "VIEWER"]);
      if (!check.success) {
        return c.json({ error: check.error || "Access denied" }, 403);
      }

      const [record] = await db.select().from(financing).where(eq(financing.houseId, house_id));

      if (!record) {
        return c.json({ error: "Financing record not found" }, 404);
      }

      const responseRecord = {
        ...record,
        amortizationSystem: record.amortizationSystem as "SAC" | "PRICE",
        interestMethod: record.interestMethod as "compound" | "linear" | null,
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
