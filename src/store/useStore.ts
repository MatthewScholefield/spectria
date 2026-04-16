import { create } from 'zustand';
import type { Dataset, ChartConfig, ChartType } from '../engine/types';
import { parseRawData } from '../engine/parser';
import { generateCharts, mergeDatasetIntoCharts } from '../engine/analyzer';
import { generateId, generateRunName } from '../utils/format';

type GridColumns = 1 | 2 | 3;

interface AppState {
  datasets: Dataset[];
  charts: ChartConfig[];
  gridColumns: GridColumns;
  showDataModal: boolean;
  editingChartId: string | null;

  addData: (rawText: string, name?: string) => void;
  removeDataset: (id: string) => void;
  renameDataset: (id: string, name: string) => void;

  updateChartTitle: (chartId: string, title: string) => void;
  updateChartType: (chartId: string, type: ChartType) => void;
  updateChartXKey: (chartId: string, xKey: string) => void;
  toggleSeriesVisibility: (chartId: string, seriesIndex: number) => void;
  updateSeriesColor: (chartId: string, seriesIndex: number, color: string) => void;
  updateSeriesLabel: (chartId: string, seriesIndex: number, label: string) => void;

  setGridColumns: (cols: GridColumns) => void;
  setShowDataModal: (show: boolean) => void;
  setEditingChartId: (id: string | null) => void;

  getMergedData: (chartId: string) => Record<string, unknown>[];
}

export const useStore = create<AppState>((set, get) => ({
  datasets: [],
  charts: [],
  gridColumns: 2,
  showDataModal: false,
  editingChartId: null,

  addData: (rawText: string, name?: string) => {
    const table = parseRawData(rawText);
    if (!table) return;

    const state = get();
    const datasetId = generateId();
    const datasetName = name || generateRunName(state.datasets.length);

    const dataset: Dataset = { id: datasetId, name: datasetName, table };

    let newCharts: ChartConfig[];
    if (state.datasets.length === 0) {
      newCharts = generateCharts(table, datasetId, datasetName, 0);
    } else {
      newCharts = mergeDatasetIntoCharts(state.charts, table, datasetId, datasetName, state.datasets.length);
    }

    set({
      datasets: [...state.datasets, dataset],
      charts: newCharts,
      showDataModal: false,
    });
  },

  removeDataset: (id: string) => {
    set((state) => {
      const datasets = state.datasets.filter((d) => d.id !== id);
      const charts = state.charts
        .map((chart) => ({
          ...chart,
          series: chart.series.filter((s) => s.datasetId !== id),
        }))
        .filter((chart) => chart.series.length > 0);
      return { datasets, charts };
    });
  },

  renameDataset: (id: string, name: string) => {
    set((state) => ({
      datasets: state.datasets.map((d) =>
        d.id === id ? { ...d, name } : d
      ),
      charts: state.charts.map((chart) => ({
        ...chart,
        series: chart.series.map((s) =>
          s.datasetId === id
            ? { ...s, label: `${name} · ${s.columnKey}` }
            : s
        ),
      })),
    }));
  },

  updateChartTitle: (chartId: string, title: string) => {
    set((state) => ({
      charts: state.charts.map((c) =>
        c.id === chartId ? { ...c, title } : c
      ),
    }));
  },

  updateChartType: (chartId: string, type: ChartType) => {
    set((state) => ({
      charts: state.charts.map((c) =>
        c.id === chartId ? { ...c, type } : c
      ),
    }));
  },

  updateChartXKey: (chartId: string, xKey: string) => {
    set((state) => ({
      charts: state.charts.map((c) =>
        c.id === chartId ? { ...c, xKey } : c
      ),
    }));
  },

  toggleSeriesVisibility: (chartId: string, seriesIndex: number) => {
    set((state) => ({
      charts: state.charts.map((c) => {
        if (c.id !== chartId) return c;
        const series = c.series.map((s, i) =>
          i === seriesIndex ? { ...s, visible: !s.visible } : s
        );
        return { ...c, series };
      }),
    }));
  },

  updateSeriesColor: (chartId: string, seriesIndex: number, color: string) => {
    set((state) => ({
      charts: state.charts.map((c) => {
        if (c.id !== chartId) return c;
        const series = c.series.map((s, i) =>
          i === seriesIndex ? { ...s, color } : s
        );
        return { ...c, series };
      }),
    }));
  },

  updateSeriesLabel: (chartId: string, seriesIndex: number, label: string) => {
    set((state) => ({
      charts: state.charts.map((c) => {
        if (c.id !== chartId) return c;
        const series = c.series.map((s, i) =>
          i === seriesIndex ? { ...s, label } : s
        );
        return { ...c, series };
      }),
    }));
  },

  setGridColumns: (cols: GridColumns) => set({ gridColumns: cols }),
  setShowDataModal: (show: boolean) => set({ showDataModal: show }),
  setEditingChartId: (id: string | null) => set({ editingChartId: id }),

  getMergedData: (chartId: string) => {
    const state = get();
    const chart = state.charts.find((c) => c.id === chartId);
    if (!chart) return [];

    // Only consider datasets that have series in this chart
    const relevantDatasetIds = new Set(chart.series.map((s) => s.datasetId));
    const relevantDatasets = state.datasets.filter((d) => relevantDatasetIds.has(d.id));

    const maxRows = Math.max(
      ...relevantDatasets.map((d) => d.table.rowCount),
      0
    );

    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < maxRows; i++) {
      const row: Record<string, unknown> = {};

      if (chart.xKey === '__rowIndex__') {
        row['__rowIndex__'] = i;
      }

      for (const dataset of relevantDatasets) {
        // X-axis from each dataset
        if (chart.xKey !== '__rowIndex__') {
          const xCol = dataset.table.columns.find((c) => c.key === chart.xKey);
          if (xCol && i < xCol.values.length) {
            row[chart.xKey] = xCol.values[i];
          }
        }

        // Series values
        for (const series of chart.series) {
          if (series.datasetId !== dataset.id) continue;
          const col = dataset.table.columns.find((c) => c.key === series.columnKey);
          if (col && i < col.values.length) {
            row[series.columnKey + '_' + series.datasetId.slice(-6)] = col.values[i];
          }
        }
      }
      rows.push(row);
    }
    return rows;
  },
}));
