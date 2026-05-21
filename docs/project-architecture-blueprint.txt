# Project Architecture Blueprint: AI-Optimized Cross-Platform Application

This document defines the definitive technical stack, architectural rules, and design patterns for the codebase. This repository is explicitly designed for a hybrid developer-agent workflow. The primary objective is to maximize **AI Agent Efficiency (AX)** by reducing token consumption, eliminating architectural ambiguity, and enforcing compile-time constraints that guide LLM reasoning.

---

## 1. System Overview & Core Stack

The system is a cross-platform application (Web and Mobile) managed within a unified monorepo. Every architectural choice is optimized to ensure that AI agents can read, modify, and test code with minimal context switching and zero hallucination.

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

* **Monorepo Engine:** Nx (with explicit boundary constraints)
* **Language:** TypeScript (Strict Mode + Mandatory Explicit Return Types)
* **Web Framework:** Next.js (App Router)
* **Mobile Framework:** Expo (React Native + Expo Router)
* **API Layer:** Hono + `@hono/zod-openapi` (Self-documenting, typed REST)
* **Database ORM:** Drizzle ORM (Pure TypeScript schema definitions)
* **Data Validation:** Zod
* **Tooling & Linter:** Biome (Format & Lint)

---

## 2. Core Language: TypeScript Engine

To eliminate token waste caused by AI agents backtracking or guessing data shapes, the `tsconfig.json` forces absolute strictness.

### Rules for AI Agents & Engineers

* **No Implicit Returns:** Every function definition *must* explicitly state its return type. This prevents the AI from needing to parse an entire function body to infer the shape of its output in subsequent prompts.
* **Strict Null Checks:** Handled explicitly. Code must use optional chaining or explicit type guards.
* **No `any`:** The use of `any` is strictly prohibited. Use `unknown` with a Zod type guard if types are genuinely dynamic.

```typescript
// ❌ BAD: AI has to infer the return type by reading the full body
export function fetchUserData(userId: string) {
  return db.select().from(users).where(eq(users.id, userId)).then(res => res[0]);
}

//  GOOD: Type boundaries are explicit at the signature line
import type { UserSelection } from "@workspace/backend/db";

export async function fetchUserData(userId: string): Promise<UserSelection | null> {
  const result = await db.select().from(users).where(eq(users.id, userId));
  return result[0] ?? null;
}

```

---

## 3. Directory Architecture (Nx Workspace)

The codebase is strictly modularized. The file structure dictates what context an AI agent needs to load to perform a task.

```
├── .cursorrules             # Root AI instructions
├── biome.json               # Code formatting rules
├── nx.json                  # Workspace dependency constraints
├── apps/
│   ├── web/                 # Next.js App (Web-only presentation)
│   │   └── app/
│   └── mobile/              # Expo App (Mobile-only presentation)
│       └── app/
└── libs/
    ├── backend/             # Drizzle schemas, migrations, Hono routers
    │   ├── src/
    │   │   ├── db/          # Pure TS Drizzle schemas
    │   │   └── api/         # Hono OpenAPI routes
    │   └── project.json
    └── shared-logic/        # Pure TS platform-agnostic business logic
        └── src/
            ├── hooks/       # Sharable React Hooks (State machines, calculations)
            └── utils/       # Pure functions

```

### Dependency Boundary Rules (`nx.json`)

Nx tags are used to enforce compiler-level errors if an AI agent tries to cross platform boundaries:

* `apps/web` can only import from `libs/shared-logic` and `libs/backend` (via network/client). It **cannot** import from `apps/mobile`.
* `apps/mobile` can only import from `libs/shared-logic` and `libs/backend` (via network/client). It **cannot** import from `apps/web`.
* `apps/mobile` is strictly barred from importing any package containing `react-dom` or Node.js native globals.

---

## 4. Database & API Layer (Pure TypeScript Pipeline)

### Drizzle ORM (AI-Readable Schemas)

Prisma relies on a non-standard syntax `.prisma` file and hidden generated clients. Drizzle uses pure TypeScript, meaning the AI can read, manipulate, and execute schema migrations without relying on external binary engines.

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

// Automatically export Zod schemas for validation and API documentation
export const selectUserSchema = createSelectSchema(users);
export const insertUserSchema = createInsertSchema(users);
export type User = z.infer<typeof selectUserSchema>;

```

### Hono OpenAPI (Self-Documenting REST)

Instead of relying on deep type inference strings like tRPC, the API utilizes Hono with OpenAPI schemas. This allows AI agents to read standard HTTP route definitions and interact via standard OpenAPI specs—an area where modern LLMs demonstrate maximum performance and lowest hallucination rates.

```typescript
// libs/backend/src/api/routes/users.ts
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { selectUserSchema } from "../../db/schema";
import { z } from "zod";

const getUserRoute = createRoute({
  method: "get",
  path: "/users/{id}",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: selectUserSchema } },
      description: "Retrieve the user details",
    },
  },
});

export const apiRouter = new OpenAPIHono().openapi(getUserRoute, async (c) => {
  const { id } = c.req.valid("param");
  // Database fetching logic here
  return c.json({ id, email: "user@workspace.com", name: "John Doe", createdAt: new Date().toISOString() }, 200);
});

```

---

## 5. Design Patterns for AI Efficiency

### Locality of Behavior (LoB) over Fragmented Hooks

While shared logic resides in `libs/shared-logic`, UI-specific state and JSX are co-located in the same file or directory. Forcing an AI to jump between a `MyComponent.tsx`, a `useMyComponent.ts` file, and a `types.ts` file doubles context token overhead and invites editing collisions.

```typescript
// apps/web/app/components/checkout-button.tsx
'use client';

import React, { useState } from "react";
import { z } from "zod";

// Keep localized types, states, and presentation visible in one parsing window
type ButtonState = "idle" | "loading" | "success" | "error";

export function CheckoutButton({ cartId }: { cartId: string }): React.JSX.Element {
  const [status, setStatus] = useState<ButtonState>("idle");

  async function handleCheckout(): Promise<void> {
    setStatus("loading");
    try {
      // Execute checkout logic
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <button 
      disabled={status === "loading"} 
      onClick={handleCheckout}
      className="px-4 py-2 bg-blue-600 text-white rounded"
    >
      {status === "loading" ? "Processing..." : "Checkout"}
    </button>
  );
}

```

### Early Returns (Guard Clauses)

Deeply nested code increases execution branch complexity, degrading the reasoning performance of LLMs. All logic must favor flat structures with immediate early returns.

```typescript
// ❌ BAD: Complex nested tree
function processOrder(order) {
  if (order) {
    if (order.isPaid) {
      return ship(order);
    } else {
      return triggerPayment(order);
    }
  }
}

//  GOOD: Flat linear execution paths
function processOrder(order: Order | null): ProcessResult | null {
  if (!order) return null;
  if (!order.isPaid) return triggerPayment(order);
  
  return ship(order);
}

```

### Explicit Dependency Injection

Avoid relying on global application state or side-effect heavy modules within core business logic. Pass dependencies (clients, configs) explicitly as parameters. This allows AI agents to write isolated unit tests natively without needing complex mocking frameworks.

```typescript
// libs/shared-logic/src/utils/calculate-tax.ts
export interface TaxConfig {
  rate: number;
  exemptIds: string[];
}

// Pure function: Predictable outputs make unit-test generation effortless for AI
export function calculateTotalWithTax(
  subtotal: number, 
  userId: string, 
  config: TaxConfig
): number {
  if (config.exemptIds.includes(userId)) return subtotal;
  return subtotal * (1 + config.rate);
}

```

---

## 6. Infrastructure & Guardrails

### Context Meta-Files (`.cursorrules` / `llms.txt`)

A configuration file placed at the project root acts as a constant micro-system prompt injected directly into the agent's context.

```markdown
# Repository Rules for AI Agents
- You are working in an Nx Monorepo.
- Core frameworks: Next.js (apps/web) and Expo (apps/mobile).
- Web code MUST use DOM elements and Tailwind CSS.
- Mobile code MUST use React Native components; never import react-dom or web components.
- Database access is managed exclusively through Drizzle ORM in `libs/backend`.
- Every function created or modified MUST include an explicit return type definition.
- Never write code formatting fixes manually. Let Biome handle layout optimization on file save.

```

### Model Context Protocol (MCP) Integration

To prevent the agent from hallucinating outdated public APIs or schemas, local MCP servers are established:

* **Database Schema MCP:** Grants agents read-only access to query current active database table relations directly from the running engine.
* **API MCP:** Exposes the `/api/doc` OpenAPI JSON from the Hono server directly into the agent's context window.

### Ultra-Fast Formatting Strategy: Biome

The repository replaces ESLint and Prettier with **Biome**. Because Biome parses and reformats code in microseconds via a unified engine, AI agents never burn time or token counts correcting indentation, semicolon conflicts, or unused import statements. The agent emits the logical change, and the file-save mechanism automatically sanitizes structural style.

---

## 7. Execution Architecture Checklist

When delegating a task to an AI agent, verify compliance against this matrix:

| Task Type | Context Target | Structural Rule |
| --- | --- | --- |
| **Database Modification** | `libs/backend/src/db/*` | Define in pure TypeScript schema files. Run migration scripts immediately via tool execution. |
| **Core Calculations / Rules** | `libs/shared-logic/*` | Implement as pure functions or custom hooks using explicit type input/outputs. |
| **Web UI Addition** | `apps/web/app/*` | Restrict styles to Tailwind. Group state and presentation together inside target directories. |
| **Mobile UI Addition** | `apps/mobile/app/*` | Use React Native layout containers. Ensure zero Node.js global dependencies are introduced. |