# Inventory Management System (IMS) — Frontend

A frontend-only inventory management demo built with **React**, **Vite**, and **TypeScript**. All data is persisted in the browser via `localStorage` — no backend required.

## Features

- **Dashboard** — overview cards (categories, units, products, total quantity, inventory value, low-stock count), a low-stock alert, and recent stock movements.
- **Categories & Units** — master data used by products; protected from deletion while still in use.
- **Products** — full CRUD with image, category, unit, description, cost price, discount percentage, and auto-calculated selling price. Optional product variants (e.g. size/color) that can inherit the product's name, cost price, and discount when left blank.
- **Stock Locations** — hierarchical warehouses/sub-locations. A fixed **Main Warehouse** is seeded and used as the default stocking location.
- **Inventory** — per-product stock across locations, with product images and location detail modal.
- **Stock Transfers** — move stock between locations with availability checks; every transfer is logged.
- **Stock Movements** — full movement history (inbound, transfer-in, transfer-out).
- **Search & Filtering** — every list page has search, and most include dropdown filters (category, parent location, type, location).
- **Pagination** — consistent pagination on all list pages.

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