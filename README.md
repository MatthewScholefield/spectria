# Spectria

Zero-friction data visualization. Paste data, see charts.

## Development

```bash
npm install
npm run dev
```

## Usage

1. Open the app — animated landing page greets you
2. Paste CSV, TSV, or JSON data (or drag & drop a file)
3. Charts are generated automatically
4. Click the gear icon on any chart to customize title, type, colors, labels
5. Use "Add Data" to paste a second dataset — matching columns auto-merge for comparison
6. Rename datasets inline from the toolbar

## Build

```bash
npm run build
```

## Live Data Sources

Spectria can stream training metrics from a live server via Server-Sent Events (SSE). Your server must implement these endpoints:

| Method | Endpoint | Response |
|--------|----------|----------|
| `GET` | `/api/projects` | `[{name, run_count}]` |
| `GET` | `/api/projects/{name}/runs` | `[{run_id, status, baseline?, config?, finished_at?}]` |
| `GET` | `/api/projects/{name}/runs/{id}/data` | `[{col: value, ...}]` — full snapshot of rows |
| `SSE` | `/api/projects/{name}/runs/{id}/events` | Live event stream |

**SSE event types:**

- `row` — data payload is a JSON object representing one metric row. Keys starting with `_` are ignored.
- `complete` — signals the run is finished; no payload.

**Connection lifecycle:**

1. Client fetches projects and runs via the REST endpoints
2. For the selected run, a snapshot is loaded from `/data`
3. An `EventSource` connects to `/events` for live updates
4. Each `row` event appends data to the chart in real time
5. A `complete` event closes the stream

## Tech Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Recharts, Zustand, PapaParse, Framer Motion
