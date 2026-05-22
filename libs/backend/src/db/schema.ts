import { integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
    }, z.number().optional())
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
    }, z.number().optional())
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

export const financing = pgTable("financing", {
  id: uuid("id").defaultRandom().primaryKey(),
  houseId: uuid("house_id")
    .notNull()
    .references(() => houses.id, { onDelete: "cascade" })
    .unique(),
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
  houseId: z.string().uuid(),
  propertyValue: z
    .preprocess((val: unknown): number => {
      return Number(val);
    }, z.number())
    .refine(
      (val: number): boolean => {
        return val > 0;
      },
      {
        message: "Property value must be greater than 0",
      },
    ),
  downPayment: z
    .preprocess((val: unknown): number => {
      return Number(val);
    }, z.number())
    .refine(
      (val: number): boolean => {
        return val >= 0;
      },
      {
        message: "Down payment must be greater than or equal to 0",
      },
    ),
  termMonths: z
    .preprocess((val: unknown): number => {
      return Number(val);
    }, z.number())
    .refine(
      (val: number): boolean => {
        return Number.isInteger(val) && val >= 1 && val <= 360;
      },
      {
        message: "Term months must be an integer between 1 and 360",
      },
    ),
  interestRate: z.preprocess((val: unknown): number => {
    return Number(val);
  }, z.number()),
  amortizationSystem: z.enum(["SAC", "PRICE"]),
  firstParcelOverride: z
    .preprocess((val: unknown): number | undefined => {
      if (val === null || val === undefined || val === "") return undefined;
      return Number(val);
    }, z.number().optional())
    .optional(),
  lastParcelOverride: z
    .preprocess((val: unknown): number | undefined => {
      if (val === null || val === undefined || val === "") return undefined;
      return Number(val);
    }, z.number().optional())
    .optional(),
}).refine(
  (data): boolean => {
    return data.downPayment < data.propertyValue;
  },
  {
    message: "Down payment must be less than property value",
    path: ["downPayment"],
  },
);

export type Financing = z.infer<typeof selectFinancingSchema>;
export type InsertFinancing = z.infer<typeof insertFinancingSchema>;

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").references(() => rooms.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  installmentsCount: integer("installments_count").notNull(),
  status: text("status").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull(),
  dueDate: timestamp("due_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const selectExpenseSchema = createSelectSchema(expenses, {
  status: z.enum(["BUDGET", "CONFIRMED"]),
  category: z.enum(["TAX", "PRODUCT", "SERVICE", "FURNITURE", "APPLIANCE", "RENOVATION"]),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
});

export const insertExpenseSchema = createInsertSchema(expenses, {
  roomId: z.string().uuid().nullable().optional(),
  totalAmount: z
    .preprocess((val: unknown): number => {
      return Number(val);
    }, z.number())
    .refine(
      (val: number): boolean => {
        return val > 0;
      },
      {
        message: "Total amount must be greater than 0",
      },
    ),
  installmentsCount: z
    .preprocess((val: unknown): number => {
      return Number(val);
    }, z.number())
    .refine(
      (val: number): boolean => {
        return Number.isInteger(val) && val >= 1 && val <= 360;
      },
      {
        message: "Installments count must be between 1 and 360",
      },
    ),
  status: z.enum(["BUDGET", "CONFIRMED"]),
  category: z.enum(["TAX", "PRODUCT", "SERVICE", "FURNITURE", "APPLIANCE", "RENOVATION"]),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  dueDate: z.preprocess((val: unknown): Date => {
    if (val instanceof Date) return val;
    if (typeof val === "string") return new Date(val);
    return new Date(NaN);
  }, z.date()),
});

export type Expense = z.infer<typeof selectExpenseSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
