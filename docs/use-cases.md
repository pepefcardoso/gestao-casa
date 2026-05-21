### UC01 – Configure Property and Rooms

- **Actor:** User.
- **Action:** Create the physical structure of the house.
- **Main Flow (Mobile - Expo):**
  1. The user opens the app for the first time and sees a welcoming screen inviting them to register their new home.
  2. The user fills in the name (e.g., "Apartment 42") and the area (e.g., `85`).
  3. The system redirects to the "Rooms" sub-screen.
  4. The user clicks "+" and adds "Living Room" (`22` m²), "Kitchen" (`12` m²), etc.
- **Business Rules for the AI:**
  - The area of a room cannot be negative or zero (validate via Zod on the backend).
  - The generated house ID must be a UUID v4.

### UC02 – Generate and Adjust Financing

- **Actor:** User.
- **Action:** Set up the simulator with real banking data.
- **Main Flow (Web - Next.js):**
  1. The user accesses the "Financing" tab on the Web platform.
  2. Inputs initial values: Property ($R\$\,500,000$), Down Payment ($R\$\,100,000$), Term ($360$ months), Rate ($10\%$ p.a.), System (`SAC`).
  3. The system calculates the financed amount ($R\$\,400,000$) and renders the complete table with the 360 projected rows.
  4. Next to the main fields, there are two optional inputs: **Real Value of the 1st Installment** and **Real Value of the Last Installment**.
  5. The user fills in these fields to match the bank's billing statement.
- **Business Rules for the AI:**
  - If the user provides overrides for the first and last installments, the mathematical calculation engine must lock those static values into the return array and dilute the interest differences across the intermediate installments.

### UC03 – Register Expense or Budget

- **Actor:** User.
- **Action:** Add an upfront expense, installment expense, or a future budget plan.
- **Main Flow (Mobile - Expo):**
  1. The user clicks the floating "+" button on the mobile home screen.
  2. Enters the title ("Stainless Steel Refrigerator"), the total value ($R\$\,4,000$), and selects the category ("Appliances").
  3. Chooses the Status: `Budget` (still researching) or `Expense` (purchased).
  4. Chooses the Type: `Pay-in-full` or `Installments`. If installments is chosen, a numerical field opens for the installment count (e.g., `10`).
  5. Optionally, selects the target room ("Kitchen").
- **Business Rules for the AI:**
  - If the status is `Budget`, the amount should not be added to the "Actual Expenses" chart, only to the "Cash Forecast" chart.
  - If split into $10\times$ installments, the system must automatically project the divided amount over the next 10 months starting from the selected due date.
