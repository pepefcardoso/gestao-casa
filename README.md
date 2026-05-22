# gestao-casa

Cross-platform application for property owners to manage home finances, room structure, and mortgage tracking.

**Web (Next.js):** analytical dashboards, financing panel, month-end review.
**Mobile (Expo):** field expense logging, room measurements, quick budget registration.

---

## Stack

| Layer            | Technology                 |
| ---------------- | -------------------------- |
| Monorepo         | Nx                         |
| Language         | TypeScript (strict)        |
| Web              | Next.js 15 App Router      |
| Mobile           | Expo SDK + Expo Router     |
| API              | Hono + `@hono/zod-openapi` |
| ORM              | Drizzle ORM                |
| Database         | PostgreSQL                 |
| Validation       | Zod                        |
| Formatter/Linter | Biome                      |

---

## Repository Structure

```
.
├── GEMINI.md                    # Agent instructions (read before every task)
├── apps/
│   ├── web/                     # Next.js — web-only presentation
│   └── mobile/                  # Expo — mobile-only presentation
└── libs/
    ├── backend/
    │   └── src/
    │       ├── db/
    │       │   └── schema.ts    # Single source of truth for all types
    │       └── api/
    │           └── routes/      # Hono OpenAPI route definitions
    └── shared-logic/
        └── src/
            ├── hooks/           # Shareable React hooks
            └── utils/           # Pure business logic functions
```

---

## Commands

```bash
# Install dependencies
npm install

# Run web app (dev)
npx nx serve web

# Run mobile app (dev)
npx nx start mobile

# Lint all packages
npx nx run-many -t lint

# Type-check all packages
npx nx run-many -t typecheck

# Format (Biome)
npx biome format --write .

# Lint fix (Biome)
npx biome lint --write .

# Generate DB migration
npx drizzle-kit generate

# Apply DB migration
npx drizzle-kit migrate
```

---

## Documentation

| File                                     | Purpose                                                       |
| ---------------------------------------- | ------------------------------------------------------------- |
| `GEMINI.md`                              | Agent micro-instructions — loaded automatically on every task |
| `docs/backlog.md`                        | Sprint tasks with status, target path and acceptance criteria |
| `docs/mvp-spec.md`                       | Product requirements, module definitions, entity field map    |
| `docs/use-cases.md`                      | Detailed UC flows, business rules, validation summary         |
| `docs/project-architecture-blueprint.md` | Stack, boundaries, patterns, agent checklist                  |
| `docs/design.md`                         | Color palette, typography, component states                   |
| `docs/conventions.md`                    | Naming conventions, code templates, import rules              |

---

## Environment Variables

Create a `.env` file at the root before running locally:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/gestao_casa
```

---

## Agent Instructions

Read `GEMINI.md` before writing any code. It defines boundaries, file conventions, and non-negotiable rules enforced at the compiler level.
