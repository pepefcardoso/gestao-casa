# Project Architecture Blueprint: AI-Optimized Cross-Platform Application

This document defines the definitive technical stack, architectural rules, and design patterns for the codebase. This repository is designed for a hybrid developer-agent workflow. The primary objective is to maximize **AI Agent Efficiency (AX)** by reducing token consumption, eliminating architectural ambiguity, and enforcing compile-time constraints that guide LLM reasoning.

---

## 1. System Overview & Core Stack

The system is a cross-platform application (Web and Mobile) managed within a unified Nx monorepo (package-based preset). Every architectural choice ensures that AI agents can read, modify, and test code with minimal context switching and zero hallucination.

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

| Layer            | Technology                 | Purpose                                                                                       |
| ---------------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| Monorepo         | Nx (package-based)         | Dependency graph, boundary enforcement, task orchestration                                    |
| Language         | TypeScript (strict)        | Explicit types eliminate agent inference errors                                               |
| Web              | Next.js App Router         | Web-only presentation layer                                                                   |
| Mobile           | Expo + Expo Router         | Mobile-only presentation layer                                                                |
| API              | Hono + `@hono/zod-openapi` | Self-documenting typed REST                                                                   |
| ORM              | Drizzle ORM                | Pure TS schema — no binary engines, fully readable by agents                                  |
| Validation       | Zod                        | Single validation layer shared across API and business logic                                  |
| API Client       | `openapi-ts`               | Generates typed HTTP client from OpenAPI spec — eliminates runtime import boundary violations |
| Linter/Formatter | Biome                      | Unified, zero-config formatting — agents emit logic, Biome fixes style                        |

---

## 2. Directory Architecture

The file structure dictates what context an agent needs to load to perform a task. Each directory has a single, unambiguous responsibility.

```
├── GEMINI.md                    # Agent micro-instructions (loaded automatically)
├── biome.json                   # Formatting and lint rules
├── nx.json                      # Workspace dependency graph (package-based)
├── docs/
│   ├── backlog.md               # Sprint tasks with status and acceptance criteria
│   ├── conventions.md           # Naming, patterns, and code templates
│   ├── design.md                # Color palette, typography, component states
│   ├── mvp-spec.md              # Product requirements and entity mapping
│   ├── project-architecture-blueprint.md  # This file
│   └── use-cases.md             # Detailed UC flows with business rules
├── apps/
│   ├── web/                     # Next.js — web-only presentation
│   │   ├── AGENTS.md            # Lib-level agent instructions for apps/web
│   │   └── app/
│   │       └── components/
│   │           ├── ui/          # Stateless presentational primitives
│   │           ├── features/    # Domain-coupled, stateful components
│   │           └── layouts/     # Page structure components
│   └── mobile/                  # Expo — mobile-only presentation
│       ├── AGENTS.md            # Lib-level agent instructions for apps/mobile
│       └── app/
└── libs/
    ├── backend/                 # Drizzle schemas, migrations, Hono routers
    │   ├── AGENTS.md            # Lib-level agent instructions for libs/backend
    │   └── src/
    │       ├── db/              # schema.ts — single source of truth for all types
    │       └── api/
    │           ├── errors.ts    # Centralized error factory — all routes use this
    │           └── routes/      # Hono OpenAPI route definitions
    └── shared-logic/            # Pure TS platform-agnostic business logic
        ├── AGENTS.md            # Lib-level agent instructions for libs/shared-logic
        └── src/
            ├── api-client/      # Generated typed HTTP client (never edit manually)
            ├── hooks/           # Shareable React hooks (no platform deps)
            └── utils/           # Pure functions (no side effects, no platform deps)
```

### Canonical File Paths (Agent Reference)

| Artifact                        | Canonical Path                                |
| ------------------------------- | --------------------------------------------- |
| DB schema + types               | `libs/backend/src/db/schema.ts`               |
| API route                       | `libs/backend/src/api/routes/<resource>.ts`   |
| API error factory               | `libs/backend/src/api/errors.ts`              |
| Generated API client            | `libs/shared-logic/src/api-client/index.ts`   |
| Shared pure function            | `libs/shared-logic/src/utils/<name>.ts`       |
| Shared React hook               | `libs/shared-logic/src/hooks/use-<name>.ts`   |
| Web page                        | `apps/web/app/<route>/page.tsx`               |
| Web server action / mutation    | `apps/web/app/<route>/actions.ts`             |
| Web component (stateless)       | `apps/web/app/components/ui/<name>.tsx`       |
| Web component (stateful/domain) | `apps/web/app/components/features/<name>.tsx` |
| Web layout component            | `apps/web/app/components/layouts/<name>.tsx`  |
| Mobile screen                   | `apps/mobile/app/<route>.tsx`                 |
| Mobile component                | `apps/mobile/components/<name>.tsx`           |

---

## 3. Dependency Boundary Rules

Nx tags enforce compiler-level errors when boundaries are crossed. These rules are **absolute** — no exceptions. The `@nx/enforce-module-boundaries` lint rule must be configured with explicit tag pairs to enforce the "types only" constraint for `libs/backend` — documentation alone is not sufficient.

| Package             | Can import from                                                                     | Cannot import from                                                                       |
| ------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `apps/web`          | `libs/shared-logic`, `libs/backend` (types only via `import type`, HTTP at runtime) | `apps/mobile`, `react-native`, any RN ecosystem package                                  |
| `apps/mobile`       | `libs/shared-logic`, `libs/backend` (types only via `import type`, HTTP at runtime) | `apps/web`, `react-dom`, any DOM API                                                     |
| `libs/backend`      | `libs/shared-logic`                                                                 | `apps/*`, `react`, `react-dom`, `react-native`                                           |
| `libs/shared-logic` | nothing internal                                                                    | `apps/*`, `libs/backend`, platform APIs (`window`, `document`, `AsyncStorage`, `expo-*`) |

**Agent rule:** before adding an import, verify the target path is within the allowed boundaries above. `import type` is the only permitted form for consuming `libs/backend` from an app package. If logic is needed at runtime, it must be moved to `libs/shared-logic` or accessed via the HTTP API using the generated client.

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

### No Default Exports

Default exports force agents to invent import names, creating inconsistency and breaking automated refactoring. Named exports are mandatory everywhere.

```typescript
// ❌ BAD
export default function UserCard() {}

// ✅ GOOD
export function UserCard() {}
```

### No Barrel Files

Barrel `index.ts` files cause circular dependency risk and force agents to load entire library surfaces when they need a single function. Direct imports are mandatory.

```typescript
// ❌ BAD
import { calculateTotalWithTax } from "@gestao-casa/shared-logic";

// ✅ GOOD
import { calculateTotalWithTax } from "@gestao-casa/shared-logic/utils/calculate-tax";
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

### `satisfies` for Config Objects

Agents often emit untyped config literals. Use `satisfies` to enforce the type contract without widening the inferred type.

```typescript
// ❌ BAD
const taxConfig = { rate: 0.1, exemptIds: [] };

// ✅ GOOD
const taxConfig = {
  rate: 0.1,
  exemptIds: [],
} satisfies TaxConfig;
```

---

## 5. Database & API Layer

### Drizzle ORM — Schema as Single Source of Truth

All TypeScript types for the domain are **derived directly from the Drizzle table** using `$inferSelect` / `$inferInsert`. `drizzle-zod` is used only when a runtime Zod validator is required (e.g., for API input validation). This eliminates drift between DB shape and validation logic.

```typescript
// libs/backend/src/db/schema.ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Prefer $inferSelect / $inferInsert for pure TypeScript types — zero drizzle-zod dependency
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Use drizzle-zod only when a runtime Zod validator is needed (API input, form validation)
export const insertUserSchema = createInsertSchema(users);
export type InsertUserInput = z.infer<typeof insertUserSchema>;
```

**Agent rule:** never define a Zod schema for a DB entity manually. For TypeScript types use `$inferSelect` / `$inferInsert`. For runtime validators use `createInsertSchema` / `createSelectSchema`.

### Centralized Error Factory

All API routes must use the centralized error factory. Agents must never construct error response objects inline.

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

### Hono OpenAPI — Route Structure

Every route file must follow this structure. The OpenAPI spec is generated automatically from the Zod schemas — never written by hand. All error responses must use the `ErrorSchema` from the error factory.

```typescript
// libs/backend/src/api/routes/users.ts
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { insertUserSchema } from "../../db/schema";
import type { User } from "../../db/schema";
import { ErrorSchema, notFound } from "../errors";
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
      content: { "application/json": { schema: insertUserSchema } },
      description: "Retrieve the user",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "User not found",
    },
  },
});

router.openapi(getUserRoute, async (c): Promise<Response> => {
  const { id } = c.req.valid("param");
  // db logic here
  const user: User | undefined = undefined; // replace with actual db call
  if (!user) return c.json(notFound("User"), 404);
  return c.json(user, 200);
});

export { router as usersRouter };
```

### OpenAPI Client Generation

The OpenAPI spec is served at `/api/openapi.json`. The typed HTTP client is generated from it and placed in `libs/shared-logic/src/api-client/index.ts`. **Never edit this file manually.**

```bash
pnpm gen:api   # regenerates libs/shared-logic/src/api-client/index.ts
```

Apps consume the API exclusively through this generated client, never by writing raw `fetch()` calls or importing from `libs/backend` at runtime.

### Migration Workflow

After any change to `libs/backend/src/db/schema.ts`:

```bash
npx drizzle-kit generate   # review the generated SQL migration before proceeding
npx drizzle-kit migrate    # apply to the database
```

Never modify migration files by hand. An agent that changes a schema must include the migration step in its task output.

---

## 6. Design Patterns

### Locality of Behavior

UI-specific state and JSX are co-located with the component. Agents must not split a component across `Component.tsx`, `useComponent.ts`, and `types.ts` unless the hook is genuinely reusable across both Web and Mobile (in which case it belongs in `libs/shared-logic/src/hooks/`).

```typescript
// apps/web/app/components/features/checkout-button.tsx
"use client";

import { useState } from "react";

type ButtonState = "idle" | "loading" | "success" | "error";

export function CheckoutButton({ cartId }: { cartId: string }): React.JSX.Element {
  const [status, setStatus] = useState<ButtonState>("idle");

  async function handleCheckout(): Promise<void> {
    setStatus("loading");
    try {
      // checkout logic via generated API client
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <button disabled={status === "loading"} onClick={handleCheckout} className="px-4 py-2 bg-emerald-600 text-white rounded-full active:scale-95 transition-transform">
      {status === "loading" ? "Processando..." : "Confirmar"}
    </button>
  );
}
```

### Server Actions for Mutations

All Next.js mutations must use dedicated `actions.ts` files. Agents must never place `fetch()` calls inside shared components or client components.

```typescript
// apps/web/app/checkout/actions.ts
"use server";

import { apiClient } from "@gestao-casa/shared-logic/api-client";

export async function checkoutAction(cartId: string): Promise<void> {
  await apiClient.post("/checkout", { cartId });
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
  if (subtotal <= 0) return 0;
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
- Data fetching: server components fetch directly; mutations go through `actions.ts` files.
- No `fetch()` calls inside client components or shared components.

### Mobile (`apps/mobile`)

- Layout: `<View>`, `<Text>`, `<TouchableOpacity>`, `<ScrollView>`, `<FlatList>` — no DOM elements.
- Styles: React Native `StyleSheet.create()` or inline style objects with explicit types.
- Icons: `@expo/vector-icons` (Lucide variant).
- **Never import `react-dom` or any package that depends on it.**
- Sliders: native `<Slider>` from `@react-native-community/slider`.

---

## 8. Testing Conventions

All testing uses **Vitest**. The DI pattern in Section 6 is the foundation — pure functions in `libs/shared-logic` require no mocks.

| Scope          | Location                                         | Pattern                                    |
| -------------- | ------------------------------------------------ | ------------------------------------------ |
| Pure utils     | `libs/shared-logic/src/utils/<name>.test.ts`     | Input/output assertions, no mocks          |
| Shared hooks   | `libs/shared-logic/src/hooks/<name>.test.ts`     | `renderHook` from `@testing-library/react` |
| API routes     | `libs/backend/src/api/routes/<resource>.test.ts` | Hono `app.request()` test helper           |
| Web components | `apps/web/app/components/**/<name>.test.tsx`     | `@testing-library/react`                   |

**Agent rule:** every new function in `libs/shared-logic` must be accompanied by a `.test.ts` file. The DI signature makes this a direct input/output test with no setup required.

---

## 9. Agent Task Execution Checklist

Before writing any code, an agent must validate compliance with this matrix:

| Task Type           | Target Path                                 | Pre-conditions                                                     |
| ------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| Add/modify DB table | `libs/backend/src/db/schema.ts`             | Run migration after schema change; update API client               |
| Add API route       | `libs/backend/src/api/routes/<resource>.ts` | Schema types must exist; use error factory for all error responses |
| Add business logic  | `libs/shared-logic/src/utils/<name>.ts`     | Must be pure function, no side effects, add `.test.ts`             |
| Add shared hook     | `libs/shared-logic/src/hooks/use-<name>.ts` | Hook must be usable by both Web and Mobile; no platform APIs       |
| Add web UI          | `apps/web/app/<route>/page.tsx`             | Tailwind only, no RN imports, no raw fetch calls                   |
| Add mutation        | `apps/web/app/<route>/actions.ts`           | Use generated API client, `'use server'` directive                 |
| Add mobile UI       | `apps/mobile/app/<route>.tsx`               | RN components only, no DOM imports                                 |

**Before every task:**

1. Read `GEMINI.md` for agent instructions.
2. Read `docs/backlog.md` to confirm task status and acceptance criteria.
3. Read `libs/backend/src/db/schema.ts` for current type definitions.
4. Read `docs/conventions.md` for naming and patterns.
5. Verify all new imports against the boundary table in Section 3.
