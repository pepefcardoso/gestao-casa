Greetings! As your Software Engineering collaborator, I am here to help you write, review, and refactor code, optimize your architecture, and ensure strict alignment with your project guidelines.

Let's dive into creating the `docs/conventions.md` file. Following our **RPI (Research, Plan, Implement)** workflow, I have analyzed the repository structure, boundary rules, and non-negotiables specified in your documentation.

---

## 1. Research & Clarification

Before writing out the complete `conventions.md`, I want to highlight the core requirements pulled from your existing manifests (`GEMINI.md`, `project-architecture-blueprint.md`, `mvp-spec.md`):

- **Monorepo boundaries** must be strictly documented to avoid import pollution (e.g., preventing `react-dom` inside `apps/mobile`).
- **TypeScript configuration** mandates strict types, explicit return types for _every_ function, and zero `any`.
- **Clean Code standards** require early returns and clear, self-documenting code with comments restricted to explaining _why_ (intent) rather than _what_.
- **Database & API conventions** require Drizzle as the single source of truth, Zod schema derivations via `drizzle-zod`, and automated OpenAPI configurations with Hono.

---

## 2. Plan (Architecture & Layout)

The `docs/conventions.md` file will serve as a definitive guide for both human developers and AI agents. It will be organized into the following clear sections:

1. **Naming Conventions:** System-wide rules for directories, files, components, and variables.
2. **Code Templates & Structural Blueprints:** Concrete code examples for backend schemas, Hono routes, Next.js components, and React Native layouts.
3. **Strict Import & Boundary Rules:** Clear instructions mapping out what can be imported where.
4. **Commenting & Documentation Standards:** Guidelines adhering to the _Clean Code Commenting Standard_.

---

## 3. Implement (Code & Document)

Here is the complete, ready-to-ship `docs/conventions.md` file based on your monorepo parameters. You can copy and paste this directly into your repository.

````markdown
# Coding Conventions & Project Patterns

This document outlines the strict coding standards, architectural patterns, and naming conventions required for the `gestao-casa` monorepo. All development—whether by humans or AI agents—must adhere to these rules to maintain compile-time safety and architectural velocity.

---

## 1. Naming Conventions

### 1.1 Files and Directories

- **Folders / Directories:** Always use `kebab-case` (e.g., `shared-logic`, `api-routes`).
- **Non-UI Source Files:** Always use `kebab-case` for utility files, hooks, routes, and schemas (e.g., `calculate-financing.ts`, `schema.ts`).
- **React UI Components (Web & Mobile):** Always use `kebab-case` for file names containing React components (e.g., `checkout-button.tsx`, `expense-card.tsx`).
- **Next.js App Router Files:** Strictly follow framework defaults (`page.tsx`, `layout.tsx`, `loading.tsx`).

### 1.2 Code Identifiers

- **TypeScript Types / Interfaces / Enums:** Always use `PascalCase` (e.g., `FinancingInstallment`, `House`).
- **Functions & Variables:** Always use `camelCase` (e.g., `calculateTotalWithTax`, `outstandingBalance`).
- **Database Tables & Columns:** Always use `snake_case` to match standard PostgreSQL naming strategies (e.g., `property_value`, `installments_count`).

---

## 2. Code Templates & Structural Blueprints

### 2.1 Backend: Drizzle Schema Definition

All schemas must serve as the single source of truth. Derive Zod validation elements using `drizzle-zod`. Do not duplicate definitions.

```typescript
import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const houses = pgTable("houses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  totalArea: numeric("total_area"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Explicit schema derivation
export const selectHouseSchema = createSelectSchema(houses);
export const insertHouseSchema = createInsertSchema(houses).extend({
  name: z.string().min(1, "House name cannot be empty"),
});

// Explicit type exportations
export type House = z.infer<typeof selectHouseSchema>;
export type InsertHouse = z.infer<typeof insertHouseSchema>;
```
````

### 2.2 Backend: Hono OpenAPI Router

Every route must declare an explicit return type of `Promise<Response>` or `Response`. Use `@hono/zod-openapi` structures.

```typescript
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { insertHouseSchema, selectHouseSchema } from "../../db/schema";
import { z } from "zod";

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
      content: { "application/json": { schema: selectHouseSchema } },
      description: "House created successfully",
    },
    400: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "Invalid input payload",
    },
  },
});

router.openapi(createHouseRoute, async (c): Promise<Response> => {
  const payload = c.req.valid("json");
  // Database infrastructure calls happen here
  return c.json({ id: "uuid", ...payload, createdAt: new Date() }, 201);
});

export { router as housesRouter };
```

### 2.3 Shared Logic: Pure Utility Functions

Shared functions must possess **explicit return types** and implement **early returns** over nested statements. No side effects or platform bindings are permitted.

```typescript
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

### 2.4 Web Architecture (`apps/web`)

- Default to Server Components. Use `'use client'` explicitly only when utilizing component state or runtime React hooks.
- Enforce Tailwind CSS atomic styles. No raw inline styling dictionaries.

```typescript
"use client";

import { useState } from "react";

interface CounterProps {
  initialCount: number;
}

export function InteractionCounter({ initialCount }: CounterProps): React.JSX.Element {
  const [count, setCount] = useState<number>(initialCount);

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-mint-slate-400">
      <p className="text-sm font-mono text-slate-800">Total: {count}</p>
      <button onClick={() => setCount((prev) => prev + 1)} className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded">
        Increment
      </button>
    </div>
  );
}
```

### 2.5 Mobile Architecture (`apps/mobile`)

- Strictly leverage primitive layout sheets from React Native.
- Never declare, run, or call DOM utilities or `react-dom` modules.

```typescript
import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";

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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#8fa3a3",
  },
  label: {
    fontSize: 12,
    color: "#8fa3a3",
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0e1717",
  },
});
```

---

## 3. Strict Import & Boundary Rules

Nx graph boundary rules are strictly validated during compilation sweeps. Ensure compliance prior to establishing new file imports:

- **`apps/web`** can consume `libs/shared-logic`. It can only consume structural TypeScript types from `libs/backend` via API network links. **Never import `react-native` packages here.**
- **`apps/mobile`** can consume `libs/shared-logic`. It can only consume structural TypeScript types from `libs/backend` via API network links. **Never import `react-dom` or web browser constructs here.**
- **`libs/backend`** can consume `libs/shared-logic`. It has **no access** to React contexts, frontend web frameworks, or mobile view trees.
- **`libs/shared-logic`** is fully platform-agnostic. It cannot import from any application platform wrapper or backend infrastructure layout.

---

## 4. Commenting & Documentation Standards

Code must remain self-documenting through highly expressive naming conventions for functions, variables, and modules.

### 4.1 What to Avoid

Do not write repetitive or redundant comments that explain _what_ the code is executing line-by-line:

```typescript
// ❌ BAD
// Increment the counter by one
setCount(count + 1);
```

### 4.2 What to Document

Restrict inline block code comments **exclusively** to describing _why_ a particular snippet is implemented (business logic overrides, architectural edge-cases, non-obvious mathematical steps, or platform workarounds):

```typescript
// ✅ GOOD
// The financial engine distributes the remaining rounding delta across intermediate rows
// (2 to N-1) as mandated by mortgage amortization rules to ensure overall balance parity.
const distributedDelta = remainingDelta / (totalMonths - 2);
```

```

```
