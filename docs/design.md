## 1. Design Philosophy & Core Principles

This design system is engineered to provide an airy, minimalist, and premium "Apple-like" experience for financial tracking. It prioritizes low cognitive load through generous whitespace, soft elevations, and structural translucency, moving away from rigid, boxy layouts.

- **Content Over Chrome:** We use whitespace and subtle typography hierarchies to separate data, strictly avoiding harsh borders or heavy grid lines.
- **Material & Depth:** Floating cards on a frost-gray canvas, combined with `backdrop-blur` overlays, create a physical sense of depth and hierarchy without feeling cluttered.
- **Soft Semantics:** Financial alerts and statuses use tinted pastel backgrounds with vibrant text to inform users gently, eliminating visual stress and the "warning fatigue" of solid, heavily saturated colors.
- **Progressive Disclosure:** Complex 12-month data is tucked behind intuitive horizontal scrolling or macro-level charts, ensuring the user is only presented with the most relevant information (Current & Next Month) by default.

---

## 2. Color Palette & Semantic Tokens (Frost-Mint)

To ensure a premium cross-platform FinTech aesthetic, color values are mapped to explicit semantic roles. This system utilizes a customized **"Frost-Mint"** palette: a cool, breathable off-white canvas populated by pure white cards and vibrant, yet refined, accent colors.

### 2.1 Brand & Neutral Colors

| Token Name      | Hex Code                   | Purpose / Application                                  |
| --------------- | -------------------------- | ------------------------------------------------------ |
| `text-primary`  | `#1D1D1F`                  | Primary Typography, Deep dark grey (softer than black) |
| `text-muted`    | `#86868B`                  | Secondary details, dates, small helper texts           |
| `brand-emerald` | `#10B981`                  | Primary Brand Color, CTA Buttons, Positive Cashflow    |
| `canvas-frost`  | `#F5F5F7`                  | Primary App Background (Web and Mobile Canvas)         |
| `surface-white` | `#FFFFFF`                  | Card backgrounds, Form inputs, Elevated surfaces       |
| `glass-surface` | `rgba(255, 255, 255, 0.7)` | Used with `backdrop-blur-xl` for sticky headers        |

### 2.2 Financial Status & Priority Semantics (Soft Badges)

To maintain an airy feel, statuses use "soft badges" (light background, darker text) instead of solid saturated blocks.

| Token/State           | Web Tailwind Classes          | Mobile React Native Style                      |
| --------------------- | ----------------------------- | ---------------------------------------------- |
| **Confirmed Expense** | `bg-rose-50 text-rose-600`    | `backgroundColor: '#FFF1F2', color: '#E11D48'` |
| **Planned Budget**    | `bg-amber-50 text-amber-600`  | `backgroundColor: '#FFFBEB', color: '#D97706'` |
| **High Priority**     | `text-orange-500 font-medium` | `color: '#F97316', fontWeight: '500'`          |
| **Medium Priority**   | `text-blue-500 font-medium`   | `color: '#3B82F6', fontWeight: '500'`          |
| **Low Priority**      | `text-gray-400 font-medium`   | `color: '#9CA3AF', fontWeight: '500'`          |

> 💡 **Room Tags:** Colors assigned to specific rooms should follow the soft badge approach. If a room is "Blue", use a light blue background (`bg-blue-50`) with a visible blue dot or text (`text-blue-600`).

---

## 3. Typography & Geometry

### 3.1 Typography Hierarchy

Fonts must balance geometric modernity with absolute numerical legibility.

- **Web Font Stack:** `Inter`, sans-serif (emulates San Francisco for web).
- **Mobile Font Stack:** Native System Font (San Francisco on iOS, Roboto on Android).
- **Financial Data:** All numbers, metrics, and table figures must use `tabular-nums` to ensure exact column alignment. Drop the `monospace` requirement in favor of tabular spacing.

**Web Scaling (Tailwind):**

- **Page Titles (H1):** `text-3xl font-semibold tracking-tight text-[#1D1D1F]`
- **Section Headers (H2):** `text-xl font-medium tracking-tight text-[#1D1D1F]`
- **Table Metrics:** `text-sm font-medium tabular-nums text-[#1D1D1F]`
- **Muted Body:** `text-xs text-[#86868B]`

### 3.2 Geometry, Shadows & Materials

- **Border Radius:** `rounded-2xl` or `rounded-3xl` for main cards. `rounded-full` for badges, tags, and standard buttons.
- **Borders:** **Do not use borders on standard cards.** Rely on shadow and canvas contrast.
- **Elevation (Shadow):** `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` (An ultra-diffused, soft shadow that makes cards float).
- **Glassmorphism:** Navigation bars, bottom sheets, and sticky table headers must use `bg-white/70 backdrop-blur-xl`.

---

## 4. UI Layout & Cross-Platform Architecture

### 4.1 Web Application (`apps/web`) - Analytical Focus

- **The Dashboard Flow:** Instead of a rigid 12-month grid, default to a **Macro Area Chart** at the top summarizing the year. Below, display a highly detailed view of the **Current & Next Month** only.
- **Horizontal Navigation:** Further months are accessible via a fluid, horizontal scrolling container (hide the scrollbar, use drag-to-scroll or subtle arrows) to reduce cognitive overload.
- **The Map:** The Leaflet map must be restyled using a minimalist tile provider like **CartoDB Positron** or a custom Mapbox monochromatic theme to blend seamlessly with the Frost-Mint aesthetic.

### 4.2 Mobile Application (`apps/mobile`) - Operational Focus

- **Floating Action Canvas:** The "Add Expense" feature should trigger a glassmorphic bottom sheet (`backdrop-blur-xl` over the Frost canvas) with large, thumb-friendly touch targets.
- **Fluid Inputs:** The dual-input installment engine (slider + text input) remains, but styled with soft tracks and a prominent, pill-shaped primary action button.

---

## 5. UI Component States & Micro-Interactions

Every interaction should feel tactile and responsive.

- **Hover States (Web):** Cards should subtly lift on hover: `transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)]`.
- **Active/Click States:** Buttons must scale down slightly to mimic physical depression: `active:scale-95 transition-transform`.
- **Inputs & Focus:** Form fields should have a very soft gray background (`bg-gray-50`) with no border. On focus, apply a subtle ring: `focus:ring-2 focus:ring-emerald-500/50 focus:bg-white transition-all`.
- **Transitions:** State changes (like toggling a budget to confirmed) must cross-fade smoothly over 200-300ms, updating the soft badge colors without jarring layout shifts.

---

## 6. Guardrails for UI Generation (AI-AX Instructions)

- **Rule 1 (No Borders):** Strip out all utility classes like `border-mint-slate-400/20` or `border-gray-200` from card containers. Use the defined soft shadow and Frost canvas contrast instead.
- **Rule 2 (Glass Overlays):** Whenever an element floats over scrolling content (headers, bottom mobile menus, modals), it MUST use translucency (`bg-white/70 backdrop-blur-xl` or equivalent native React Native BlurView).
- **Rule 3 (Soft Semantics):** Never use solid saturated backgrounds (`bg-red-500`, `bg-amber-600`) for data tables or room tags. Always use the `bg-color-50` + `text-color-600` soft badge pattern.
- **Rule 4 (Data Legibility):** Apply `tabular-nums` to any element displaying currency or dates.
