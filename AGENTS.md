# Spectria - CLAUDE.md

## Tech Stack
React 19 + TypeScript, Vite, Tailwind CSS 4, Recharts, Zustand, PapaParse, Framer Motion, Lucide React

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npx tsc --noEmit` — type check

## Architecture

### Data Flow
Raw text → `engine/parser.ts` (format detection + parsing) → `DataTable` → `engine/analyzer.ts` (type inference, index detection, chart generation) → `ChartConfig[]` → Zustand store → Recharts rendering

### Key Modules
- `src/engine/` — Pure logic: parsing, type inference, chart suggestion/merging
- `src/store/useStore.ts` — Zustand store: datasets, charts, all customization actions, `getMergedData()` for chart rendering
- `src/components/ChartCard.tsx` — Renders charts via Recharts with custom tooltip/legend
- `src/components/ChartControls.tsx` — Inline chart config (title, type, X-axis, series toggle/color/label)
- `src/components/Toolbar.tsx` — Dataset chips, grid toggle, add data button
- `src/components/EmptyState.tsx` — Landing page with paste/upload/drop
- `src/components/DataInputModal.tsx` — Modal for adding additional datasets

### Multi-Dataset Merging
When a second dataset is added, `analyzer.ts` merges series with matching column names onto the same chart. Each dataset gets a distinct palette (primary vs secondary). Series data keys use `columnKey + '_' + datasetId.slice(-6)` to avoid collisions.

### Styling
- Glassmorphism cards (`glass-card` class), animated mesh gradient background
- CSS custom properties in `index.css`, Tailwind `@theme` extension
- Custom Recharts tooltip and legend for dark theme consistency
