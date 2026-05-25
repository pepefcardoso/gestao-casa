import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { TypedResponse } from "hono";
import { z } from "zod";
import { pool } from "../../db";

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

const getHealthRoute = createRoute({
  method: "get",
  path: "/health",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            status: z.string(),
            database: z.string(),
          }),
        },
      },
      description: "Database and API are healthy",
    },
    503: {
      content: {
        "application/json": {
          schema: z.object({
            status: z.string(),
            database: z.string(),
            error: z.string().optional(),
          }),
        },
      },
      description: "Service is unhealthy due to database connectivity failure",
    },
  },
});

router.openapi(
  getHealthRoute,
  async (
    c,
  ): Promise<
    Response &
      (
        | TypedResponse<
            {
              status: string;
              database: string;
            },
            200,
            "json"
          >
        | TypedResponse<
            {
              status: string;
              database: string;
              error?: string;
            },
            503,
            "json"
          >
      )
  > => {
    try {
      const client = await pool.connect();
      try {
        await client.query("SELECT 1");
      } finally {
        client.release();
      }
      return c.json({ status: "ok", database: "healthy" }, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database connection failed";
      return c.json(
        {
          status: "error",
          database: "unhealthy",
          error: message,
        },
        503,
      );
    }
  },
);

export { router as healthRouter };
