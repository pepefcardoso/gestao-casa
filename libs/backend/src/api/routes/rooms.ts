import { createRoute, OpenAPIHono, type RouteConfigToTypedResponse } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import {
  houseMemberships,
  insertRoomSchema,
  rooms,
  selectRoomSchema,
  uuidSchema,
} from "../../db/schema";
import { authMiddleware, verifyHouseAccess } from "../auth";
import { badRequest, ErrorSchema, forbidden, notFound } from "../errors";

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
          schema: ErrorSchema,
        },
      },
      description: "Invalid input payload",
    },
    403: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Access denied",
    },
  },
});

router.openapi(
  postRoomRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof postRoomRoute>> => {
    try {
      const userId = c.var.userId;
      const payload = c.req.valid("json");

      if (!payload.houseId) {
        return c.json(badRequest("houseId is required"), 400);
      }

      // Verify write access to the target house
      const check = await verifyHouseAccess(userId, payload.houseId, ["OWNER", "COLLABORATOR"]);
      if (!check.success) {
        return c.json(forbidden(check.error || "Access denied"), 403);
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
        return c.json(badRequest("Failed to create room"), 400);
      }

      const responseRoom = {
        ...newRoom,
        createdAt: newRoom.createdAt.toISOString(),
      };

      return c.json(responseRoom, 201);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

const getRoomsRoute = createRoute({
  method: "get",
  path: "/rooms",
  request: {
    query: z.object({
      house_id: uuidSchema.optional(),
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
          schema: ErrorSchema,
        },
      },
      description: "Invalid query parameters",
    },
    403: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Access denied",
    },
  },
});

router.openapi(
  getRoomsRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof getRoomsRoute>> => {
    try {
      const userId = c.var.userId;
      const { house_id } = c.req.valid("query");

      let results: (typeof rooms.$inferSelect)[] = [];
      if (house_id) {
        const check = await verifyHouseAccess(userId, house_id, [
          "OWNER",
          "COLLABORATOR",
          "VIEWER",
        ]);
        if (!check.success) {
          return c.json(forbidden(check.error || "Access denied"), 403);
        }
        results = await db.select().from(rooms).where(eq(rooms.houseId, house_id));
      } else {
        // Fetch all rooms the user has access to across all houses they belong to
        results = await db
          .select({
            id: rooms.id,
            houseId: rooms.houseId,
            name: rooms.name,
            area: rooms.area,
            colorCode: rooms.colorCode,
            createdAt: rooms.createdAt,
          })
          .from(rooms)
          .innerJoin(houseMemberships, eq(rooms.houseId, houseMemberships.houseId))
          .where(eq(houseMemberships.userId, userId));
      }

      const serializedRooms = results.map((room) => ({
        ...room,
        createdAt: room.createdAt.toISOString(),
      }));
      return c.json(serializedRooms, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

const getRoomRoute = createRoute({
  method: "get",
  path: "/rooms/{id}",
  request: {
    params: z.object({
      id: uuidSchema,
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: selectRoomSchema,
        },
      },
      description: "Room details retrieved successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Invalid ID parameter",
    },
    403: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Access denied",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Room not found",
    },
  },
});

router.openapi(
  getRoomRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof getRoomRoute>> => {
    try {
      const userId = c.var.userId;
      const { id } = c.req.valid("param");

      const [room] = await db.select().from(rooms).where(eq(rooms.id, id));

      if (!room) {
        return c.json(notFound("Room"), 404);
      }

      // Verify read access to the house the room belongs to
      const check = await verifyHouseAccess(userId, room.houseId, [
        "OWNER",
        "COLLABORATOR",
        "VIEWER",
      ]);
      if (!check.success) {
        return c.json(forbidden(check.error || "Access denied"), 403);
      }

      const responseRoom = {
        ...room,
        createdAt: room.createdAt.toISOString(),
      };

      return c.json(responseRoom, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

const putRoomRoute = createRoute({
  method: "put",
  path: "/rooms/{id}",
  request: {
    params: z.object({
      id: uuidSchema,
    }),
    body: {
      content: {
        "application/json": {
          schema: insertRoomSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: selectRoomSchema,
        },
      },
      description: "Room updated successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Invalid input payload or ID parameter",
    },
    403: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Access denied",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Room not found",
    },
  },
});

const deleteRoomRoute = createRoute({
  method: "delete",
  path: "/rooms/{id}",
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
      description: "Room deleted successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Invalid ID parameter",
    },
    403: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Access denied",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Room not found",
    },
  },
});

router.openapi(
  putRoomRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof putRoomRoute>> => {
    try {
      const userId = c.var.userId;
      const { id } = c.req.valid("param");
      const payload = c.req.valid("json");

      const [room] = await db.select().from(rooms).where(eq(rooms.id, id));

      if (!room) {
        return c.json(notFound("Room"), 404);
      }

      // Verify write access to the room's house
      const check = await verifyHouseAccess(userId, room.houseId, ["OWNER", "COLLABORATOR"]);
      if (!check.success) {
        return c.json(forbidden(check.error || "Access denied"), 403);
      }

      const [updatedRoom] = await db
        .update(rooms)
        .set({
          name: payload.name,
          area: payload.area !== undefined && payload.area !== null ? String(payload.area) : null,
          colorCode: payload.colorCode ?? null,
        })
        .where(eq(rooms.id, id))
        .returning();

      const responseRoom = {
        ...updatedRoom,
        createdAt: updatedRoom.createdAt.toISOString(),
      };

      return c.json(responseRoom, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

router.openapi(
  deleteRoomRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof deleteRoomRoute>> => {
    try {
      const userId = c.var.userId;
      const { id } = c.req.valid("param");

      const [room] = await db.select().from(rooms).where(eq(rooms.id, id));

      if (!room) {
        return c.json(notFound("Room"), 404);
      }

      // Verify write access to the room's house
      const check = await verifyHouseAccess(userId, room.houseId, ["OWNER", "COLLABORATOR"]);
      if (!check.success) {
        return c.json(forbidden(check.error || "Access denied"), 403);
      }

      await db.delete(rooms).where(eq(rooms.id, id));

      return c.json({ success: true }, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

export { router as roomsRouter };
