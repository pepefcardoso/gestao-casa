# `mvp-spec.md` (Product Requirement Document - MVP)

## 1. Product Overview

The application aims to help property owners manage the finances, schedules, and structural information of their new homes. The focus of this MVP is to provide full control over cash flow (immediate expenses, installment plans, and budgets) and centralize real estate financing data into a single cross-platform interface.

## 2. MVP Scope (Phase 1)

### Module 1: House and Room Information (Base Structure)

- **Objective:** Allow registration of the property and its environments to create a relational link with expenses.
- **Key Fields:** House name, location, total area. Rooms (Name, area, color/notes).

### Module 2: Dynamic Expense and Budget Management

- **Objective:** Record cash outflows categorized by priority and execution state.
- **Business Rules:**
  - **Expense Status:** Must accept `Budget` (planned/unconfirmed) or `Expense` (confirmed/paid).
  - **Payment Type:** Pay-in-full (upfront) or Installments (generating automatic recurrence based on the number of installments).
  - **Links:** Each expense can (optionally) be linked to a specific room.
  - **Metadata:** Categories (Taxes, Furniture, Renovations, Services, Appliances) and Priorities (High, Medium, Low).

### Module 3: Flexible Financing Engine

- **Objective:** Simulate and monitor the evolution of the outstanding debt mathematically, while keeping it adjustable to real banking data.
- **Business Rules:**
  - **Initial Inputs:** Total property value, down payment amount (automatically calculating the financed amount), term (in months), annual/monthly interest rate, and amortization system (SAC or PRICE).
  - **Schedule Generation:** The system generates a month-by-month projection table (Interest + Amortization = Installment).
  - **Manual Adjustments (Overriding):** The user can manually edit the total value of the **1st installment** and the **last installment**. The system must recalculate the intermediate installments if amortization changes occur, but respect the boundaries set by the user if locked.

---

## 3. Use Cases (Use Cases for Engineering and AI)

### UC01: Dynamic Financing Configuration

- **Actors:** User.
- **Preconditions:** None (First access or settings tab).
- **Main Flow (Web - Next.js):**
  1. The user accesses the house settings screen.
  2. Inputs data: Property Value ($R\$\,500,000$), Down Payment ($R\$\,100,000$), Term ($360$ months), Rate ($10\%$ p.a.), System (`SAC`).
  3. The system calculates the Financed Value ($R\$\,400,000$) and generates the 360-row mathematical projection.
  4. The user clicks "Adjust Real Values" and edits the `first_parcel_override` and `last_parcel_override` fields.
  5. The system saves and locks these two ends, displaying the corrected flow.

### UC02: Logging an Expense / Budget with Installments

- **Actors:** User.
- **Preconditions:** Having at least one room registered (if linking is desired).
- **Main Flow (Mobile - Expo):**
  1. Out on the street, the user receives a quote for a sofa ($R\$\,3,000$ in $10\times$ installments of $R\$\,300$).
  2. Opens the app, clicks the quick "+" button.
  3. Fills in: Description ("Reclining Sofa"), Total Amount (3000), Installments (10), Status ("Budget"), Category ("Furniture"), Room ("Living Room").
  4. Upon saving, the system projects $R\$\,300$/month for the next 10 months in the forecasts tab as "Unconfirmed".
  5. When the user actually purchases it, they change the status to "Expense" with one click.

---

## 4. Screen Architecture (UX/UI Wireframe Concept)

Web Application (`apps/web`) - Analytical Focus

- **Extensive Financial Dashboard:** A calendar view of the next 12 months showing: Financing installments + Confirmed purchase installments + Budgets planned for that month.
- **Financing Panel:** Full table with scroll listing all installments, interest paid, and decreasing outstanding debt balance, with direct inputs to edit the first and last installments.

Mobile Application (`apps/mobile`) - Operational Focus

- **Home:** Quick shortcuts ("New Expense", "View House Measurements").
- **Shopping/Expense List:** Quick filter by "High Priority" (items that need urgent purchasing before moving in) and by "Room".

---

## 5. Database Entity Mapping (Conceptual for Drizzle)

To guide the AI agent without causing it to generate incorrect dynamic types or use `any`, the tables will strictly follow this logical mapping:

[House] 1 ─── 1 [Financing]
│
└─── N [Room] 1 ─── N [Expense]

- **`houses`**: `id (UUID)`, `name (text)`, `location (text)`, `total_area (numeric)`.
- **`rooms`**: `id (UUID)`, `house_id (FK)`, `name (text)`, `area (numeric)`, `color_code (text)`.
- **`financing`**: `id (UUID)`, `house_id (FK)`, `property_value (numeric)`, `down_payment (numeric)`, `term_months (integer)`, `interest_rate (numeric)`, `amortization_system (text: SAC/PRICE)`, `first_parcel_override (numeric)`, `last_parcel_override (numeric)`.
- **`expenses`**: `id (UUID)`, `room_id (FK, nullable)`, `description (text)`, `total_amount (numeric)`, `installments_count (integer)`, `status (text: BUDGET/CONFIRMED)`, `category (text)`, `priority (text: HIGH/MEDIUM/LOW)`, `due_date (timestamp)`.
