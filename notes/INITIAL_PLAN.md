# Spectra - Initial Plan

This document captures the original design and architecture plan for Spectra. Implementation may deviate from this over time.

## Product Vision

Spectra is a zero-friction data visualization tool. You paste data, it visualizes. No configuration wizards, no file format dialogs, no "step 1 of 5" flows. Just: paste, see, refine.

The experience should feel magical — like the app *understands* your data and presents it beautifully without asking questions. But the magic is grounded in smart heuristics: detecting delimiters, inferring types, identifying index columns, and choosing sensible chart defaults.

---

## Design Philosophy

### The Three States of the App

1. **Empty State** — A luminous, atmospheric landing. No chrome, no toolbars. Just a gentle invitation to paste or drop data. The background breathes with slow color shifts.

2. **Visualization State** — Data is visualized. Charts appear in a clean grid. A compact toolbar gives access to customization. The background recedes to a subtle gradient.

3. **Configuration State** — Inline controls for fine-tuning a specific chart. Axis labels, colors, series visibility, chart type.

### Visual Identity

- **Atmosphere over structure** — The app should feel like working inside a living visualization
- **Glassmorphism cards** — Charts sit on frosted glass cards with soft borders
- **Color language** — Curated, vibrant but harmonious palette
- **Typography** — Clean, modern sans-serif (Inter)
- **Motion** — Smooth transitions between states via Framer Motion

### Background Design

- Slow-moving mesh gradient (3-4 colors) over ~20 seconds
- Deep indigo → teal → purple → navy
- Noise texture overlay for depth
- Dims when charts are displayed

---

## UX Flow

### Primary Flow: Paste CSV
1. User opens app → sees empty state
2. User pastes CSV → data is auto-detected (delimiter, headers, types)
3. App identifies index column + value columns
4. One chart per value column, sharing the index as X-axis
5. Charts render in a responsive grid

### Customization Flow
- Click any chart → reveals inline controls
- Changes are instant, no "apply" button

### Comparison Flow (Multiple Datasets)
- Paste new data adds it as a new "dataset" with auto-generated name
- Series from different datasets with matching column names auto-merge onto the same chart
- Each dataset gets a distinct color palette (primary vs secondary)

---

## Data Intelligence Engine

### Auto-Detection Pipeline
```
Input: raw text → Detect format (CSV/TSV/JSON) → Parse → Detect headers → Infer column types → Identify index column → Generate visualization plan
```

### Smart Defaults
- **Chart type**: Line by default for sequential data
- **Colors**: Curated 8-color primary palette, secondary palette for additional datasets
- **Y-axis**: Auto-scale with 5% padding

---

## Tech Stack (Chosen)

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | React 19 + TypeScript | Industry standard |
| Build | Vite | Fastest dev experience |
| Charts | Recharts | Declarative React charts on D3 |
| Styling | Tailwind CSS 4 | Utility-first, rapid design |
| Animations | Framer Motion | Declarative React animations |
| State | Zustand | Minimal boilerplate |
| Parsing | PapaParse | Best CSV parser |
| Icons | Lucide React | Clean, consistent |

---

## Color Palette

Primary: `#6366f1` `#f43f5e` `#10b981` `#f59e0b` `#3b82f6` `#8b5cf6` `#ec4899` `#14b8a6`
Secondary: `#818cf8` `#fb7185` `#34d399` `#fbbf24` `#60a5fa` `#a78bfa` `#f472b6` `#2dd4bf`
