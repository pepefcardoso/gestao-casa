# Agent Instructions

## Stack

- Monorepo Nx | TypeScript strict | Hono + Zod OpenAPI | Drizzle ORM | PostgreSQL

## Boundaries

- `apps/web` → Next.js, Tailwind, `react-dom` allowed
- `apps/mobile` → Expo/React Native only, NEVER import `react-dom`
- `libs/backend` → Drizzle schemas + Hono routes, no UI imports
- `libs/shared-logic` → pure functions + hooks, no platform deps

## Non-negotiables

- Every function MUST have explicit return type
- No `any` — use `unknown` + Zod guard if dynamic
- Early returns over nested conditionals
- All DB access via Drizzle in `libs/backend/src/db/`
- All validation via Zod schemas exported from `libs/backend/src/db/schema.ts`

## File conventions

- Schema: `libs/backend/src/db/schema.ts` (single source of truth)
- API routes: `libs/backend/src/api/routes/<resource>.ts`
- Web pages: `apps/web/app/<route>/page.tsx`
- Mobile screens: `apps/mobile/app/<route>.tsx`
- Shared utils: `libs/shared-logic/src/utils/<name>.ts`

## Before writing code

1. Read the relevant schema types from `libs/backend/src/db/schema.ts`
2. Check `docs/backlog.md` for task status
3. Never create files outside the boundaries above
