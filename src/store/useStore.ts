import { create } from 'zustand';
import type { Dataset, ChartConfig, ChartType, AxisBound, AxisScale, SeriesConfig } from '../engine/types';
import { parseRawData } from '../engine/parser';
import { generateCharts, mergeDatasetIntoCharts, PRIMARY_PALETTE } from '../engine/analyzer';
import { generateId, generateDatasetName } from '../utils/format';

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
  toggleSeriesVisibility: (chartId: string, datasetId: string, columnKey: string) => void;
  updateSeriesColor: (chartId: string, datasetId: string, columnKey: string, color: string) => void;
  updateSeriesLabel: (chartId: string, datasetId: string, columnKey: string, label: string) => void;
  addSeries: (chartId: string, series: SeriesConfig) => void;
  removeSeries: (chartId: string, datasetId: string, columnKey: string) => void;
  deleteChart: (chartId: string) => void;
  createChart: (config?: Partial<ChartConfig>) => string;
  getNextSeriesColor: (chartId: string) => string;
  updateAxisBound: (chartId: string, key: 'yAxisMin' | 'yAxisMax' | 'xAxisMin' | 'xAxisMax', value: AxisBound) => void;
  updateAxisScale: (chartId: string, key: 'yScale' | 'xScale', value: AxisScale) => void;

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
    const datasetName = name || generateDatasetName(state.datasets.length);

    const dataset: Dataset = { id: datasetId, name: datasetName, table };

    let newCharts: ChartConfig[];
    if (state.datasets.length === 0) {
      newCharts = generateCharts(table, datasetId, 0);
    } else {
      newCharts = mergeDatasetIntoCharts(state.charts, table, datasetId, state.datasets.length);
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

  toggleSeriesVisibility: (chartId: string, datasetId: string, columnKey: string) => {
    set((state) => ({
      charts: state.charts.map((c) => {
        if (c.id !== chartId) return c;
        const series = c.series.map((s) =>
          s.datasetId === datasetId && s.columnKey === columnKey
            ? { ...s, visible: !s.visible } : s
        );
        return { ...c, series };
      }),
    }));
  },

  updateSeriesColor: (chartId: string, datasetId: string, columnKey: string, color: string) => {
    set((state) => ({
      charts: state.charts.map((c) => {
        if (c.id !== chartId) return c;
        const series = c.series.map((s) =>
          s.datasetId === datasetId && s.columnKey === columnKey
            ? { ...s, color } : s
        );
        return { ...c, series };
      }),
    }));
  },

  updateSeriesLabel: (chartId: string, datasetId: string, columnKey: string, label: string) => {
    set((state) => ({
      charts: state.charts.map((c) => {
        if (c.id !== chartId) return c;
        const series = c.series.map((s) =>
          s.datasetId === datasetId && s.columnKey === columnKey
            ? { ...s, customLabel: label || undefined } : s
        );
        return { ...c, series };
      }),
    }));
  },

  addSeries: (chartId: string, series: SeriesConfig) => {
    set((state) => ({
      charts: state.charts.map((c) => {
        if (c.id !== chartId) return c;
        const exists = c.series.some(
          (s) => s.datasetId === series.datasetId && s.columnKey === series.columnKey
        );
        if (exists) return c;
        return { ...c, series: [...c.series, series] };
      }),
    }));
  },

  removeSeries: (chartId: string, datasetId: string, columnKey: string) => {
    set((state) => {
      const updated = state.charts.map((c) => {
        if (c.id !== chartId) return c;
        return {
          ...c,
          series: c.series.filter(
            (s) => !(s.datasetId === datasetId && s.columnKey === columnKey)
          ),
        };
      }).filter((c) => c.series.length > 0);
      return { charts: updated };
    });
  },

  deleteChart: (chartId: string) => {
    set((state) => ({
      charts: state.charts.filter((c) => c.id !== chartId),
    }));
  },

  createChart: (config?: Partial<ChartConfig>) => {
    const id = generateId();
    const chart: ChartConfig = {
      id,
      title: config?.title ?? 'New Chart',
      type: config?.type ?? 'line',
      xKey: config?.xKey ?? '__rowIndex__',
      series: config?.series ?? [],
      yAxisMin: config?.yAxisMin ?? 'auto',
      yAxisMax: config?.yAxisMax ?? 'auto',
      xAxisMin: config?.xAxisMin ?? 'auto',
      xAxisMax: config?.xAxisMax ?? 'auto',
      yScale: config?.yScale ?? 'linear',
      xScale: config?.xScale ?? 'linear',
    };
    set((state) => ({ charts: [...state.charts, chart] }));
    return id;
  },

  getNextSeriesColor: (chartId: string) => {
    const chart = get().charts.find((c) => c.id === chartId);
    const usedColors = new Set(chart?.series.map((s) => s.color) ?? []);
    const available = PRIMARY_PALETTE.find((c) => !usedColors.has(c));
    return available ?? PRIMARY_PALETTE[0];
  },

  updateAxisBound: (chartId: string, key: 'yAxisMin' | 'yAxisMax' | 'xAxisMin' | 'xAxisMax', value: AxisBound) => {
    set((state) => ({
      charts: state.charts.map((c) =>
        c.id === chartId ? { ...c, [key]: value } : c
      ),
    }));
  },

  updateAxisScale: (chartId: string, key: 'yScale' | 'xScale', value: AxisScale) => {
    set((state) => ({
      charts: state.charts.map((c) =>
        c.id === chartId ? { ...c, [key]: value } : c
      ),
    }));
  },

  setGridColumns: (cols: GridColumns) => set({ gridColumns: cols }),
  setShowDataModal: (show: boolean) => set({ showDataModal: show }),
  setEditingChartId: (id: string | null) => set({ editingChartId: id }),

  getMergedData: (chartId: string) => {
    const state = get();
    const chart = state.charts.find((c) => c.id === chartId);
    if (!chart) return [];

    const relevantDatasetIds = new Set(chart.series.map((s) => s.datasetId));
    const relevantDatasets = state.datasets.filter((d) => relevantDatasetIds.has(d.id));

    if (chart.xKey === '__rowIndex__') {
      // No real X-axis column — merge by position
      const maxRows = Math.max(...relevantDatasets.map((d) => d.table.rowCount), 0);
      const rows: Record<string, unknown>[] = [];
      for (let i = 0; i < maxRows; i++) {
        const row: Record<string, unknown> = { '__rowIndex__': i };
        for (const dataset of relevantDatasets) {
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
    }

    // Join on X-axis value across datasets
    const datasetXMaps = new Map<string, Map<string | number, number>>();
    const allXValues = new Set<string | number>();

    for (const dataset of relevantDatasets) {
      const xCol = dataset.table.columns.find((c) => c.key === chart.xKey);
      if (!xCol) continue;
      const xMap = new Map<string | number, number>();
      for (let i = 0; i < xCol.values.length; i++) {
        const val = xCol.values[i] as string | number;
        xMap.set(val, i);
        allXValues.add(val);
      }
      datasetXMaps.set(dataset.id, xMap);
    }

    const sortedXValues = Array.from(allXValues).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return String(a).localeCompare(String(b));
    });

    const rows: Record<string, unknown>[] = [];
    for (const xValue of sortedXValues) {
      const row: Record<string, unknown> = { [chart.xKey]: xValue };
      for (const dataset of relevantDatasets) {
        const xMap = datasetXMaps.get(dataset.id);
        if (!xMap) continue;
        const rowIndex = xMap.get(xValue as string | number);
        if (rowIndex === undefined) continue;
        for (const series of chart.series) {
          if (series.datasetId !== dataset.id) continue;
          const col = dataset.table.columns.find((c) => c.key === series.columnKey);
          if (col && rowIndex < col.values.length) {
            row[series.columnKey + '_' + series.datasetId.slice(-6)] = col.values[rowIndex];
          }
        }
      }
      rows.push(row);
    }
    return rows;
  },
}));
