# MVP Specification

## 1. Product Overview

Application for property owners to manage finances, schedules, and structural data of a new home. The MVP delivers full cash flow control (immediate expenses, installment plans, budgets) and real estate financing tracking in a single cross-platform interface.

**Platforms:** Web (Next.js) for analytical tasks, Mobile (Expo) for operational/field tasks.

---

## 2. MVP Modules

### Module 1 — House & Room Structure

**Purpose:** Register the property and its environments as the relational anchor for all expenses.

| Field           | Type      | Rules                                                     |
| --------------- | --------- | --------------------------------------------------------- |
| House name      | `text`    | required                                                  |
| Location        | `text`    | optional                                                  |
| Total area      | `numeric` | optional, must be > 0                                     |
| Room name       | `text`    | required                                                  |
| Room area       | `numeric` | optional, must be > 0 — Zod rejects zero or negative      |
| Room color code | `text`    | hex string (e.g. `#3b82f6`), used as visual tag across UI |

---

### Module 2 — Expense & Budget Management

**Purpose:** Record all cash outflows categorized by priority and confirmation state.

#### Status (enum)

| Value       | Meaning               | Chart behavior                             |
| ----------- | --------------------- | ------------------------------------------ |
| `BUDGET`    | Planned, unconfirmed  | Appears in Cash Forecast only              |
| `CONFIRMED` | Purchased / committed | Appears in Actual Expenses + Cash Forecast |

#### Category (enum)

`TAX` · `PRODUCT` · `SERVICE` · `FURNITURE` · `APPLIANCE` · `RENOVATION`

#### Priority (enum)

| Value    | UI color          | Icon            |
| -------- | ----------------- | --------------- |
| `HIGH`   | `text-orange-600` | `AlertTriangle` |
| `MEDIUM` | `text-blue-600`   | `Circle`        |
| `LOW`    | `text-slate-600`  | `ArrowDown`     |

#### Payment types

- **Upfront:** single entry, `installments_count = 1`.
- **Installments:** agent must project N entries forward from `due_date`, one per month, each with `total_amount / installments_count`.

#### Business rules

- `room_id` is optional (expense may not be linked to a room).
- Status toggle `BUDGET → CONFIRMED` converts all projected installment entries to confirmed at once.
- Projected installment entries share the same `description` with a suffix `(X/N)`.

---

### Module 3 — Financing Engine

**Purpose:** Simulate and track mortgage debt mathematically, adjustable to real bank statements.

#### Inputs

| Field                   | Type             | Rules                                 |
| ----------------------- | ---------------- | ------------------------------------- |
| `property_value`        | `numeric`        | required, > 0                         |
| `down_payment`          | `numeric`        | required, ≥ 0, < `property_value`     |
| `term_months`           | `integer`        | required, 1–360                       |
| `interest_rate`         | `numeric`        | annual rate, e.g. `0.10` for 10% p.a. |
| `amortization_system`   | `SAC` \| `PRICE` | required                              |
| `first_parcel_override` | `numeric`        | optional — locks installment 1        |
| `last_parcel_override`  | `numeric`        | optional — locks installment 360      |

#### Derived value

```
financed_amount = property_value - down_payment
```

#### Amortization formulas

**SAC (Constant Amortization):**

```
monthly_rate = (1 + annual_rate) ^ (1/12) - 1
amortization = financed_amount / term_months          // constant
interest[n]  = outstanding_balance[n] * monthly_rate
installment[n] = amortization + interest[n]           // decreases each month
```

**PRICE (Constant Installment):**

```
monthly_rate   = (1 + annual_rate) ^ (1/12) - 1
installment    = financed_amount * (monthly_rate / (1 - (1 + monthly_rate) ^ -term_months))
interest[n]    = outstanding_balance[n] * monthly_rate
amortization[n] = installment - interest[n]           // increases each month
```

#### Override logic

The `calculateFinancing()` function in `libs/shared-logic/src/utils/calculate-financing.ts` must:

1. Compute the full N-row schedule using the selected formula.
2. If `first_parcel_override` is set → replace row 1 total; distribute the delta proportionally across rows 2…N-1.
3. If `last_parcel_override` is set → replace row N total; distribute the delta proportionally across rows 2…N-1.
4. Both overrides may be set simultaneously; apply them as early returns before distribution.
5. Return type: `FinancingInstallment[]` (defined in `libs/backend/src/db/schema.ts`).

---

## 3. Entity Relationship

```
[House] 1 ──── 1 [Financing]
   │
   └──── N [Room] 1 ──── N [Expense]
```

### Field map (Drizzle schema reference)

> Canonical source: `libs/backend/src/db/schema.ts`. The table below is for quick agent reference only — never define types manually from here.

| Table       | Key fields                                                                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `houses`    | `id (uuid PK)`, `name`, `location`, `total_area`, `created_at`                                                                                                                                                           |
| `rooms`     | `id (uuid PK)`, `house_id (FK → houses, cascade delete)`, `name`, `area`, `color_code`, `created_at`                                                                                                                     |
| `financing` | `id (uuid PK)`, `house_id (FK → houses, unique, cascade delete)`, `property_value`, `down_payment`, `term_months`, `interest_rate`, `amortization_system`, `first_parcel_override`, `last_parcel_override`, `created_at` |
| `expenses`  | `id (uuid PK)`, `room_id (FK → rooms, nullable, set null on delete)`, `description`, `total_amount`, `installments_count`, `status`, `category`, `priority`, `due_date`, `created_at`                                    |

---

## 4. Screen Architecture

### Web (`apps/web`) — Analytical

| Screen              | Path         | Primary data                                                    |
| ------------------- | ------------ | --------------------------------------------------------------- |
| Financial dashboard | `/dashboard` | 12-month calendar: financing + confirmed installments + budgets |
| Financing panel     | `/financing` | 360-row amortization table + area chart + override inputs       |
| Expense list        | `/expenses`  | Filter by status, category, priority, room                      |
| House settings      | `/settings`  | House fields + room management                                  |

**Financing panel layout requirements:**

- Table: fixed header (`sticky top-0`), numerical columns `text-right`, monospace font (`font-mono tabular-nums`).
- Override inputs: sticky beside first/last row boundaries.
- Area chart above table: X = months 1→360, Y = R$ value, two layers (amortization + interest).

### Mobile (`apps/mobile`) — Operational

| Screen       | Route           | Primary action                                                              |
| ------------ | --------------- | --------------------------------------------------------------------------- |
| Home         | `/`             | Quick shortcuts to rooms and new expense                                    |
| Room detail  | `/rooms/[id]`   | Area, color, notes, linked expenses                                         |
| Expense form | `/expenses/new` | Status toggle, category, installment slider (1–24) + text input (up to 360) |
| Expense list | `/expenses`     | Filter by priority + room                                                   |

**Expense form requirements:**

- Big toggle: `Budget` ↔ `Confirmed`.
- Installment input: thumb slider (1–24 months) + co-located text field (up to 360).
- Live preview above inputs: `R$ {total} ÷ {n} = R$ {per_month}/mês`.
