# Backlog

> **Status legend:** `TODO` · `IN_PROGRESS` · `DONE` · `BLOCKED`
>
> Before picking a task: read `GEMINI.md`, confirm dependencies are `DONE`, read the target file path.

---

## Sprint 1 — Foundations & Base Structure (Rooms)

### Task 1.1 — DB Schema: `houses` and `rooms`

| Field            | Value                           |
| ---------------- | ------------------------------- |
| **Status**       | `DONE`                          |
| **Platform**     | Backend                         |
| **Target file**  | `libs/backend/src/db/schema.ts` |
| **Dependencies** | none                            |

**What to implement:**

- Define `houses` and `rooms` Drizzle tables (fields specified in `docs/mvp-spec.md` §Module 1).
- Export `selectHouseSchema`, `insertHouseSchema`, `type House` derived via `createSelectSchema` / `createInsertSchema`.
- Export `selectRoomSchema`, `insertRoomSchema`, `type Room` — same pattern.
- Apply `.refine()` on insert schemas: `area` must be `> 0` if provided.

**Acceptance criteria:**

- [x] `npx drizzle-kit generate` produces a valid migration with no errors.
- [x] `insertRoomSchema.parse({ name: "Sala", area: -1 })` throws a Zod error.
- [x] `insertRoomSchema.parse({ name: "Sala" })` succeeds (area is optional).
- [x] All exports are typed — no implicit `any`.

---

### Task 1.2 — API: `POST /rooms` and `GET /rooms`

| Field            | Value                                  |
| ---------------- | -------------------------------------- |
| **Status**       | `DONE`                                 |
| **Platform**     | Backend                                |
| **Target file**  | `libs/backend/src/api/routes/rooms.ts` |
| **Dependencies** | Task 1.1 `DONE`                        |

**What to implement:**

- `POST /rooms` — validates body with `insertRoomSchema`, inserts, returns 201 + created record.
- `GET /rooms` — accepts optional `?house_id=` query param, returns `Room[]`.
- Both routes documented via `createRoute` (Hono OpenAPI) — no manual OpenAPI YAML.
- 400 response schema: `z.object({ error: z.string() })`.

**Acceptance criteria:**

- [x] `POST /rooms` with invalid body returns `400` with `{ error: string }`.
- [x] `POST /rooms` with valid body returns `201` + the created room object.
- [x] `GET /rooms?house_id=<uuid>` returns only rooms for that house.
- [x] `GET /api/doc` (OpenAPI JSON) includes both routes with correct request/response schemas.

---

### Task 1.3 — Mobile UI: Room listing and creation screen

| Field            | Value                                                               |
| ---------------- | ------------------------------------------------------------------- |
| **Status**       | `DONE`                                                              |
| **Platform**     | Mobile (`apps/mobile`)                                              |
| **Target file**  | `apps/mobile/app/rooms/index.tsx` · `apps/mobile/app/rooms/new.tsx` |
| **Dependencies** | Task 1.2 `DONE`                                                     |

**What to implement:**

- Listing screen: `FlatList` of rooms with name, area, and color dot (`color_code`).
- Creation screen: form with name (required), area (optional numeric), color picker (optional hex).
- On save: call `POST /rooms`, navigate back to listing on success.
- Validation errors shown inline below each field (`fontSize: 12, color: '#ea580c'`).
- Zero RN-incompatible imports (`react-dom`, Tailwind classes, DOM APIs).

**Acceptance criteria:**

- [x] Submitting with empty name shows inline error and blocks the API call.
- [x] Submitting with `area = -1` shows inline error and blocks the API call.
- [x] Successful save navigates back and new room appears in the list.
- [x] `npx nx lint mobile` passes with zero errors.

---

## Sprint 2 — Adjustable Financing Engine

### Task 2.1 — Shared Logic: `calculateFinancing()`

| Field            | Value                                                |
| ---------------- | ---------------------------------------------------- |
| **Status**       | `DONE`                                               |
| **Platform**     | Shared (`libs/shared-logic`)                         |
| **Target file**  | `libs/shared-logic/src/utils/calculate-financing.ts` |
| **Dependencies** | Task 1.1 `DONE` (for type reference)                 |

**What to implement:**

- Pure function `calculateFinancing(params: FinancingParams): FinancingInstallment[]`.
- Supports `SAC` and `PRICE` — formulas in `docs/mvp-spec.md` §Module 3.
- Override logic: `first_parcel_override` and `last_parcel_override` applied as early returns; delta distributed proportionally across intermediate rows.
- No DB calls, no side effects, no imports from `libs/backend` or `apps/*`.

**Acceptance criteria:**

- [x] `calculateFinancing({ ..., amortizationSystem: 'SAC', termMonths: 360 })` returns array of length 360.
- [x] SAC: `installments[0].amortization === installments[359].amortization` (constant amortization).
- [x] PRICE: `installments[0].installment === installments[359].installment` (constant installment).
- [x] With `firstParcelOverride = X`: `result[0].installment === X`.
- [x] With `lastParcelOverride = Y`: `result[359].installment === Y`.
- [x] Function has explicit return type — no implicit `any`.

---

### Task 2.2 — DB Schema + API: `financing`

| Field            | Value                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| **Status**       | `DONE`                                                                       |
| **Platform**     | Backend                                                                      |
| **Target file**  | `libs/backend/src/db/schema.ts` · `libs/backend/src/api/routes/financing.ts` |
| **Dependencies** | Task 1.1 `DONE` · Task 2.1 `DONE`                                            |

**What to implement:**

- Add `financing` table to `libs/backend/src/db/schema.ts` (fields in `docs/mvp-spec.md` §Module 3).
- `amortization_system` constrained to `z.enum(["SAC", "PRICE"])` on both insert and select schemas.
- `POST /financing` — upsert (insert or update) by `house_id`; returns the full record.
- `GET /financing/:house_id` — returns the financing record or 404.

**Acceptance criteria:**

- [x] `insertFinancingSchema.parse({ amortizationSystem: 'INVALID' })` throws.
- [x] `POST /financing` called twice with same `house_id` updates, not duplicates.
- [x] `GET /financing/:house_id` with unknown id returns `404`.
- [x] Migration generates with no errors.

---

### Task 2.3 — Web UI: Financing panel

| Field            | Value                             |
| ---------------- | --------------------------------- |
| **Status**       | `DONE`                            |
| **Platform**     | Web (`apps/web`)                  |
| **Target file**  | `apps/web/app/financing/page.tsx` |
| **Dependencies** | Task 2.1 `DONE` · Task 2.2 `DONE` |

**What to implement:**

- Form inputs: property value, down payment, term, rate, amortization system.
- On input change: call `calculateFinancing()` client-side and render the 360-row table reactively (no API call for preview).
- Table: sticky header, `font-mono tabular-nums`, columns right-aligned, columns: month, installment (R$), interest (R$), amortization (R$), outstanding balance (R$).
- Area chart above table: two layers (interest decay + amortization growth), `recharts` only.
- Override inputs: sticky beside row 1 and row 360; re-run `calculateFinancing()` on change.
- Save button: `POST /financing`.

**Acceptance criteria:**

- [x] Changing any input updates the table and chart without page reload.
- [x] Row 1 and row 360 values match override inputs when set.
- [x] `npx nx lint web` passes with zero errors.
- [x] No `react-native` imports anywhere in the file.

---

## Sprint 3 — Financial Heart (Expenses and Budgets)

### Task 3.1 — DB Schema: `expenses`

| Field            | Value                           |
| ---------------- | ------------------------------- |
| **Status**       | `DONE`                          |
| **Platform**     | Backend                         |
| **Target file**  | `libs/backend/src/db/schema.ts` |
| **Dependencies** | Task 1.1 `DONE`                 |

**What to implement:**

- Add `expenses` table (fields in `docs/mvp-spec.md` §Module 2).
- Zod enums: `status` → `["BUDGET", "CONFIRMED"]`, `priority` → `["HIGH", "MEDIUM", "LOW"]`, `category` → `["TAX", "PRODUCT", "SERVICE", "FURNITURE", "APPLIANCE", "RENOVATION"]`.
- `total_amount` refined: must be `> 0`.
- `installments_count` refined: must be between 1 and 360.
- `room_id` nullable FK with `set null` on room delete.

**Acceptance criteria:**

- [x] `insertExpenseSchema.parse({ status: 'INVALID', ... })` throws.
- [x] `insertExpenseSchema.parse({ totalAmount: 0, ... })` throws.
- [x] `insertExpenseSchema.parse({ installmentsCount: 361, ... })` throws.
- [x] Migration generates with no errors.

---

### Task 3.2 — Shared Logic: `projectInstallments()`

| Field            | Value                                                 |
| ---------------- | ----------------------------------------------------- |
| **Status**       | `DONE`                                                |
| **Platform**     | Shared (`libs/shared-logic`)                          |
| **Target file**  | `libs/shared-logic/src/utils/project-installments.ts` |
| **Dependencies** | Task 3.1 `DONE`                                       |

**What to implement:**

- Pure function `projectInstallments(params: ProjectInstallmentsParams): InsertExpense[]`.
- Input: `{ description, totalAmount, installmentsCount, status, category, priority, roomId, dueDate }`.
- Output: array of `installmentsCount` expense objects, each with:
  - `totalAmount = params.totalAmount / params.installmentsCount`.
  - `description = "{description} ({i}/{n})"` for `i` in `1..n`.
  - `dueDate` incremented by `i - 1` months from `params.dueDate`.
  - All other fields passed through unchanged.
- No DB calls, no side effects.

**Acceptance criteria:**

- [x] `projectInstallments({ ..., installmentsCount: 3, dueDate: '2025-01-01' })` returns array of length 3.
- [x] Result[0].description ends with `"(1/3)"`, result[2] ends with `"(3/3)"`.
- [x] Result[1].dueDate is exactly 1 month after result[0].dueDate.
- [x] Each entry's `totalAmount` equals `params.totalAmount / 3`.
- [x] Function has explicit return type.

---

### Task 3.3 — Mobile UI: Expense registration form

| Field            | Value                              |
| ---------------- | ---------------------------------- |
| **Status**       | `DONE`                             |
| **Platform**     | Mobile (`apps/mobile`)             |
| **Target file**  | `apps/mobile/app/expenses/new.tsx` |
| **Dependencies** | Task 3.1 `DONE` · Task 3.2 `DONE`  |

**What to implement:**

- Status toggle: `Budget` ↔ `Confirmed` (large tap target).
- Fields: description, total amount, category (picker), priority (picker), room (optional picker).
- Payment type: upfront (`installments_count = 1`) or installments.
- Installment input: slider (1–24) + text field (up to 360); live preview `R$ {total} ÷ {n} = R$ {per_month}/mês`.
- On save: call `projectInstallments()`, POST all resulting entries, navigate back.

**Acceptance criteria:**

- [x] Selecting installments shows slider + text field; upfront hides them.
- [x] Live preview updates on every slider/text change.
- [x] Submitting with empty description blocks the API call.
- [x] Slider clamps at 24; text field accepts up to 360 and rejects > 360 inline.
- [x] `npx nx lint mobile` passes with zero errors.

---

### Task 3.4 — Web UI: Monthly cash flow dashboard

| Field            | Value                             |
| ---------------- | --------------------------------- |
| **Status**       | `DONE`                            |
| **Platform**     | Web (`apps/web`)                  |
| **Target file**  | `apps/web/app/dashboard/page.tsx` |
| **Dependencies** | Task 2.2 `DONE` · Task 3.1 `DONE` |

**What to implement:**

- 12-month grid from current month forward.
- Each column: financing installment + confirmed expenses sum (`bg-rose-600`) + budget sum (`bg-amber-600`) + total outflow.
- Click column → navigates to `/expenses?month=YYYY-MM`.
- If no financing record exists, financing row shows `—`.

**Acceptance criteria:**

- [x] Grid renders 12 columns starting from current month.
- [x] Confirmed and budget totals match the sum of `expenses` records for that month.
- [x] Clicking a column navigates to the expense list filtered by that month.
- [x] `npx nx lint web` passes with zero errors.

---

## Sprint 4 — Production Readiness

### Task 4.1 — Expo/Mobile Infrastructure & Dependency Alignment

| Field            | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| **Status**       | `DONE`                                                             |
| **Platform**     | Mobile (`apps/mobile`)                                             |
| **Target file**  | `package.json` · `apps/mobile/tsconfig.json` · `apps/mobile/app.json` |
| **Dependencies** | Sprint 1, 2, 3 `DONE`                                              |

**What to implement:**

- Add all required Expo and React Native packages to dependencies (`react-native`, `expo`, `expo-router`, `@expo/vector-icons`, `@react-native-community/slider`, and their respective types).
- Create basic configuration files for the mobile application in `apps/mobile/` including `app.json`, `babel.config.js`, and `metro.config.js`.
- Initialize `tsconfig.json` for the `mobile` app to extend the root workspace config with React Native environment settings (`"jsx": "react-native"`).
- Make sure `tsc --noEmit` checks the mobile app screens successfully without type errors.

**Acceptance criteria:**

- [x] Running typecheck on mobile files passes with no missing module errors.
- [x] Local Expo development environment runs without dependency issues.
- [x] Linting passes with zero errors.

---

### Task 4.2 — Database Migrations Reconciliation

| Field            | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| **Status**       | `DONE`                                                             |
| **Platform**     | Backend                                                            |
| **Target file**  | `libs/backend/src/db/`                                             |
| **Dependencies** | Sprint 1, 2, 3 `DONE`                                              |

**What to implement:**

- Reconcile the local database migration log table (`drizzle.__drizzle_migrations`) with the existing schema structure, or establish a robust baseline setup.
- Ensure that the migration script can be run on clean production environments cleanly from `0000` to the latest migration.
- Configure validation script or health checks to ensure DB connections handle environment failures gracefully.

**Acceptance criteria:**

- [x] Programmatic database migrations run cleanly on any fresh PostgreSQL instance.
- [x] Database connection works securely using environment variables in production configurations.

---

### Task 4.3 — Testing Framework Setup & Core Unit Tests

| Field            | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| **Status**       | `DONE`                                                             |
| **Platform**     | Shared / Backend                                                   |
| **Target file**  | `package.json` · `libs/shared-logic/src/utils/`                    |
| **Dependencies** | Sprint 1, 2, 3 `DONE`                                              |

**What to implement:**

- Install and configure a testing runner (such as Vitest or Jest) in the workspace.
- Write unit tests for pure helper functions in `libs/shared-logic`:
  - `calculateFinancing()` (verifying SAC and PRICE systems, overrides, etc.).
  - `projectInstallments()` (verifying description increments, monthly split of amounts, due date propagation).
- Configure Nx target `test` or npm script to run test suite.

**Acceptance criteria:**

- [x] Running `npm run test` or `npx nx run-many --target=test` executes tests successfully.
- [x] Unit tests cover boundary values (e.g. term of 1 month, term of 360 months, overrides of exactly R$ 0, negative values rejecting, etc.) with 100% pass rate.

---

## Sprint 5 — Room & House Administration (API & Settings)

### Task 5.1 — API: House & Room Management

| Field            | Value                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| **Status**       | `DONE`                                                                                                       |
| **Platform**     | Backend                                                                                                      |
| **Target file**  | `libs/backend/src/api/routes/houses.ts` · `libs/backend/src/api/routes/rooms.ts` · `apps/web/app/api/[[...route]]/route.ts` |
| **Dependencies** | Task 1.2 `DONE`                                                                                              |

**What to implement:**

- Define API routes for House management in a new router `libs/backend/src/api/routes/houses.ts`:
  - `GET /houses/:id` — returns the house details by ID.
  - `PUT /houses/:id` — validates request body against `insertHouseSchema` and updates the house name, location, and total area.
- Add room modification and deletion routes to `libs/backend/src/api/routes/rooms.ts`:
  - `PUT /rooms/:id` — validates request body against `insertRoomSchema` and updates the room's name, area, and color code.
  - `DELETE /rooms/:id` — deletes the room by ID. Ensure the Drizzle constraint `set null` on `room_id` in the `expenses` table triggers correctly.
- Register the new `housesRouter` in the Vercel Hono route handler: `apps/web/app/api/[[...route]]/route.ts`.

**Acceptance criteria:**

- [x] `GET /api/houses/:id` returns house JSON on success, `404` for non-existent IDs, and `400` on invalid UUID format.
- [x] `PUT /api/houses/:id` updates house details and returns the updated house object. Fails with `400` if validation checks fail (e.g., negative area).
- [x] `PUT /api/rooms/:id` updates room fields and returns the updated room object. Fails with `400` if room area ≤ 0.
- [x] `DELETE /api/rooms/:id` removes the room and unlinks it from any associated expenses (`room_id` becomes `null` on those expenses).
- [x] `npx nx lint backend` passes with zero errors.

---

### Task 5.2 — Web UI: Settings & Room Management Screen

| Field            | Value                             |
| ---------------- | --------------------------------- |
| **Status**       | `DONE`                            |
| **Platform**     | Web (`apps/web`)                  |
| **Target file**  | `apps/web/app/settings/page.tsx`  |
| **Dependencies** | Task 5.1 `DONE`                   |

**What to implement:**

- Create settings page component in `apps/web/app/settings/page.tsx`.
- House Edit Form: Render inputs for house name (required), location (optional), and total area (optional). Fetch current values on mount and call `PUT /api/houses/:id` upon submission.
- Room Management:
  - List all rooms associated with the house using `GET /api/rooms?house_id=...`.
  - Allow adding new rooms directly from the screen, and editing existing rooms (name, area, color picker) calling `PUT /api/rooms/:id`.
  - Include a "Delete" button for each room that displays a confirmation modal warning the user that associated expenses will be unlinked (their room associations will be cleared). Call `DELETE /api/rooms/:id` upon confirmation.
- UI Design: Adhere to Mint-Slate design palette (`mint-slate-*`, `emerald-600`, `rose-600`) and Tailwind styling rules (no raw inline styles or external component packages).

**Acceptance criteria:**

- [x] Form displays current house properties and saves changes successfully via PUT request.
- [x] Editing a room changes its details in the database and updates the UI without full page reload.
- [x] Deleting a room unlinks the room from expenses (room_id set to null) and removes it from the list.
- [x] Navigation menu on the web dashboard contains a link to `/settings`.
- [x] `npx nx lint web` passes with zero errors.

---

## Sprint 6 — Mobile Native Navigation & Operational UI

### Task 6.1 — Mobile UI: Home / Landing Dashboard Screen

| Field            | Value                          |
| ---------------- | ------------------------------ |
| **Status**       | `DONE`                         |
| **Platform**     | Mobile (`apps/mobile`)         |
| **Target file**  | `apps/mobile/app/index.tsx`    |
| **Dependencies** | Sprint 4 `DONE`                |

**What to implement:**

- Create `apps/mobile/app/index.tsx` as the landing/home screen.
- Render property info cards containing the registered house name, location, and total area.
- Show key operational statistics: total number of rooms, total outflow, count of high priority items.
- Implement clear navigation buttons / quick action shortcuts using React Native components:
  - "Ver Cômodos" -> navigates to `/rooms/index`
  - "Adicionar Cômodo" -> navigates to `/rooms/new`
  - "Lista de Despesas" -> navigates to `/expenses` (or `/expenses/index` if folder structure requires)
  - "Nova Despesa" -> navigates to `/expenses/new`
- Apply Mint-Slate style guidelines: use standard typography sizes, clean flexbox layouts, card containers with borders, and branding colors.

**Acceptance criteria:**

- [x] Home screen serves as the default entry point of the mobile app.
- [x] House information and statistics load correctly.
- [x] Tapping each shortcut button correctly routes the user to the corresponding screen.
- [x] `npx nx lint mobile` passes with zero errors.

---

### Task 6.2 — Mobile UI: Room Detail Screen

| Field            | Value                                 |
| ---------------- | ------------------------------------- |
| **Status**       | `DONE`                                |
| **Platform**     | Mobile (`apps/mobile`)                |
| **Target file**  | `apps/mobile/app/rooms/[id].tsx`      |
| **Dependencies** | Task 6.1 `DONE`                       |

**What to implement:**

- Implement dynamic route screen `apps/mobile/app/rooms/[id].tsx` to display details of a specific room.
- Show room header with room name, area (if provided), and an indicator of its color (using `colorCode` from DB).
- Fetch and display the list of expenses linked to the room via `GET /api/expenses?room_id=id`.
- Calculate and display total confirmed expense amount vs total budgeted expense amount inside the room.
- Display a scrollable list of expenses using `FlatList`. Each item card displays description, amount, priority, and status.
- Implement status toggle on each expense card to allow transitioning `BUDGET` status to `CONFIRMED` natively (equivalent to UC05) with optimistic UI update.

**Acceptance criteria:**

- [x] Navigating to `/rooms/[id]` loads correct room metadata and its linked expenses.
- [x] Room header color matches the custom color code of the room.
- [x] Budget and Confirmed totals correctly reflect the sum of the filtered expenses.
- [x] Tapping status toggle updates expense status atomically in DB and transitions card style from amber to rose.
- [x] `npx nx lint mobile` passes with zero errors.

---

### Task 6.3 — Mobile UI: Expense List Screen

| Field            | Value                                 |
| ---------------- | ------------------------------------- |
| **Status**       | `DONE`                                |
| **Platform**     | Mobile (`apps/mobile`)                |
| **Target file**  | `apps/mobile/app/expenses/index.tsx`  |
| **Dependencies** | Task 6.1 `DONE`                       |

**What to implement:**

- Create listing screen in `apps/mobile/app/expenses/index.tsx`.
- Fetch all expenses from backend `GET /api/expenses`.
- Implement filter controls:
  - Room Filter: dropdown/picker containing all rooms to filter expenses by location.
  - Priority Filter: segmented control to filter by priority (`HIGH`, `MEDIUM`, `LOW`).
- Render a list of expense items using `FlatList` displaying description, value, due date, category, and status.
- Include a quick status toggle button for any `BUDGET` expense to switch it to `CONFIRMED` natively with optimistic UI updates.
- Styling: Ensure alignment with standard typography and colors. Use native Expo vector icons (`lucide` style).

**Acceptance criteria:**

- [x] Expense list displays all items by default.
- [x] Changing room or priority filters refines the visible list immediately.
- [x] Status toggle works correctly, shifting colors and sending PUT request to update the database.
- [x] `npx nx lint mobile` passes with zero errors.

---

## Sprint 7 — Cash Inflow & Location Enhancements (Incomes & Maps)

### Task 7.1 — DB Schema: `incomes` table and `houses` coordinates fields

| Field            | Value                           |
| ---------------- | ------------------------------- |
| **Status**       | `TODO`                          |
| **Platform**     | Backend                         |
| **Target file**  | `libs/backend/src/db/schema.ts` |
| **Dependencies** | Sprint 3 & Sprint 5 `DONE`      |

**What to implement:**

- Define `incomes` Drizzle table:
  - `id` (uuid, defaultRandom, PK)
  - `description` (text, notNull)
  - `amount` (numeric, notNull)
  - `status` (text, notNull, constrained to `["BUDGET", "CONFIRMED"]`)
  - `category` (text, notNull) -> e.g. `["SALARY", "INVESTMENT", "REFUND", "OTHER"]`
  - `dueDate` (timestamp, notNull)
  - `createdAt` (timestamp, notNull, defaultNow)
- Export `selectIncomeSchema`, `insertIncomeSchema`, `type Income`, `type InsertIncome` derived via `createSelectSchema` / `createInsertSchema` with `drizzle-zod`.
- Apply `.refine()` on `insertIncomeSchema`: `amount` must be `> 0`.
- Add optional `latitude` and `longitude` fields to the `houses` table as `numeric` values.
- Apply `.refine()` on `insertHouseSchema` to optionally validate coordinate boundaries (latitude between -90 and 90, longitude between -180 and 180).

**Acceptance criteria:**

- [ ] `npx drizzle-kit generate` produces a valid migration with no errors.
- [ ] `insertIncomeSchema.parse({ amount: -5 })` throws Zod validation error.
- [ ] `insertHouseSchema.parse({ latitude: 120 })` throws Zod validation error.
- [ ] All schema exports are fully typed with no implicit `any`.

---

### Task 7.2 — API: Incomes CRUD and Houses coordinates updates

| Field            | Value                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------- |
| **Status**       | `TODO`                                                                                        |
| **Platform**     | Backend                                                                                       |
| **Target file**  | `libs/backend/src/api/routes/incomes.ts` · `libs/backend/src/api/routes/houses.ts` · `apps/web/app/api/[[...route]]/route.ts` |
| **Dependencies** | Task 7.1 `DONE`                                                                               |

**What to implement:**

- Create new router `libs/backend/src/api/routes/incomes.ts` with the following OpenAPI Hono routes:
  - `GET /incomes` — returns list of incomes, with optional filtering by month (`?month=YYYY-MM`).
  - `POST /incomes` — validates body against `insertIncomeSchema`, inserts new record, and returns 201 + created record.
  - `PUT /incomes/:id` — validates path/body and updates an income record.
  - `DELETE /incomes/:id` — deletes an income record by ID.
- Update `PUT /houses/:id` in `libs/backend/src/api/routes/houses.ts` to accept, validate, and save `latitude` and `longitude` coordinates.
- Register the new `incomesRouter` in the Vercel Hono route handler: `apps/web/app/api/[[...route]]/route.ts`.

**Acceptance criteria:**

- [ ] `GET /api/incomes` returns all incomes.
- [ ] `POST /api/incomes` with valid payload returns `201` and the newly created record.
- [ ] `PUT /api/houses/:id` successfully saves custom latitude/longitude coordinates to the DB.
- [ ] `GET /api/doc` includes all new incomes endpoints with correct schemas.
- [ ] `npx nx lint backend` passes with zero errors.

---

### Task 7.3 — Web UI: Income CRUD Management page

| Field            | Value                              |
| ---------------- | ---------------------------------- |
| **Status**       | `TODO`                             |
| **Platform**     | Web (`apps/web`)                   |
| **Target file**  | `apps/web/app/incomes/page.tsx`    |
| **Dependencies** | Task 7.2 `DONE`                    |

**What to implement:**

- Create a page at `/incomes` containing a table/list of all incomes.
- Style the page using the Mint-Slate design system.
- Include a "Novo Lançamento" form/modal to add new incomes: description, amount, category, status (`BUDGET` / `CONFIRMED`), due date.
- Include inline edit and delete actions for each income, updating the DB and UI.
- Format all amounts using `BRL` currency formatting.
- Add "Receitas" link to the shared navigation headers across pages (`dashboard/page.tsx`, `financing/page.tsx`, `expenses/page.tsx`, `settings/page.tsx`, `layout.tsx`).

**Acceptance criteria:**

- [ ] `/incomes` lists all incomes correctly.
- [ ] Creating, editing, and deleting an income performs the API request and updates the UI without full page reload.
- [ ] Navigation menu on all pages now contains a link to `/incomes`.
- [ ] `npx nx lint web` passes with zero errors.

---

### Task 7.4 — Web UI: Dashboard & Month Details integration of Income data

| Field            | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| **Status**       | `TODO`                                                             |
| **Platform**     | Web (`apps/web`)                                                   |
| **Target file**  | `apps/web/app/dashboard/page.tsx` · `apps/web/app/expenses/page.tsx` |
| **Dependencies** | Task 7.3 `DONE`                                                    |

**What to implement:**

- **Dashboard Integration**:
  - Fetch incomes alongside expenses and financing in `dashboard/page.tsx`.
  - Calculate monthly income aggregates (Confirmed vs Budget).
  - Add two new KPI cards to the top grid:
    - "Receita Total (12m)" (sum of all incomes)
    - "Saldo Líquido (12m)" (sum of all incomes minus sum of all outflows, including financing).
  - Update month column cards to display:
    - Income totals (both Confirmed and Budget)
    - Net Balance (Inflow - Outflow) for the month.
- **Month Details Integration**:
  - Update `apps/web/app/expenses/page.tsx` to handle both expenses and incomes when viewing a specific month (`?month=YYYY-MM`).
  - Add a summary card showing: Inflow (Receitas), Outflow (Despesas + Financiamento), and Net Balance (Saldo) for that month.
  - Implement a segmented control or tab toggle (e.g. "Despesas" vs "Receitas") to show the corresponding detail list for the month.

**Acceptance criteria:**

- [ ] Dashboard KPI cards and month grids show correct mathematical aggregates including incomes.
- [ ] Clicking a month column navigates to `/expenses?month=YYYY-MM`, which displays the consolidated monthly details summary card.
- [ ] Toggling between expenses and incomes tabs works reactively without full page reloads.
- [ ] `npx nx lint web` passes with zero errors.

---

### Task 7.5 — Web UI: House Location Map integration in settings / home

| Field            | Value                                                              |
| ---------------- | ------------------------------------------------------------------ |
| **Status**       | `TODO`                                                             |
| **Platform**     | Web (`apps/web`)                                                   |
| **Target file**  | `apps/web/app/settings/page.tsx` · `apps/web/app/dashboard/page.tsx` |
| **Dependencies** | Task 7.2 `DONE`                                                    |

**What to implement:**

- **Settings Page Map**:
  - Integrate a Leaflet map (using `react-leaflet` or pure Leaflet loaded dynamically on the client-side to avoid SSR `window is not defined` issues).
  - In `settings/page.tsx`, under "Dados da Casa", render the interactive map.
  - Allow users to click on the map to set/update `latitude` and `longitude` inputs, or type them and see the marker move.
  - Submit coordinates along with other house details when saving the house form.
- **Dashboard Map view**:
  - Add a beautiful, responsive Location card on the dashboard or in settings displaying the map with the saved home location marker.

**Acceptance criteria:**

- [ ] Map loads successfully in the settings page without SSR/hydration warnings.
- [ ] Clicking on the map updates coordinates in the form, and saving persists coordinates.
- [ ] Re-entering the settings page correctly renders the marker at the stored coordinates.
- [ ] `npx nx lint web` passes with zero errors.


