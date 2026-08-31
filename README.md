# Inventory Management System (IMS) — Frontend

A frontend-only inventory management demo built with **React**, **Vite**, and **TypeScript**. All data is persisted in the browser via `localStorage` — no backend required.
## live at - https://ims-dashboard-six.vercel.app/
## Features

- **Dashboard** — overview cards (categories, units, products, total quantity, inventory value, low-stock count), dynamic charts (movement mix donut, sales vs returns, top sellers, inventory value by category, stock by category/channel), a low-stock alert, and recent stock movements.
- **Categories & Units** — master data used by products; protected from deletion while still in use.
- **Products** — full CRUD with image, category, unit, description, cost price, discount percentage, and auto-calculated selling price. Optional product variants (e.g. size/color) that can inherit the product's name, cost price, and discount when left blank.
- **Stock Locations** — hierarchical warehouses/sub-locations with a **sales channel** (warehouse, storefront, pop-up, or online — e.g. Shopee / LINE). A fixed **Main Warehouse** is seeded and used as the default stocking location.
- **Inventory** — per-product stock across locations, with product images and location detail modal.
- **Stock Transfers** — move stock between locations with availability checks; every transfer is logged.
- **Sales** — record stock sold from any channel; every sale decrements inventory (optional order/receipt reference).
- **Returns** — record items returned from any channel; every return adds stock back (optional reason).
- **Stock Movements** — full movement history (inbound, transfer-in, transfer-out, sale, return) with type, location, and quantity details.
- **Quick Filters** — every list page has a sidebar with chip-based filters (category, channel, type, status, level) plus search, a price-range filter on products, and consistent pagination.

## Tech Stack

- React 19 + React Router 7 (hash-based routing)
- Vite 8 + TypeScript (strict)
- oxlint for linting
- No UI library — custom CSS in `src/index.css`

## Getting Started

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (default `http://localhost:5173`).

## Project Structure

```
src/
  components/        # Pages and UI components (layout, dashboard, products, …)
  hooks/             # useCollection — reactive localStorage-backed data hook
  storage/           # localStorage storage modules + keys
  seed/              # one-time seed / data reset logic
  types/             # shared TypeScript models
  utils/             # pricing, validation, formatting, colors, movements
  App.tsx            # route definitions
  main.tsx           # entry point (runs the seed check)
public/images/       # product images served at /images/…
```

## Data & Storage

- Everything is stored in `localStorage` under `inventory_*` keys.
- On first load, a single **Main Warehouse** stock location is created so new products are auto-stocked there. No categories, units, or products are pre-seeded.
- If you change the seed version (`SEED_VERSION` in `src/seed/seedData.ts`), all stored data is wiped once and re-initialised on the next load.

## Scripts

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `npm run dev`      | Start the Vite dev server          |
| `npm run build`    | Type-check and build to `dist/`    |
| `npm run preview`  | Preview the production build       |
| `npm run lint`     | Run oxlint                         |

## Notes

- Discount is expressed as a **percentage (0–100)**; the selling price is `cost price × (1 − discount/100)`.
- Currency values are displayed without a `$` symbol.
- This is a demo — data lives only in your browser and can be cleared by wiping site storage.
