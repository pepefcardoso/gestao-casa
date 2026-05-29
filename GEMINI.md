# Agent Instructions

## Stack

- Monorepo Nx (package-based) | TypeScript strict | Hono + Zod OpenAPI | Drizzle ORM | PostgreSQL

## Boundaries

- `apps/web` → Next.js, Tailwind, `react-dom` allowed. Types from `libs/backend` via HTTP only — never import runtime Drizzle code.
- `apps/mobile` → Expo/React Native only. NEVER import `react-dom`, DOM APIs, or any package that depends on them.
- `libs/backend` → Drizzle schemas + Hono routes. No React, no `react-dom`, no `react-native`, no UI imports.
- `libs/shared-logic` → Pure functions + hooks. No platform APIs (`window`, `document`, `AsyncStorage`, `useColorScheme`, `expo-*`). No imports from `apps/*` or `libs/backend`.

## Non-Negotiables

- Every function MUST have an explicit return type.
- No `any` — use `unknown` + Zod guard if the type is genuinely dynamic.
- No default exports — named exports everywhere.
- Early returns over nested conditionals (guard clauses).
- No barrel `index.ts` files in `libs/shared-logic` — always use direct imports.
- All DB access via Drizzle in `libs/backend/src/db/`.
- All validation via Zod schemas exported from `libs/backend/src/db/schema.ts`.
- Use `$inferSelect` / `$inferInsert` for pure TypeScript types. Use `drizzle-zod` only when a runtime Zod validator is required.
- Use `satisfies` for config object literals.

## File Conventions

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

## Before Writing Code

1. Read `libs/backend/src/db/schema.ts` for current type definitions.
2. Read `docs/backlog.md` to confirm task status and acceptance criteria.
3. Read `docs/conventions.md` for naming and patterns.
4. Verify the target file path against the canonical paths table above.
5. Verify all new imports are within allowed boundary rules.
6. Never create files outside the canonical paths above.

## Migration Workflow

After any schema change in `libs/backend/src/db/schema.ts`:

```bash
npx drizzle-kit generate   # review the generated SQL migration
npx drizzle-kit migrate    # apply to the database
```

Never modify migration files by hand.

## API Client Regeneration

After any route or schema change:

```bash
pnpm gen:api
```

This regenerates `libs/shared-logic/src/api-client/index.ts` from the OpenAPI spec served at `/api/openapi.json`.
