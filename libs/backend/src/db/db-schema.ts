import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const houses = pgTable("houses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  totalArea: numeric("total_area"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const selectHouseSchema = createSelectSchema(houses);
export const insertHouseSchema = createInsertSchema(houses);
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
export const insertRoomSchema = createInsertSchema(rooms);
export type Room = z.infer<typeof selectRoomSchema>;

export const financing = pgTable("financing", {
  id: uuid("id").defaultRandom().primaryKey(),
  houseId: uuid("house_id")
    .notNull()
    .unique()
    .references(() => houses.id, { onDelete: "cascade" }),
  propertyValue: numeric("property_value").notNull(),
  downPayment: numeric("down_payment").notNull(),
  termMonths: integer("term_months").notNull(),
  interestRate: numeric("interest_rate").notNull(),
  amortizationSystem: text("amortization_system").notNull(),
  firstParcelOverride: numeric("first_parcel_override"),
  lastParcelOverride: numeric("last_parcel_override"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const selectFinancingSchema = createSelectSchema(financing, {
  amortizationSystem: z.enum(["SAC", "PRICE"]),
});
export const insertFinancingSchema = createInsertSchema(financing, {
  amortizationSystem: z.enum(["SAC", "PRICE"]),
});
export type Financing = z.infer<typeof selectFinancingSchema>;

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  installmentsCount: integer("installments_count").default(1).notNull(),
  status: text("status").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull(),
  dueDate: timestamp("due_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const selectExpenseSchema = createSelectSchema(expenses, {
  status: z.enum(["BUDGET", "CONFIRMED"]),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  category: z.enum([
    "TAX",
    "PRODUCT",
    "SERVICE",
    "FURNITURE",
    "APPLIANCE",
    "RENOVATION",
  ]),
});

export const insertExpenseSchema = createInsertSchema(expenses, {
  status: z.enum(["BUDGET", "CONFIRMED"]),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  category: z.enum([
    "TAX",
    "PRODUCT",
    "SERVICE",
    "FURNITURE",
    "APPLIANCE",
    "RENOVATION",
  ]),
});
export type Expense = z.infer<typeof selectExpenseSchema>;
