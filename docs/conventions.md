# Coding Conventions & Project Patterns

This document outlines the strict coding standards, architectural patterns, and naming conventions required for the `gestao-casa` monorepo. All development — whether by humans or AI agents — must adhere to these rules to maintain compile-time safety and architectural velocity.

---

## 1. Naming Conventions

### 1.1 Files and Directories

- **Folders / Directories:** Always `kebab-case` (e.g., `shared-logic`, `api-routes`).
- **Non-UI Source Files:** Always `kebab-case` for utility files, hooks, routes, and schemas (e.g., `calculate-financing.ts`, `schema.ts`).
- **React UI Components (Web & Mobile):** Always `kebab-case` for file names (e.g., `checkout-button.tsx`, `expense-card.tsx`).
- **Next.js App Router Files:** Strictly follow framework defaults (`page.tsx`, `layout.tsx`, `loading.tsx`, `actions.ts`).

### 1.2 Code Identifiers

- **TypeScript Types / Interfaces / Enums:** Always `PascalCase` (e.g., `FinancingInstallment`, `House`).
- **Functions & Variables:** Always `camelCase` (e.g., `calculateTotalWithTax`, `outstandingBalance`).
- **Database Tables & Columns:** Always `snake_case` to match standard PostgreSQL naming (e.g., `property_value`, `installments_count`).

### 1.3 Exports

- **No default exports anywhere.** Named exports are mandatory in every file. This prevents agents from inventing inconsistent import aliases and ensures automated refactoring tools work correctly.

```typescript
// ❌ BAD
export default function UserCard() {}

// ✅ GOOD
export function UserCard() {}
```

---

## 2. Code Templates & Structural Blueprints

### 2.1 Backend: Drizzle Schema Definition

Use `$inferSelect` / `$inferInsert` for pure TypeScript types. Use `drizzle-zod` only when a runtime Zod validator is required (API input, form validation). Never define Zod schemas for DB entities manually.

```typescript
// libs/backend/src/db/schema.ts
import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const houses = pgTable("houses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  totalArea: numeric("total_area"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Preferred: $inferSelect / $inferInsert for TypeScript types (no drizzle-zod needed)
export type House = typeof houses.$inferSelect;
export type NewHouse = typeof houses.$inferInsert;

// drizzle-zod only when runtime validation is required
export const insertHouseSchema = createInsertSchema(houses).extend({
  name: z.string().min(1, "House name cannot be empty"),
});
export type InsertHouseInput = z.infer<typeof insertHouseSchema>;
```

### 2.2 Backend: Centralized Error Factory

All routes must use the error factory in `libs/backend/src/api/errors.ts`. Agents must never construct inline error objects in route handlers.

```typescript
// libs/backend/src/api/errors.ts
import { z } from "zod";

export const ErrorSchema = z.object({ error: z.string(), code: z.string().optional() });
export type ApiError = z.infer<typeof ErrorSchema>;

export function notFound(resource: string): ApiError {
  return { error: `${resource} not found`, code: "NOT_FOUND" };
}

export function badRequest(message: string): ApiError {
  return { error: message, code: "BAD_REQUEST" };
}

export function internalError(): ApiError {
  return { error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
}
```

### 2.3 Backend: Hono OpenAPI Router

Every route file must follow this structure. Return type `Promise<Response>` is mandatory on every handler. All error responses use the shared `ErrorSchema` from the error factory.

```typescript
// libs/backend/src/api/routes/houses.ts
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { insertHouseSchema } from "../../db/schema";
import type { House } from "../../db/schema";
import { ErrorSchema, notFound, badRequest } from "../errors";

const router = new OpenAPIHono();

const createHouseRoute = createRoute({
  method: "post",
  path: "/houses",
  request: {
    body: {
      content: { "application/json": { schema: insertHouseSchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: insertHouseSchema } },
      description: "House created successfully",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid input payload",
    },
  },
});

router.openapi(createHouseRoute, async (c): Promise<Response> => {
  const payload = c.req.valid("json");
  // db logic here
  const house: House = { id: "uuid", createdAt: new Date(), totalArea: null, ...payload };
  return c.json(house, 201);
});

export { router as housesRouter };
```

### 2.4 Shared Logic: Pure Utility Functions

All functions in `libs/shared-logic` must be pure (no side effects, no platform bindings) and use explicit return types and early returns. Every utility must have a corresponding `.test.ts` file.

```typescript
// libs/shared-logic/src/utils/calculate-tax.ts
export interface TaxConfig {
  rate: number;
  exemptIds: string[];
}

export function calculateTotalWithTax(subtotal: number, userId: string, config: TaxConfig): number {
  if (subtotal <= 0) return 0;
  if (config.exemptIds.includes(userId)) return subtotal;
  return subtotal * (1 + config.rate);
}
```

```typescript
// libs/shared-logic/src/utils/calculate-tax.test.ts
import { describe, it, expect } from "vitest";
import { calculateTotalWithTax } from "./calculate-tax";

const config = { rate: 0.1, exemptIds: ["exempt-user"] } satisfies Parameters<typeof calculateTotalWithTax>[2];

describe("calculateTotalWithTax", () => {
  it("returns 0 for non-positive subtotals", () => {
    expect(calculateTotalWithTax(0, "user-1", config)).toBe(0);
    expect(calculateTotalWithTax(-5, "user-1", config)).toBe(0);
  });
  it("returns subtotal unchanged for exempt users", () => {
    expect(calculateTotalWithTax(100, "exempt-user", config)).toBe(100);
  });
  it("applies tax rate to non-exempt users", () => {
    expect(calculateTotalWithTax(100, "user-1", config)).toBe(110);
  });
});
```

### 2.5 Web: Data Fetching & Mutations

Server components fetch data directly. Mutations go through `actions.ts` files with the `'use server'` directive. No raw `fetch()` calls inside client or shared components — always use the generated API client.

```typescript
// apps/web/app/houses/page.tsx
import { apiClient } from "@gestao-casa/shared-logic/api-client";
import type { House } from "@gestao-casa/backend/db";

export default async function HousesPage(): Promise<React.JSX.Element> {
  const houses = await apiClient.get<House[]>("/houses");
  return <main className="min-h-screen bg-[#F5F5F7] px-6 py-8">{/* render houses */}</main>;
}
```

```typescript
// apps/web/app/houses/actions.ts
"use server";

import { apiClient } from "@gestao-casa/shared-logic/api-client";
import type { InsertHouseInput } from "@gestao-casa/backend/db";

export async function createHouseAction(payload: InsertHouseInput): Promise<void> {
  await apiClient.post("/houses", payload);
}
```

### 2.6 Web: Client Components

Default to Server Components. Add `'use client'` only when using state or browser APIs. Tailwind atomic utilities only — no inline `style` objects.

```typescript
// apps/web/app/components/features/interaction-counter.tsx
"use client";

import { useState } from "react";

interface CounterProps {
  initialCount: number;
}

export function InteractionCounter({ initialCount }: CounterProps): React.JSX.Element {
  const [count, setCount] = useState<number>(initialCount);

  return (
    <div className="p-4 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <p className="text-sm font-medium tabular-nums text-[#1D1D1F]">Total: {count}</p>
      <button onClick={() => setCount((prev) => prev + 1)} className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-full active:scale-95 transition-transform">
        Increment
      </button>
    </div>
  );
}
```

### 2.7 Mobile: Components

Use only React Native primitives. Never import `react-dom` or any DOM-dependent package. Use `StyleSheet.create()` with explicit types.

```typescript
// apps/mobile/components/info-card.tsx
import { StyleSheet, Text, View } from "react-native";

interface InfoCardProps {
  label: string;
  value: string;
}

export function InfoCard({ label, value }: InfoCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    color: "#86868B",
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1D1D1F",
  },
});
```

---

## 3. Import Rules

### 3.1 Boundary Summary

- **`apps/web`** → may import `libs/shared-logic` (runtime) and `libs/backend` (`import type` only). Never import `react-native` or any RN package.
- **`apps/mobile`** → may import `libs/shared-logic` (runtime) and `libs/backend` (`import type` only). Never import `react-dom` or any DOM package.
- **`libs/backend`** → may import `libs/shared-logic`. No React, no `react-dom`, no `react-native`.
- **`libs/shared-logic`** → no internal imports. No platform APIs (`window`, `document`, `AsyncStorage`, `expo-*`).

### 3.2 No Barrel Files

Barrel `index.ts` files are banned in all `libs/` packages. Always use direct path imports. This prevents circular dependencies and avoids forcing agents to load entire library surfaces.

```typescript
// ❌ BAD
import { calculateTotalWithTax } from "@gestao-casa/shared-logic";

// ✅ GOOD
import { calculateTotalWithTax } from "@gestao-casa/shared-logic/utils/calculate-tax";
```

### 3.3 `import type` for Cross-Boundary Types

When consuming types from `libs/backend` in an app package, always use `import type`. This is the only permitted form and is enforced by `@nx/enforce-module-boundaries`.

```typescript
// ✅ GOOD — type-only import, erased at compile time
import type { House } from "@gestao-casa/backend/db";

// ❌ BAD — imports runtime code across the boundary
import { houses } from "@gestao-casa/backend/db";
```

---

## 4. Commenting & Documentation Standards

Code must remain self-documenting through expressive naming conventions. Comments are restricted to explaining **why** — never what.

### 4.1 What to Avoid

```typescript
// ❌ BAD — explains what the code does, not why
// Increment the counter by one
setCount(count + 1);
```

### 4.2 What to Document

```typescript
// ✅ GOOD — explains a non-obvious business rule
// The financial engine distributes the remaining rounding delta across intermediate rows
// (2 to N-1) as mandated by mortgage amortization rules to ensure overall balance parity.
const distributedDelta = remainingDelta / (totalMonths - 2);
```

---

## 5. Testing Conventions

All testing uses **Vitest**. The DI pattern makes pure function tests trivial — no mocking infrastructure required.

| Scope          | Location                                         | Notes                                      |
| -------------- | ------------------------------------------------ | ------------------------------------------ |
| Pure utils     | `libs/shared-logic/src/utils/<name>.test.ts`     | Input/output only, zero mocks              |
| Shared hooks   | `libs/shared-logic/src/hooks/<name>.test.ts`     | `renderHook` from `@testing-library/react` |
| API routes     | `libs/backend/src/api/routes/<resource>.test.ts` | Hono `app.request()` test helper           |
| Web components | `apps/web/app/components/**/<name>.test.tsx`     | `@testing-library/react`                   |

Every new function added to `libs/shared-logic` must be accompanied by a co-located `.test.ts` file.
