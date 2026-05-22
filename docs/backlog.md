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
| **Status**       | `TODO`                            |
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
| **Status**       | `TODO`                          |
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
| **Status**       | `TODO`                             |
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
| **Status**       | `TODO`                            |
| **Platform**     | Web (`apps/web`)                  |
| **Target file**  | `apps/web/app/dashboard/page.tsx` |
| **Dependencies** | Task 2.2 `DONE` · Task 3.1 `DONE` |

**What to implement:**

- 12-month grid from current month forward.
- Each column: financing installment + confirmed expenses sum (`bg-rose-600`) + budget sum (`bg-amber-600`) + total outflow.
- Click column → navigates to `/expenses?month=YYYY-MM`.
- If no financing record exists, financing row shows `—`.

**Acceptance criteria:**

- [ ] Grid renders 12 columns starting from current month.
- [ ] Confirmed and budget totals match the sum of `expenses` records for that month.
- [ ] Clicking a column navigates to the expense list filtered by that month.
- [ ] `npx nx lint web` passes with zero errors.
