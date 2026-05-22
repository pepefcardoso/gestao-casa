import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import type { TypedResponse } from "hono";
import { z } from "zod";
import { db } from "../../db";
import { insertRoomSchema, rooms, selectRoomSchema } from "../../db/schema";

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
  },
});

const postRoomRoute = createRoute({
  method: "post",
  path: "/rooms",
  request: {
    body: {
      content: {
        "application/json": {
          schema: insertRoomSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: selectRoomSchema,
        },
      },
      description: "Room created successfully",
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
  postRoomRoute,
  async (
    c,
  ): Promise<
    Response &
      (
        | TypedResponse<
            {
              id: string;
              houseId: string;
              name: string;
              area: string | null;
              colorCode: string | null;
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

      if (!payload.houseId) {
        return c.json({ error: "houseId is required" }, 400);
      }

      const [newRoom] = await db
        .insert(rooms)
        .values({
          name: payload.name,
          houseId: payload.houseId,
          area:
            payload.area !== undefined && payload.area !== null ? String(payload.area) : undefined,
          colorCode: payload.colorCode,
        })
        .returning();

      if (!newRoom) {
        return c.json({ error: "Failed to create room" }, 400);
      }

      // Convert Date to string to match JSON serialized response types
      const responseRoom = {
        ...newRoom,
        createdAt: newRoom.createdAt.toISOString(),
      };

      return c.json(responseRoom, 201);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json({ error: message }, 400);
    }
  },
);

const getRoomsRoute = createRoute({
  method: "get",
  path: "/rooms",
  request: {
    query: z.object({
      house_id: z.string().uuid().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(selectRoomSchema),
        },
      },
      description: "List of rooms, optionally filtered by house_id",
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
  getRoomsRoute,
  async (
    c,
  ): Promise<
    Response &
      (
        | TypedResponse<
            {
              id: string;
              houseId: string;
              name: string;
              area: string | null;
              colorCode: string | null;
              createdAt: string;
            }[],
            200,
            "json"
          >
        | TypedResponse<{ error: string }, 400, "json">
      )
  > => {
    try {
      const { house_id } = c.req.valid("query");

      if (!house_id) {
        const allRooms = await db.select().from(rooms);
        const serializedRooms = allRooms.map((room) => ({
          ...room,
          createdAt: room.createdAt.toISOString(),
        }));
        return c.json(serializedRooms, 200);
      }

      const filteredRooms = await db.select().from(rooms).where(eq(rooms.houseId, house_id));
      const serializedRooms = filteredRooms.map((room) => ({
        ...room,
        createdAt: room.createdAt.toISOString(),
      }));
      return c.json(serializedRooms, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json({ error: message }, 400);
    }
  },
);

export { router as roomsRouter };
