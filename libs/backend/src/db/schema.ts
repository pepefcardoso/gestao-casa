import { integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const uuidSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, {
    message: "Invalid UUID",
  });

export const houses = pgTable("houses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  totalArea: numeric("total_area"),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
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
  latitude: z
    .preprocess((val: unknown): number | undefined => {
      if (val === null || val === undefined || val === "") return undefined;
      return Number(val);
    }, z.number().optional())
    .optional(),
  longitude: z
    .preprocess((val: unknown): number | undefined => {
      if (val === null || val === undefined || val === "") return undefined;
      return Number(val);
    }, z.number().optional())
    .optional(),
})
  .refine(
    (data): boolean => {
      if (data.totalArea === undefined || data.totalArea === null) return true;
      return data.totalArea > 0;
    },
    {
      message: "Total area must be greater than 0",
      path: ["totalArea"],
    },
  )
  .refine(
    (data): boolean => {
      if (data.latitude === undefined || data.latitude === null) return true;
      return data.latitude >= -90 && data.latitude <= 90;
    },
    {
      message: "Latitude must be between -90 and 90",
      path: ["latitude"],
    },
  )
  .refine(
    (data): boolean => {
      if (data.longitude === undefined || data.longitude === null) return true;
      return data.longitude >= -180 && data.longitude <= 180;
    },
    {
      message: "Longitude must be between -180 and 180",
      path: ["longitude"],
    },
  );

export type House = typeof houses.$inferSelect;
export type NewHouse = typeof houses.$inferInsert;

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
  houseId: uuidSchema.optional(),
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

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;

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
  adminFee: numeric("admin_fee"),
  mipRate: numeric("mip_rate"),
  dfiRate: numeric("dfi_rate"),
  trRate: numeric("tr_rate"),
  interestMethod: text("interest_method"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const selectFinancingSchema = createSelectSchema(financing, {
  amortizationSystem: z.enum(["SAC", "PRICE"]),
  interestMethod: z.enum(["compound", "linear"]).nullable().optional(),
});

export const insertFinancingSchema = createInsertSchema(financing, {
  houseId: uuidSchema,
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
        return Number.isInteger(val) && val >= 1 && val <= 420;
      },
      {
        message: "Term months must be an integer between 1 and 420",
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
  adminFee: z
    .preprocess((val: unknown): number | undefined => {
      if (val === null || val === undefined || val === "") return undefined;
      return Number(val);
    }, z.number().optional())
    .optional(),
  mipRate: z
    .preprocess((val: unknown): number | undefined => {
      if (val === null || val === undefined || val === "") return undefined;
      return Number(val);
    }, z.number().optional())
    .optional(),
  dfiRate: z
    .preprocess((val: unknown): number | undefined => {
      if (val === null || val === undefined || val === "") return undefined;
      return Number(val);
    }, z.number().optional())
    .optional(),
  trRate: z
    .preprocess((val: unknown): number | undefined => {
      if (val === null || val === undefined || val === "") return undefined;
      return Number(val);
    }, z.number().optional())
    .optional(),
  interestMethod: z.enum(["compound", "linear"]).optional(),
}).refine(
  (data): boolean => {
    return data.downPayment < data.propertyValue;
  },
  {
    message: "Down payment must be less than property value",
    path: ["downPayment"],
  },
);

export type Financing = typeof financing.$inferSelect;
export type InsertFinancing = typeof financing.$inferInsert;

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  houseId: uuid("house_id")
    .default("9519c5f5-e74b-49dc-88d9-e484fda2c3c2")
    .notNull()
    .references(() => houses.id, { onDelete: "cascade" }),
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
  houseId: uuidSchema.optional(),
  roomId: uuidSchema.nullable().optional(),
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

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

export const incomes = pgTable("incomes", {
  id: uuid("id").defaultRandom().primaryKey(),
  houseId: uuid("house_id")
    .default("9519c5f5-e74b-49dc-88d9-e484fda2c3c2")
    .notNull()
    .references(() => houses.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount").notNull(),
  status: text("status").notNull(),
  category: text("category").notNull(),
  dueDate: timestamp("due_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const selectIncomeSchema = createSelectSchema(incomes, {
  status: z.enum(["BUDGET", "CONFIRMED"]),
  category: z.enum(["SALARY", "INVESTMENT", "REFUND", "OTHER"]),
});

export const insertIncomeSchema = createInsertSchema(incomes, {
  houseId: uuidSchema.optional(),
  amount: z.preprocess((val: unknown): number => {
    return Number(val);
  }, z.number()),
  status: z.enum(["BUDGET", "CONFIRMED"]),
  category: z.enum(["SALARY", "INVESTMENT", "REFUND", "OTHER"]),
  dueDate: z.preprocess((val: unknown): Date => {
    if (val instanceof Date) return val;
    if (typeof val === "string") return new Date(val);
    return new Date(NaN);
  }, z.date()),
}).refine(
  (data): boolean => {
    return data.amount > 0;
  },
  {
    message: "Amount must be greater than 0",
    path: ["amount"],
  },
);

export type Income = typeof incomes.$inferSelect;
export type InsertIncome = typeof incomes.$inferInsert;

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const selectUserSchema = createSelectSchema(users).omit({ passwordHash: true });
export const insertUserSchema = createInsertSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Auth Validation Schemas (Required by GEMINI.md to be defined in schema.ts)
export const registerUserSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Formato de e-mail inválido"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
  termsAccepted: z.literal(true, {
    message: "Você deve aceitar os termos de uso e política de privacidade",
  }),
});

export const loginUserSchema = z.object({
  email: z.string().email("Formato de e-mail inválido"),
  password: z.string().min(1, "A senha é obrigatória"),
});

export const updateUserProfileSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").optional(),
  email: z.string().email("Formato de e-mail inválido").optional(),
});

export const changeUserPasswordSchema = z.object({
  currentPassword: z.string().min(1, "A senha atual é obrigatória"),
  newPassword: z.string().min(8, "A nova senha deve ter pelo menos 8 caracteres"),
});

export const houseMemberships = pgTable("house_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  houseId: uuid("house_id")
    .notNull()
    .references(() => houses.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "OWNER", "COLLABORATOR", "VIEWER"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const selectHouseMembershipSchema = createSelectSchema(houseMemberships, {
  role: z.enum(["OWNER", "COLLABORATOR", "VIEWER"]),
});

export const insertHouseMembershipSchema = createInsertSchema(houseMemberships, {
  role: z.enum(["OWNER", "COLLABORATOR", "VIEWER"]),
});

export type HouseMembership = typeof houseMemberships.$inferSelect;
export type InsertHouseMembership = typeof houseMemberships.$inferInsert;
