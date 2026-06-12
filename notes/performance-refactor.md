# Performance Refactor Plan

## Overview
This plan addresses the major performance issues found in the Spectria codebase. Each step is self-contained and can be implemented by an agent end-to-end. Steps are ordered from highest-impact to lowest.

**Guidelines for agents:**
- Do NOT worry about backward compatibility
- Make changes directly — the app has not shipped yet
- Run `npx tsc --noEmit` after each step to verify types
- Run `npm run build` to verify build passes
- Commit after each step with a descriptive message

---

## Step 1: Memoize `getMergedData` — Move to a Proper Selector with Caching

**Status:** [x] Completed

### Problem
`getMergedData(chartId)` is defined as a method inside the Zustand store and is called directly inside `ChartCard` render. It rebuilds the entire merged/joined dataset on **every render** of every chart card. This is O(n*m) where n = rows, m = series — happening on every keystroke, every store update, every animation frame during live streams. This is the single largest performance bottleneck.

Additionally, `ChartCard` subscribes to `useStore((s) => s.datasets)` and `useStore((s) => s.sources)` just to compute `isLive` and display labels — causing the entire `ChartCard` to re-render whenever ANY dataset or source changes, even if unrelated to this chart.

### Implementation

1. **Remove `getMergedData` from the store** — it should not be a store method since it's derived state.

2. **Create `src/store/mergedDataCache.ts`** — a standalone memoization module:
   ```
   - Uses a WeakMap<ChartConfig, { deps: string; data: Row[] }> or a simple Map keyed by chartId
   - The "deps" string is a hash of: chart.series (datasetId+columnKey+visible), chart.xKey, chart.relativeMode, chart.relativeBase, plus the actual column data arrays for relevant datasets
   - Export: `getCachedMergedData(chartId: string, chart: ChartConfig, datasets: Dataset[]): Row[]`
   - On cache hit (same deps), return cached data
   - On cache miss, compute using the existing merge logic (move the body of current `getMergedData` here)
   - Include `applyRelativeTransform` logic inline
   - Export: `invalidateMergedData(chartId?: string)` for manual invalidation when needed
   ```

3. **Create `src/hooks/useChartData.ts`** — a custom hook that:
   - Selects ONLY the specific data it needs using `useStore` with shallow comparison:
     - The specific chart config (by id) — use `useStore(useCallback(s => s.charts.find(c => c.id === chartId), [chartId]))`
     - The relevant datasets (only those referenced by chart.series) — derive from chart + datasets
     - Whether the chart is live (derive from relevant sources only)
   - Calls `getCachedMergedData` with the selected data
   - Returns `{ data, sampledData, isLive, visibleSeries, seriesKeyMap, displayLabels, visibleDataKeys, xDomain, yDomain }` — all the computed values currently calculated inside ChartCard's render body
   - Use `useMemo` for displayLabels, seriesKeyMap, visibleSeries, visibleDataKeys, xDomain, yDomain, sampledData — with proper dependency arrays

4. **Refactor `ChartCard.tsx`**:
   - Remove direct `useStore` calls — use the new `useChartData(chart.id)` hook instead
   - The component should only subscribe to `showControls` (local state) and the pre-computed data from the hook
   - Remove all the inline computation (seriesKeyMap, displayLabels, visibleDataKeys, sampledData, xDomain, yDomain)
   - Pass the pre-computed values into `renderChart()`

5. **Delete `getMergedData` from the store interface and implementation** in `useStore.ts`

### Files to modify
- `src/store/useStore.ts` — remove `getMergedData`
- `src/store/mergedDataCache.ts` — NEW
- `src/hooks/useChartData.ts` — NEW
- `src/components/ChartCard.tsx` — refactor to use hook

### Verification
- `npx tsc --noEmit` passes
- `npm run build` passes
- Charts render identically to before

---

## Step 2: Fix Zustand Selector Granularity — Prevent Cascading Re-renders

**Status:** [x] Completed

### Problem
Multiple components subscribe to overly broad store slices:
- `ChartControls` subscribes to 15+ individual selectors BUT also subscribes to `datasets` (the full array) — so any dataset change re-renders ALL open ChartControls panels
- `Toolbar` subscribes to `datasets`, `sources`, and many action functions — re-renders on every store change
- `VisualizationView` subscribes to `s.charts` — re-renders the grid container (not the cards) on any chart change
- `StreamManager` subscribes to `s.sources` — re-renders on any source status change
- `useGlobalPaste` subscribes to `s.datasets` — re-renders on every dataset change

### Implementation

1. **`ChartControls.tsx`**:
   - Replace the `datasets` subscription with a derived selector that returns only the data needed:
     ```ts
     const chartDatasetIds = useMemo(() => new Set(chart.series.map(s => s.datasetId)), [chart.series]);
     const relevantDatasets = useStore(
       useCallback(s => s.datasets.filter(d => chartDatasetIds.has(d.id)), [chartDatasetIds])
     );
     ```
   - Keep the individual action selectors — they're stable references from Zustand

2. **`Toolbar.tsx`**:
   - The `datasets` subscription is needed for chip display — that's fine
   - BUT: `computeDisplayNames(datasets)` runs on every render. Wrap in `useMemo`:
     ```ts
     const { sharedPrefix, displayNames } = useMemo(
       () => computeDisplayNames(datasets),
       [datasets]
     );
     ```
   - The `sources` subscription for sorting live datasets is also fine but sort the datasets with `useMemo` too

3. **`useGlobalPaste.ts`**:
   - Change `datasets` subscription to only track count: `useStore(s => s.datasets.length)` instead of the full array

4. **`VisualizationView.tsx`**:
   - This component is lightweight but still subscribes to `s.charts` — consider memoing the grid items

5. **`StreamManager.tsx`**:
   - Change from `useStore((s) => s.sources)` to `useStore((s) => s.sources.map(src => src.id))` since it only needs IDs to render `<SourceConnection>` components
   - Actually, `SourceConnection` already does its own fine-grained lookup, so the parent just needs source IDs

### Files to modify
- `src/components/ChartControls.tsx`
- `src/components/Toolbar.tsx`
- `src/hooks/useGlobalPaste.ts`
- `src/components/VisualizationView.tsx`
- `src/components/StreamManager.tsx`

### Verification
- `npx tsc --noEmit` passes
- `npm run build` passes

---

## Step 3: Optimize Store Update Actions — Avoid Unnecessary Object Spreads

**Status:** [x] Completed

### Problem
Most store actions use `.map()` over the entire `charts` array, creating new objects for every chart even when only one chart changed:
```ts
charts: state.charts.map((c) =>
  c.id === chartId ? { ...c, title } : c
)
```
This creates a new array reference, which causes Zustand to notify all subscribers to `s.charts`. Since ChartCard uses individual chart objects, the `.map()` approach means every chart action triggers potential re-renders.

### Implementation

1. **Use `immer` middleware** for the Zustand store to enable direct mutations (which immer converts to efficient immutable updates):
   ```ts
   import { create } from 'zustand';
   import { immer } from 'zustand/middleware/immer';

   export const useStore = create<AppState>()(immer((set, get) => ({
     // ... all actions can now use draft mutations
     updateChartTitle: (chartId, title) => {
       set((state) => {
         const chart = state.charts.find(c => c.id === chartId);
         if (chart) chart.title = title;
       });
     },
   })));
   ```

2. **Convert ALL store actions** to use immer's direct mutation style instead of `.map()` spreads. This includes:
   - `updateChartTitle`, `updateChartType`, `updateChartXKey`
   - `updateChartRelativeMode`, `updateChartRelativeBase`, `updateChartYUnit`
   - `toggleSeriesVisibility`, `updateSeriesColor`, `updateSeriesLabel`
   - `addSeries`, `removeSeries`
   - `updateAxisBound`, `updateAxisScale`
   - `removeDataset`, `renameDataset`
   - `updateSourceStatus`, `removeSource`
   - `appendRowsToDataset`
   - `addDatasetFromTable`, `addData`

3. **Install immer**: `npm install immer`

4. **Adjust `set` calls** — with immer middleware, `set((state) => { ... })` receives a draft. No need to return anything from the callback. Just mutate the draft directly.

5. **Note on `immer` and `zustand/middleware/immer`**: Zustand ships with `zustand/middleware/immer` — no separate package needed. But you may need `npm install immer` as a peer dependency depending on the version.

### Files to modify
- `src/store/useStore.ts` — major refactor of all actions
- `package.json` — add immer dependency

### Verification
- `npx tsc --noEmit` passes
- `npm run build` passes
- All store actions work correctly (add data, toggle series, change chart type, etc.)

---

## Step 4: Memoize Chart Rendering with React.memo and Computed Values

**Status:** [x] Completed

### Problem
`ChartCard` re-renders on every parent re-render even when its chart data hasn't changed. The `renderChart()` function creates new objects on every call (new `commonProps`, new `xAxisProps`, new `yAxisProps`), which causes Recharts to do full reconciliation.

### Implementation

1. **Wrap `ChartCard` in `React.memo`** with a custom comparator:
   ```ts
   const ChartCard = React.memo(function ChartCard({ chart, index }: ...) { ... },
     (prev, next) => prev.chart === next.chart && prev.index === next.index
   );
   ```
   This works because with immer (Step 3), chart objects are stable references when unchanged.

2. **Extract chart-type rendering into separate memoized components**:
   - Create `src/components/charts/LineChartView.tsx`, `AreaChartView.tsx`, etc.
   - Each receives pre-computed props: `data`, `xKey`, `series`, `seriesKeyMap`, `displayLabels`, `xDomain`, `yDomain`, `yUnit`, `isLive`
   - Wrap each in `React.memo`

3. **Memoize `renderLegend` function** — it's recreated on every render. Move it outside the component or wrap in `useCallback`.

4. **Memoize `CustomTooltip`** — currently defined inline as a function component. Move it outside `ChartCard` (it already is, good) but ensure its props are stable.

5. **In `VisualizationView.tsx`**, memoize the chart card rendering:
   ```ts
   const ChartCards = useMemo(() =>
     charts.map((chart, i) => <ChartCard key={chart.id} chart={chart} index={i} />),
     [charts]
   );
   ```

### Files to modify
- `src/components/ChartCard.tsx` — React.memo + extract chart renderers
- `src/components/charts/LineChartView.tsx` — NEW
- `src/components/charts/AreaChartView.tsx` — NEW
- `src/components/charts/BarChartView.tsx` — NEW
- `src/components/charts/ScatterChartView.tsx` — NEW
- `src/components/VisualizationView.tsx`

### Verification
- `npx tsc --noEmit` passes
- `npm run build` passes
- All chart types render correctly

---

## Step 5: Optimize `appendRowsToDataset` for Live Streaming

**Status:** [x] Done

### Implementation

1. **Use immer** (already added in Step 3) to mutate only the target dataset directly:
   ```ts
   appendRowsToDataset: (datasetId, rows) => {
     set((state) => {
       const dataset = state.datasets.find(d => d.id === datasetId);
       if (!dataset) return;
       // ... append rows directly to dataset.table.columns
       // Only regenerate charts if this is the first time generating charts for this dataset
     });
   }
   ```

2. **Skip chart regeneration** when rows are appended to an existing dataset that already has charts:
   - The current code calls `mergeDatasetIntoCharts` on every append — but once charts exist for a dataset, appending rows doesn't change the chart structure (series, types, etc.)
   - Only regenerate charts if `hasChartsForDataset === false` AND the dataset now has >= 2 rows
   - The merged data will be recomputed by the caching layer from Step 1

3. **Avoid rebuilding column maps** — maintain a `Map<string, { colIndex: number }>` on the dataset for O(1) column lookup, or use the immer draft to push directly to the correct column.

4. **Batch updates during streaming**: Consider debouncing or throttling `appendRowsToDataset` calls — the `useStreamSource` hook already uses `requestAnimationFrame`, but for very fast streams, consider batching multiple frames.

### Files to modify
- `src/store/useStore.ts` — `appendRowsToDataset` action

### Verification
- `npx tsc --noEmit` passes
- `npm run build` passes
- Live streaming still works correctly with data appearing in charts

---

## Step 6: Optimize Display Name Computation

**Status:** [x] Completed

### Problem
`computeDisplayNames(datasets)` is called in multiple components:
- `ChartCard.tsx` line 83: `const { displayNames: datasetDisplayNames } = computeDisplayNames(datasets);`
- `ChartControls.tsx` line 57: `const { displayNames: datasetDisplayNames } = computeDisplayNames(datasets);`
- `Toolbar.tsx` line 25: `const { sharedPrefix, displayNames } = computeDisplayNames(datasets);`

Each call iterates all datasets, builds hierarchies, computes common prefixes. This is called on every render of each component.

### Implementation

1. **Move `computeDisplayNames` into a Zustand derived selector or a dedicated memoized hook**:
   ```ts
   // src/hooks/useDisplayNames.ts
   import { useMemo } from 'react';
   import { useStore } from '../store/useStore';
   import { computeDisplayNames } from '../utils/format';

   export function useDisplayNames() {
     const datasets = useStore(s => s.datasets);
     return useMemo(() => computeDisplayNames(datasets), [datasets]);
   }
   ```

2. **Replace all `computeDisplayNames(datasets)` calls** with `useDisplayNames()` in:
   - `ChartCard.tsx`
   - `ChartControls.tsx`
   - `Toolbar.tsx`

3. **Also memoize `getDisplayLabel` calls** in ChartCard and ChartControls — wrap the display labels map computation in `useMemo`:
   ```ts
   const displayLabels = useMemo(
     () => new Map(chart.series.map(s => [s, getDisplayLabel(...)])),
     [chart.series, relevantDatasets, datasetDisplayNames]
   );
   ```

### Files to modify
- `src/hooks/useDisplayNames.ts` — NEW
- `src/components/ChartCard.tsx`
- `src/components/ChartControls.tsx`
- `src/components/Toolbar.tsx`

### Verification
- `npx tsc --noEmit` passes
- `npm run build` passes

---

## Step 7: Replace Framer Motion with CSS Animations Where Possible

**Status:** [x] Completed

### Problem
Framer Motion is used extensively for simple entrance animations in:
- `Toolbar.tsx` — single `motion.div` wrapper
- `ChartCard.tsx` — `motion.div` with staggered entrance
- `DataInputModal.tsx` — modal animations
- `EmptyState.tsx` — entrance animations
- `ConnectSourceModal.tsx` — modal animations
- `ConfigDiffPanel.tsx` — slide-in panel
- `RunBrowser.tsx` — confirm bar animation

Framer Motion adds ~30KB to the bundle and its `AnimatePresence` and layout animations trigger React reconciliation on every render.

### Implementation

1. **Remove `framer-motion` dependency** entirely.

2. **Replace all `motion.div` with regular `<div>` elements** using CSS animations:
   - Entrance animations: use CSS `@keyframes` with `animation` property
   - Exit animations: use CSS transitions with state classes (e.g., `opacity-0 → opacity-1`)
   - For `AnimatePresence` (exit animations on unmount): Use a custom `useTransition` hook or simply skip exit animations (they're non-essential)

3. **Add CSS animations** to `index.css`:
   ```css
   @keyframes fadeIn {
     from { opacity: 0; transform: translateY(10px); }
     to { opacity: 1; transform: translateY(0); }
   }
   @keyframes scaleIn {
     from { opacity: 0; transform: scale(0.95); }
     to { opacity: 1; transform: scale(1); }
   }
   @keyframes slideInRight {
     from { transform: translateX(100%); }
     to { transform: translateX(0); }
   }
   .animate-fade-in { animation: fadeIn 0.3s ease-out; }
   .animate-scale-in { animation: scaleIn 0.3s ease-out; }
   .animate-slide-right { animation: slideInRight 0.3s ease-out; }
   ```

4. **For the staggered chart card entrance**, use CSS `animation-delay` with inline styles:
   ```tsx
   <div style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in opacity-0" />
   ```
   Note: use `animation-fill-mode: both` so it stays at opacity 0 until the delay passes.

5. **For modal show/hide**: Use standard conditional rendering `{show && <div className="animate-scale-in">...</div>}` — skip exit animations.

6. **Uninstall framer-motion**: `npm uninstall framer-motion`

### Files to modify
- `src/index.css` — add CSS animations
- `src/components/Toolbar.tsx` — replace motion.div
- `src/components/ChartCard.tsx` — replace motion.div
- `src/components/DataInputModal.tsx` — replace motion.div + AnimatePresence
- `src/components/EmptyState.tsx` — replace motion.div
- `src/components/ConnectSourceModal.tsx` — replace motion.div + AnimatePresence
- `src/components/ConfigDiffPanel.tsx` — replace motion.div + AnimatePresence
- `src/components/RunBrowser.tsx` — replace motion.div
- `package.json` — remove framer-motion

### Verification
- `npx tsc --noEmit` passes
- `npm run build` passes
- Visual animations still look smooth

---

## Step 8: Final Cleanup and Bundle Optimization

**Status:** [x] Completed

### Problem
Minor remaining optimizations that compound.

### Implementation

1. **Lazy-load `papaparse`** — it's only needed when parsing data (user action):
   ```ts
   // Instead of: import Papa from 'papaparse';
   const Papa = await import('papaparse');
   ```
   Or use `React.lazy` for components that use it.

2. **Verify `React.memo` on all leaf components**:
   - `AnimatedBackground` — pure, no re-renders needed. Wrap in `React.memo`.
   - `SourceConnection` in `StreamManager` — already lightweight, but memoize.

3. **Add `will-change: transform`** to animated elements in CSS for GPU acceleration.

4. **Consider code-splitting** `RunBrowser` and `ConnectSourceModal` since they're only shown when the user clicks "Connect":
   ```ts
   const ConnectSourceModal = React.lazy(() => import('./ConnectSourceModal'));
   ```

5. **Run final type check and build**: `npx tsc --noEmit && npm run build`

6. **Verify the app loads and works correctly** in dev mode.

### Files to modify
- `src/engine/parser.ts` — lazy papaparse
- `src/components/AnimatedBackground.tsx` — React.memo
- `src/App.tsx` — lazy load modals
- `src/index.css` — will-change hints

### Verification
- `npx tsc --noEmit` passes
- `npm run build` passes
- `npm run dev` — verify app works

---

## Summary of Expected Impact

| Step | Impact | Area |
|------|--------|------|
| 1. Memoize getMergedData | **CRITICAL** — eliminates O(n*m) recomputation on every render | Chart rendering |
| 2. Zustand selector granularity | **HIGH** — prevents cascading re-renders across components | All components |
| 3. Store actions with immer | **HIGH** — efficient updates, enables stable references for React.memo | Store |
| 4. React.memo on ChartCard | **HIGH** — prevents unnecessary chart re-renders | Chart rendering |
| 5. Optimize appendRowsToDataset | **HIGH** — critical for live streaming performance | Live data |
| 6. Display name memoization | **MEDIUM** — eliminates redundant computation | Labels |
| 7. Remove framer-motion | **MEDIUM** — reduces bundle by ~30KB, removes JS animation overhead | Bundle size |
| 8. Final cleanup | **LOW** — minor improvements | Overall |
