import { createRoute, OpenAPIHono, type RouteConfigToTypedResponse } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import {
  houseMemberships,
  houses,
  insertHouseSchema,
  selectHouseSchema,
  users,
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

const getHousesRoute = createRoute({
  method: "get",
  path: "/houses",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(selectHouseSchema),
        },
      },
      description: "List of houses user has access to",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Database error",
    },
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
      description: "House not found",
    },
  },
});

const postHouseRoute = createRoute({
  method: "post",
  path: "/houses",
  request: {
    body: {
      content: {
        "application/json": {
          schema: insertHouseSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: selectHouseSchema,
        },
      },
      description: "House created successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Invalid input payload",
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
      description: "House not found",
    },
  },
});

const getHouseMembersRoute = createRoute({
  method: "get",
  path: "/houses/{id}/members",
  request: {
    params: z.object({
      id: uuidSchema,
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              id: z.string(),
              role: z.string(),
              user: z.object({
                id: z.string(),
                name: z.string(),
                email: z.string(),
              }),
            }),
          ),
        },
      },
      description: "List of members for this house profile",
    },
    403: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Access denied",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Invalid input or database error",
    },
  },
});

const shareHouseRoute = createRoute({
  method: "post",
  path: "/houses/{id}/share",
  request: {
    params: z.object({
      id: uuidSchema,
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email(),
            role: z.enum(["OWNER", "COLLABORATOR", "VIEWER"]),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            membershipId: z.string(),
          }),
        },
      },
      description: "House shared successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Invalid inputs",
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

const deleteHouseMemberRoute = createRoute({
  method: "delete",
  path: "/houses/{id}/members/{membershipId}",
  request: {
    params: z.object({
      id: uuidSchema,
      membershipId: uuidSchema,
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
      description: "Member removed successfully",
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
      description: "Membership not found",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Invalid request or sole owner check failure",
    },
  },
});

router.openapi(
  getHousesRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof getHousesRoute>> => {
    try {
      const userId = c.var.userId;
      const results = await db
        .select({
          id: houses.id,
          name: houses.name,
          location: houses.location,
          totalArea: houses.totalArea,
          latitude: houses.latitude,
          longitude: houses.longitude,
          createdAt: houses.createdAt,
        })
        .from(houses)
        .innerJoin(houseMemberships, eq(houses.id, houseMemberships.houseId))
        .where(eq(houseMemberships.userId, userId));

      const serialized = results.map((house) => ({
        ...house,
        createdAt: house.createdAt.toISOString(),
      }));

      return c.json(serialized, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

router.openapi(
  postHouseRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof postHouseRoute>> => {
    try {
      const userId = c.var.userId;
      const payload = c.req.valid("json");

      const [newHouse] = await db
        .insert(houses)
        .values({
          name: payload.name,
          location: payload.location,
          totalArea: payload.totalArea ? String(payload.totalArea) : null,
          latitude: payload.latitude ? String(payload.latitude) : null,
          longitude: payload.longitude ? String(payload.longitude) : null,
        })
        .returning();

      if (!newHouse) {
        return c.json(badRequest("Failed to create house"), 400);
      }

      // Add creator as owner
      await db.insert(houseMemberships).values({
        userId,
        houseId: newHouse.id,
        role: "OWNER",
      });

      const responseHouse = {
        ...newHouse,
        createdAt: newHouse.createdAt.toISOString(),
      };

      return c.json(responseHouse, 201);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

router.openapi(
  getHouseRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof getHouseRoute>> => {
    try {
      const userId = c.var.userId;
      const { id } = c.req.valid("param");

      const check = await verifyHouseAccess(userId, id, ["OWNER", "COLLABORATOR", "VIEWER"]);
      if (!check.success) {
        return c.json(forbidden(check.error || "Access denied"), 403);
      }

      const [house] = await db.select().from(houses).where(eq(houses.id, id));

      if (!house) {
        return c.json(notFound("House"), 404);
      }

      const responseHouse = {
        ...house,
        createdAt: house.createdAt.toISOString(),
      };

      return c.json(responseHouse, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

router.openapi(
  putHouseRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof putHouseRoute>> => {
    try {
      const userId = c.var.userId;
      const { id } = c.req.valid("param");
      const payload = c.req.valid("json");

      const check = await verifyHouseAccess(userId, id, ["OWNER", "COLLABORATOR"]);
      if (!check.success) {
        return c.json(forbidden(check.error || "Access denied"), 403);
      }

      const [updatedHouse] = await db
        .update(houses)
        .set({
          name: payload.name,
          location: payload.location ?? null,
          totalArea:
            payload.totalArea !== undefined && payload.totalArea !== null
              ? String(payload.totalArea)
              : null,
          latitude:
            payload.latitude !== undefined && payload.latitude !== null
              ? String(payload.latitude)
              : null,
          longitude:
            payload.longitude !== undefined && payload.longitude !== null
              ? String(payload.longitude)
              : null,
        })
        .where(eq(houses.id, id))
        .returning();

      if (!updatedHouse) {
        return c.json(notFound("House"), 404);
      }

      const responseHouse = {
        ...updatedHouse,
        createdAt: updatedHouse.createdAt.toISOString(),
      };

      return c.json(responseHouse, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

router.openapi(
  getHouseMembersRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof getHouseMembersRoute>> => {
    try {
      const userId = c.var.userId;
      const { id } = c.req.valid("param");

      const check = await verifyHouseAccess(userId, id, ["OWNER", "COLLABORATOR", "VIEWER"]);
      if (!check.success) {
        return c.json(forbidden(check.error || "Access denied"), 403);
      }

      const membersList = await db
        .select({
          id: houseMemberships.id,
          role: houseMemberships.role,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(houseMemberships)
        .innerJoin(users, eq(houseMemberships.userId, users.id))
        .where(eq(houseMemberships.houseId, id));

      return c.json(membersList, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

router.openapi(
  shareHouseRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof shareHouseRoute>> => {
    try {
      const userId = c.var.userId;
      const { id } = c.req.valid("param");
      const payload = c.req.valid("json");

      const check = await verifyHouseAccess(userId, id, ["OWNER"]);
      if (!check.success) {
        return c.json(forbidden(check.error || "Access denied"), 403);
      }

      // 1. Find user by email, or create a mock collaborator user if not found
      let [targetUser] = await db.select().from(users).where(eq(users.email, payload.email));

      if (!targetUser) {
        const defaultName = payload.email.split("@")[0] || "Convidado";
        const [newCollabUser] = await db
          .insert(users)
          .values({
            email: payload.email,
            name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
          })
          .returning();

        if (!newCollabUser) {
          return c.json(badRequest("Failed to create invited user"), 400);
        }
        targetUser = newCollabUser;
      }

      // 2. Check if already a member
      const [existingMembership] = await db
        .select()
        .from(houseMemberships)
        .where(and(eq(houseMemberships.userId, targetUser.id), eq(houseMemberships.houseId, id)));

      if (existingMembership) {
        // Update role
        const [updated] = await db
          .update(houseMemberships)
          .set({ role: payload.role })
          .where(eq(houseMemberships.id, existingMembership.id))
          .returning();

        return c.json({ success: true, membershipId: updated.id }, 201);
      }

      // 3. Create new membership
      const [newMembership] = await db
        .insert(houseMemberships)
        .values({
          userId: targetUser.id,
          houseId: id,
          role: payload.role,
        })
        .returning();

      if (!newMembership) {
        return c.json(badRequest("Failed to create membership mapping"), 400);
      }

      return c.json({ success: true, membershipId: newMembership.id }, 201);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

router.openapi(
  deleteHouseMemberRoute,
  async (c): Promise<RouteConfigToTypedResponse<typeof deleteHouseMemberRoute>> => {
    try {
      const userId = c.var.userId;
      const { id, membershipId } = c.req.valid("param");

      const check = await verifyHouseAccess(userId, id, ["OWNER"]);
      if (!check.success) {
        // Check if user is removing themselves (which is allowed for COLLABORATORS / VIEWERS)
        const [userMembership] = await db
          .select()
          .from(houseMemberships)
          .where(
            and(
              eq(houseMemberships.id, membershipId),
              eq(houseMemberships.userId, userId),
              eq(houseMemberships.houseId, id),
            ),
          );

        if (!userMembership) {
          return c.json(forbidden("Access denied. Insufficient permissions."), 403);
        }
      }

      // Check if membership exists
      const [targetMembership] = await db
        .select()
        .from(houseMemberships)
        .where(and(eq(houseMemberships.id, membershipId), eq(houseMemberships.houseId, id)));

      if (!targetMembership) {
        return c.json(notFound("Membership"), 404);
      }

      // Enforce that a house must have at least one owner remaining
      if (targetMembership.role === "OWNER") {
        const ownersCount = await db
          .select()
          .from(houseMemberships)
          .where(and(eq(houseMemberships.houseId, id), eq(houseMemberships.role, "OWNER")));

        if (ownersCount.length <= 1) {
          return c.json(badRequest("Cannot remove the sole owner of the house."), 400);
        }
      }

      await db.delete(houseMemberships).where(eq(houseMemberships.id, membershipId));

      return c.json({ success: true }, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Database error";
      return c.json(badRequest(message), 400);
    }
  },
);

export { router as housesRouter };
