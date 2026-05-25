import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import type { TypedResponse } from "hono";
import { z } from "zod";
import { db } from "../../db";
import { houses, insertHouseSchema, selectHouseSchema, uuidSchema } from "../../db/schema";

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

const getHouseRoute = createRoute({
  method: "get",
  path: "/houses/{id}",
  request: {
    params: z.object({
      id: uuidSchema,
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: selectHouseSchema,
        },
      },
      description: "House details retrieved successfully",
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
      description: "House not found",
    },
  },
});

const putHouseRoute = createRoute({
  method: "put",
  path: "/houses/{id}",
  request: {
    params: z.object({
      id: uuidSchema,
    }),
    body: {
      content: {
        "application/json": {
          schema: insertHouseSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: selectHouseSchema,
        },
      },
      description: "House details updated successfully",
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
      description: "House not found",
    },
  },
});

router.openapi(
  getHouseRoute,
  async (
    c,
  ): Promise<
    Response &
      (
        | TypedResponse<
            {
              id: string;
              name: string;
              location: string | null;
              totalArea: string | null;
              latitude: string | null;
              longitude: string | null;
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

      const [house] = await db.select().from(houses).where(eq(houses.id, id));

      if (!house) {
        return c.json({ error: "House not found" }, 404);
      }

      const responseHouse = {
        ...house,
        createdAt: house.createdAt.toISOString(),
      };

      return c.json(responseHouse, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json({ error: message }, 400);
    }
  },
);

router.openapi(
  putHouseRoute,
  async (
    c,
  ): Promise<
    Response &
      (
        | TypedResponse<
            {
              id: string;
              name: string;
              location: string | null;
              totalArea: string | null;
              latitude: string | null;
              longitude: string | null;
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

      const [updatedHouse] = await db
        .update(houses)
        .set({
          name: payload.name,
          location: payload.location ?? null,
          totalArea:
            payload.totalArea !== undefined && payload.totalArea !== null
              ? String(payload.totalArea)
              : null,
        })
        .where(eq(houses.id, id))
        .returning();

      if (!updatedHouse) {
        return c.json({ error: "House not found" }, 404);
      }

      const responseHouse = {
        ...updatedHouse,
        createdAt: updatedHouse.createdAt.toISOString(),
      };

      return c.json(responseHouse, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json({ error: message }, 400);
    }
  },
);

export { router as housesRouter };
