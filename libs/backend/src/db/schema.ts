import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const houses = pgTable("houses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  totalArea: numeric("total_area"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const selectHouseSchema = createSelectSchema(houses);

export const insertHouseSchema = createInsertSchema(houses, {
  totalArea: z
    .preprocess((val: unknown): number | undefined => {
      if (val === null || val === undefined || val === "") return undefined;
      return Number(val);
    }, z.number())
    .optional(),
}).refine(
  (data): boolean => {
    if (data.totalArea === undefined || data.totalArea === null) return true;
    return data.totalArea > 0;
  },
  {
    message: "Total area must be greater than 0",
    path: ["totalArea"],
  },
);

export type House = z.infer<typeof selectHouseSchema>;

export const rooms = pgTable("rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  houseId: uuid("house_id")
    .notNull()
    .references(() => houses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  area: numeric("area"),
  colorCode: text("color_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const selectRoomSchema = createSelectSchema(rooms);

export const insertRoomSchema = createInsertSchema(rooms, {
  houseId: z.string().uuid().optional(),
  area: z
    .preprocess((val: unknown): number | undefined => {
      if (val === null || val === undefined || val === "") return undefined;
      return Number(val);
    }, z.number())
    .optional(),
}).refine(
  (data): boolean => {
    if (data.area === undefined || data.area === null) return true;
    return data.area > 0;
  },
  {
    message: "Room area must be greater than 0",
    path: ["area"],
  },
);

export type Room = z.infer<typeof selectRoomSchema>;
