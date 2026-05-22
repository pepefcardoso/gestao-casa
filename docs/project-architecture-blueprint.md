# Project Architecture Blueprint: AI-Optimized Cross-Platform Application

This document defines the definitive technical stack, architectural rules, and design patterns for the codebase. This repository is designed for a hybrid developer-agent workflow. The primary objective is to maximize **AI Agent Efficiency (AX)** by reducing token consumption, eliminating architectural ambiguity, and enforcing compile-time constraints that guide LLM reasoning.

---

## 1. System Overview & Core Stack

The system is a cross-platform application (Web and Mobile) managed within a unified Nx monorepo. Every architectural choice ensures that AI agents can read, modify, and test code with minimal context switching and zero hallucination.

```
                  ┌─────────────────────────────────────────┐
                  │               Nx Monorepo               │
                  └─────────────────────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
   ┌───────────┐                 ┌───────────┐                 ┌───────────┐
   │ apps/web  │                 │libs/shared│                 │apps/mobile│
   │ (Next.js) │                 │  (Logic)  │                 │  (Expo)   │
   └─────┬─────┘                 └─────┬─────┘                 └─────┬─────┘
         │                             │                             │
         └─────────────────┐           │           ┌─────────────────┘
                           ▼           ▼           ▼
                     ┌───────────────────────────────────┐
                     │           libs/backend            │
                     │  (Hono, Drizzle ORM, Zod Schema)  │
                     └───────────────────────────────────┘
```

### Core Technologies

| Layer            | Technology                 | Purpose                                                                |
| ---------------- | -------------------------- | ---------------------------------------------------------------------- |
| Monorepo         | Nx                         | Dependency graph, boundary enforcement, task orchestration             |
| Language         | TypeScript (strict)        | Explicit types eliminate agent inference errors                        |
| Web              | Next.js App Router         | Web-only presentation layer                                            |
| Mobile           | Expo + Expo Router         | Mobile-only presentation layer                                         |
| API              | Hono + `@hono/zod-openapi` | Self-documenting typed REST                                            |
| ORM              | Drizzle ORM                | Pure TS schema — no binary engines, fully readable by agents           |
| Validation       | Zod                        | Single validation layer shared across API and business logic           |
| Linter/Formatter | Biome                      | Unified, zero-config formatting — agents emit logic, Biome fixes style |

---

## 2. Directory Architecture

The file structure dictates what context an agent needs to load to perform a task. Each directory has a single, unambiguous responsibility.

```
├── GEMINI.md                    # Agent micro-instructions (loaded automatically)
├── biome.json                   # Formatting and lint rules
├── nx.json                      # Workspace dependency graph
├── docs/
│   ├── backlog.md               # Sprint tasks with status and acceptance criteria
│   ├── conventions.md           # Naming, patterns, and code templates
│   ├── design.md                # Color palette, typography, component states
│   ├── mvp-spec.md              # Product requirements and entity mapping
│   ├── project-architecture-blueprint.md  # This file
│   └── use-cases.md             # Detailed UC flows with business rules
├── apps/
│   ├── web/                     # Next.js — web-only presentation
│   │   └── app/
│   └── mobile/                  # Expo — mobile-only presentation
│       └── app/
└── libs/
    ├── backend/                 # Drizzle schemas, migrations, Hono routers
    │   └── src/
    │       ├── db/              # schema.ts — single source of truth for all types
    │       └── api/             # Hono OpenAPI route definitions
    └── shared-logic/            # Pure TS platform-agnostic business logic
        └── src/
            ├── hooks/           # Shareable React hooks (state machines, calculations)
            └── utils/           # Pure functions (no side effects, no platform deps)
```

### Canonical File Paths (Agent Reference)

| Artifact              | Canonical Path                              |
| --------------------- | ------------------------------------------- |
| DB schema + Zod types | `libs/backend/src/db/schema.ts`             |
| API route (resource)  | `libs/backend/src/api/routes/<resource>.ts` |
| Shared pure function  | `libs/shared-logic/src/utils/<name>.ts`     |
| Shared React hook     | `libs/shared-logic/src/hooks/use-<name>.ts` |
| Web page              | `apps/web/app/<route>/page.tsx`             |
| Web component         | `apps/web/app/components/<name>.tsx`        |
| Mobile screen         | `apps/mobile/app/<route>.tsx`               |
| Mobile component      | `apps/mobile/components/<name>.tsx`         |

---

## 3. Dependency Boundary Rules

Nx tags enforce compiler-level errors when boundaries are crossed. These rules are **absolute** — no exceptions.

| Package             | Can import from                                                       | Cannot import from                                      |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| `apps/web`          | `libs/shared-logic`, `libs/backend` (types only, via HTTP at runtime) | `apps/mobile`, `react-native`, any RN ecosystem package |
| `apps/mobile`       | `libs/shared-logic`, `libs/backend` (types only, via HTTP at runtime) | `apps/web`, `react-dom`, any DOM API                    |
| `libs/backend`      | `libs/shared-logic`                                                   | `apps/*`, `react`, `react-dom`, `react-native`          |
| `libs/shared-logic` | nothing internal                                                      | `apps/*`, `libs/backend`, platform APIs                 |

**Agent rule:** before adding an import, verify the target path is within the allowed boundaries above. If not, the logic must be moved to `libs/shared-logic` or accessed via the HTTP API.

---

## 4. TypeScript Rules

Strict mode is non-negotiable. The following rules prevent agents from emitting ambiguous or unsafe code.

### Explicit Return Types (mandatory)

```typescript
// ❌ BAD — agent must parse the entire body to infer the output shape
export function fetchUserData(userId: string) {
  return db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .then((r) => r[0]);
}

// ✅ GOOD — type boundary is visible at the signature line
import type { User } from "@gestao-casa/backend/db";

export async function fetchUserData(userId: string): Promise<User | null> {
  const result = await db.select().from(users).where(eq(users.id, userId));
  return result[0] ?? null;
}
```

### No `any` (enforced by Biome)

Use `unknown` with a Zod type guard when the type is genuinely dynamic:

```typescript
// ❌ BAD
function parsePayload(raw: any): void { ... }

// ✅ GOOD
import { z } from "zod";

const PayloadSchema = z.object({ amount: z.number(), description: z.string() });

function parsePayload(raw: unknown): z.infer<typeof PayloadSchema> {
  return PayloadSchema.parse(raw);
}
```

### Early Returns (guard clauses)

```typescript
// ❌ BAD — nested branches increase reasoning complexity for agents
function processOrder(order) {
  if (order) {
    if (order.isPaid) {
      return ship(order);
    } else {
      return triggerPayment(order);
    }
  }
}

// ✅ GOOD — flat linear execution paths
function processOrder(order: Order | null): ProcessResult | null {
  if (!order) return null;
  if (!order.isPaid) return triggerPayment(order);
  return ship(order);
}
```

---

## 5. Database & API Layer

### Drizzle ORM — Schema as Single Source of Truth

All Zod schemas and TypeScript types for the domain are **derived from the Drizzle schema**, never written by hand. This eliminates drift between DB shape and validation logic.

```typescript
// libs/backend/src/db/schema.ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const selectUserSchema = createSelectSchema(users);
export const insertUserSchema = createInsertSchema(users);
export type User = z.infer<typeof selectUserSchema>;
```

**Agent rule:** never define a Zod schema for a DB entity manually. Always derive it from the Drizzle table definition using `createSelectSchema` / `createInsertSchema`.

### Hono OpenAPI — Route Structure

Every route file must follow this structure. The OpenAPI spec is generated automatically from the Zod schemas — never written by hand.

```typescript
// libs/backend/src/api/routes/users.ts
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { selectUserSchema, insertUserSchema } from "../../db/schema";
import { z } from "zod";

const router = new OpenAPIHono();

const getUserRoute = createRoute({
  method: "get",
  path: "/users/{id}",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: selectUserSchema } },
      description: "Retrieve the user",
    },
    404: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "User not found",
    },
  },
});

router.openapi(getUserRoute, async (c): Promise<Response> => {
  const { id } = c.req.valid("param");
  // db logic here
  return c.json({ ... }, 200);
});

export { router as usersRouter };
```

---

## 6. Design Patterns

### Locality of Behavior

UI-specific state and JSX are co-located with the component. Agents should not split a component across `Component.tsx`, `useComponent.ts`, and `types.ts` unless the hook is genuinely reusable in `libs/shared-logic`.

```typescript
// apps/web/app/components/checkout-button.tsx
"use client";

import { useState } from "react";

type ButtonState = "idle" | "loading" | "success" | "error";

export function CheckoutButton({ cartId }: { cartId: string }): React.JSX.Element {
  const [status, setStatus] = useState<ButtonState>("idle");

  async function handleCheckout(): Promise<void> {
    setStatus("loading");
    try {
      // checkout logic
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <button disabled={status === "loading"} onClick={handleCheckout} className="px-4 py-2 bg-emerald-600 text-white rounded">
      {status === "loading" ? "Processando..." : "Confirmar"}
    </button>
  );
}
```

### Explicit Dependency Injection

Core business logic must receive all dependencies as parameters. This makes agent-generated unit tests trivially easy to write without mocking globals.

```typescript
// libs/shared-logic/src/utils/calculate-tax.ts
export interface TaxConfig {
  rate: number;
  exemptIds: string[];
}

export function calculateTotalWithTax(subtotal: number, userId: string, config: TaxConfig): number {
  if (config.exemptIds.includes(userId)) return subtotal;
  return subtotal * (1 + config.rate);
}
```

---

## 7. Platform-Specific Constraints

### Web (`apps/web`)

- Styles: **Tailwind CSS atomic utilities only.** No inline `style` objects, no CSS modules, no styled-components.
- Charts: `recharts` primitives only (unstyled wrappers). No heavy charting libraries.
- Icons: `lucide-react`.
- Server components by default; add `'use client'` only when the component uses state or browser APIs.

### Mobile (`apps/mobile`)

- Layout: `<View>`, `<Text>`, `<TouchableOpacity>`, `<ScrollView>`, `<FlatList>` — no DOM elements.
- Styles: React Native `StyleSheet.create()` or inline style objects with explicit types.
- Icons: `@expo/vector-icons` (Lucide variant).
- **Never import `react-dom` or any package that depends on it.**
- Sliders: native `<Slider>` from `@react-native-community/slider`.

---

## 8. Agent Task Execution Checklist

Before writing any code, an agent must validate compliance with this matrix:

| Task Type           | Target Path                                 | Pre-conditions                             |
| ------------------- | ------------------------------------------- | ------------------------------------------ |
| Add/modify DB table | `libs/backend/src/db/schema.ts`             | Run migration after schema change          |
| Add API route       | `libs/backend/src/api/routes/<resource>.ts` | Schema types must exist first              |
| Add business logic  | `libs/shared-logic/src/utils/<name>.ts`     | Must be pure function, no side effects     |
| Add shared hook     | `libs/shared-logic/src/hooks/use-<name>.ts` | Hook must be usable by both Web and Mobile |
| Add web UI          | `apps/web/app/<route>/page.tsx`             | Tailwind only, no RN imports               |
| Add mobile UI       | `apps/mobile/app/<route>.tsx`               | RN components only, no DOM imports         |

**Before every task:**

1. Read `GEMINI.md` for agent instructions.
2. Read `docs/backlog.md` to confirm task status and acceptance criteria.
3. Read `libs/backend/src/db/schema.ts` for current type definitions.
4. Read `docs/conventions.md` for naming and patterns.
