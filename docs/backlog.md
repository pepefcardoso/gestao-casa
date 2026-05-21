### Sprint 1: Foundations & Base Structure (Rooms)

- **Task 1.1 (Backend):** Create the `houses` and `rooms` tables in Drizzle ORM with Zod insertion/selection schemas.
- **Task 1.2 (API):** Create Hono OpenAPI routes `POST /rooms` and `GET /rooms`.
- **Task 1.3 (Mobile UI):** Create the room listing and creation screen using React Native native components.

### Sprint 2: Adjustable Financing Engine

- **Task 2.1 (Shared Logic):** Create the pure utility function `calculateFinancing(params)` in `libs/shared-logic` to handle the mathematical calculations for the SAC/PRICE amortization schedules and apply the first and last installment locks via early returns.
- **Task 2.2 (Backend/API):** Create the `financing` table and endpoints to save/update configurations.
- **Task 2.3 (Web UI):** Create the analytical screen in Next.js featuring the 360-month table and manual adjustment inputs.

### Sprint 3: The Financial Heart (Expenses and Budgets)

- **Task 3.1 (Backend):** Create the `expenses` table with strict enumeration fields (`status`, `category`, `priority`) via Zod.
- **Task 3.2 (Shared Logic):** Create the function that takes an installment-based expense and projects future due dates.
- **Task 3.3 (Mobile/Web UIs):** Develop the rapid expense registration form (mobile focus) and the unified monthly cash flow dashboard (web focus).
