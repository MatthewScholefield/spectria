import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  Dataset,
  ChartConfig,
  ChartType,
  AxisBound,
  AxisScale,
  SeriesConfig,
  StreamSource,
  SourceStatus,
  DataTable,
  DatasetOrigin,
  RelativeMode,
  SeriesIdentity,
  ChartValueUnit,
} from '../engine/types';
import { parseRawData } from '../engine/parser';
import { generateCharts, mergeDatasetIntoCharts, PRIMARY_PALETTE } from '../engine/analyzer';
import { generateId, generateDatasetName } from '../utils/format';

type GridColumns = 1 | 2 | 3;

interface AppState {
  datasets: Dataset[];
  charts: ChartConfig[];
  sources: StreamSource[];
  gridColumns: GridColumns;
  showDataModal: boolean;
  showConnectModal: boolean;
  showConfigDiff: boolean;
  editingChartId: string | null;

  addData: (rawText: string, name?: string) => void;
  addDatasetFromTable: (table: DataTable, origin: DatasetOrigin, sourceId?: string) => string;
  appendRowsToDataset: (datasetId: string, rows: Record<string, unknown>[]) => void;
  removeDataset: (id: string) => void;
  renameDataset: (id: string, name: string) => void;

  addSource: (source: StreamSource) => void;
  updateSourceStatus: (sourceId: string, status: SourceStatus) => void;
  removeSource: (sourceId: string) => void;

  updateChartTitle: (chartId: string, title: string) => void;
  updateChartType: (chartId: string, type: ChartType) => void;
  updateChartXKey: (chartId: string, xKey: string) => void;
  updateChartRelativeMode: (chartId: string, mode: RelativeMode) => void;
  updateChartRelativeBase: (chartId: string, base: SeriesIdentity | null) => void;
  updateChartYUnit: (chartId: string, unit: ChartValueUnit) => void;
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
  setShowConnectModal: (show: boolean) => void;
  setShowConfigDiff: (show: boolean) => void;
  setEditingChartId: (id: string | null) => void;
}

export const useStore = create<AppState>()(immer((set, get) => ({
  datasets: [],
  charts: [],
  sources: [],
  gridColumns: 2,
  showDataModal: false,
  showConnectModal: false,
  showConfigDiff: false,
  editingChartId: null,

  addData: (rawText: string, name?: string) => {
    const table = parseRawData(rawText);
    if (!table) return;
    const state = get();
    const origin: DatasetOrigin = { kind: 'manual', label: name || generateDatasetName(state.datasets.length) };
    get().addDatasetFromTable(table, origin);
    set((state) => { state.showDataModal = false; });
  },

  addDatasetFromTable: (table: DataTable, origin: DatasetOrigin, sourceId?: string): string => {
    const state = get();
    const datasetId = generateId();

    const dataset: Dataset = { id: datasetId, origin, table, sourceId };

    let newCharts: ChartConfig[];
    if (state.datasets.length === 0) {
      newCharts = generateCharts(table, datasetId, 0);
    } else {
      newCharts = mergeDatasetIntoCharts(state.charts, table, datasetId, state.datasets.length);
    }

    set((state) => {
      state.datasets.unshift(dataset);
      state.charts = newCharts;
    });
    return datasetId;
  },

  appendRowsToDataset: (datasetId: string, rows: Record<string, unknown>[]) => {
    set((state) => {
      const dataset = state.datasets.find((d) => d.id === datasetId);
      if (!dataset) return;

      const colMap = new Map(dataset.table.columns.map((c) => [c.key, c]));
      for (const row of rows) {
        for (const [key, value] of Object.entries(row)) {
          if (key.startsWith('_')) continue;
          let col = colMap.get(key);
          if (!col) {
            col = { key, header: key, type: typeof value === 'number' ? 'numeric' as const : 'categorical' as const, values: [] };
            colMap.set(key, col);
          }
          col.values.push(value as string | number | null);
        }
        dataset.table.rowCount++;
      }

      dataset.table.columns = Array.from(colMap.values());

      const hasChartsForDataset = state.charts.some((chart) =>
        chart.series.some((series) => series.datasetId === datasetId)
      );

      if (hasChartsForDataset || dataset.table.rowCount < 2) return;

      const datasetIndex = state.datasets.findIndex((d) => d.id === datasetId);
      const chartDatasetIndex = datasetIndex >= 0 ? datasetIndex : state.datasets.length;
      state.charts = state.charts.length === 0
        ? generateCharts(dataset.table, datasetId, chartDatasetIndex)
        : mergeDatasetIntoCharts(state.charts, dataset.table, datasetId, chartDatasetIndex);
    });
  },

  removeDataset: (id: string) => {
    set((state) => {
      const datasetIndex = state.datasets.findIndex((d) => d.id === id);
      if (datasetIndex !== -1) state.datasets.splice(datasetIndex, 1);

      for (let i = state.charts.length - 1; i >= 0; i--) {
        const chart = state.charts[i];
        if (chart.relativeBase?.datasetId === id) {
          chart.relativeBase = null;
        }
        chart.series = chart.series.filter((s) => s.datasetId !== id);
        if (chart.series.length === 0) {
          state.charts.splice(i, 1);
        }
      }
    });
  },

  renameDataset: (id: string, name: string) => {
    set((state) => {
      const dataset = state.datasets.find((d) => d.id === id);
      if (dataset) dataset.customName = name;
    });
  },

  addSource: (source: StreamSource) => {
    set((state) => { state.sources.push(source); });
  },

  updateSourceStatus: (sourceId: string, status: SourceStatus) => {
    set((state) => {
      const source = state.sources.find((s) => s.id === sourceId);
      if (source) source.status = status;
    });
  },

  removeSource: (sourceId: string) => {
    set((state) => {
      const removedDatasetIds = new Set(
        state.datasets.filter((d) => d.sourceId === sourceId).map((d) => d.id)
      );

      state.datasets = state.datasets.filter((d) => d.sourceId !== sourceId);
      state.sources = state.sources.filter((s) => s.id !== sourceId);

      for (let i = state.charts.length - 1; i >= 0; i--) {
        const chart = state.charts[i];
        if (chart.relativeBase && removedDatasetIds.has(chart.relativeBase.datasetId)) {
          chart.relativeBase = null;
        }
        chart.series = chart.series.filter((s) => !removedDatasetIds.has(s.datasetId));
        if (chart.series.length === 0) {
          state.charts.splice(i, 1);
        }
      }
    });
  },

  updateChartTitle: (chartId: string, title: string) => {
    set((state) => {
      const chart = state.charts.find((c) => c.id === chartId);
      if (chart) chart.title = title;
    });
  },

  updateChartType: (chartId: string, type: ChartType) => {
    set((state) => {
      const chart = state.charts.find((c) => c.id === chartId);
      if (chart) chart.type = type;
    });
  },

  updateChartXKey: (chartId: string, xKey: string) => {
    set((state) => {
      const chart = state.charts.find((c) => c.id === chartId);
      if (chart) chart.xKey = xKey;
    });
  },

  updateChartRelativeMode: (chartId: string, mode: RelativeMode) => {
    set((state) => {
      const chart = state.charts.find((c) => c.id === chartId);
      if (!chart) return;
      chart.relativeMode = mode;
      if (mode === 'percentResidual' && chart.yUnit === 'number') {
        chart.yUnit = 'percentage';
      }
    });
  },

  updateChartRelativeBase: (chartId: string, base: SeriesIdentity | null) => {
    set((state) => {
      const chart = state.charts.find((c) => c.id === chartId);
      if (chart) chart.relativeBase = base;
    });
  },

  updateChartYUnit: (chartId: string, unit: ChartValueUnit) => {
    set((state) => {
      const chart = state.charts.find((c) => c.id === chartId);
      if (chart) chart.yUnit = unit;
    });
  },

  toggleSeriesVisibility: (chartId: string, datasetId: string, columnKey: string) => {
    set((state) => {
      const chart = state.charts.find((c) => c.id === chartId);
      if (!chart) return;
      const series = chart.series.find(
        (s) => s.datasetId === datasetId && s.columnKey === columnKey
      );
      if (series) series.visible = !series.visible;
    });
  },

  updateSeriesColor: (chartId: string, datasetId: string, columnKey: string, color: string) => {
    set((state) => {
      const chart = state.charts.find((c) => c.id === chartId);
      if (!chart) return;
      const series = chart.series.find(
        (s) => s.datasetId === datasetId && s.columnKey === columnKey
      );
      if (series) series.color = color;
    });
  },

  updateSeriesLabel: (chartId: string, datasetId: string, columnKey: string, label: string) => {
    set((state) => {
      const chart = state.charts.find((c) => c.id === chartId);
      if (!chart) return;
      const series = chart.series.find(
        (s) => s.datasetId === datasetId && s.columnKey === columnKey
      );
      if (series) series.customLabel = label || undefined;
    });
  },

  addSeries: (chartId: string, series: SeriesConfig) => {
    set((state) => {
      const chart = state.charts.find((c) => c.id === chartId);
      if (!chart) return;
      const exists = chart.series.some(
        (s) => s.datasetId === series.datasetId && s.columnKey === series.columnKey
      );
      if (!exists) chart.series.push(series);
    });
  },

  removeSeries: (chartId: string, datasetId: string, columnKey: string) => {
    set((state) => {
      for (let i = state.charts.length - 1; i >= 0; i--) {
        const chart = state.charts[i];
        if (chart.id !== chartId) continue;

        if (chart.relativeBase?.datasetId === datasetId && chart.relativeBase.columnKey === columnKey) {
          chart.relativeBase = null;
        }

        chart.series = chart.series.filter(
          (s) => !(s.datasetId === datasetId && s.columnKey === columnKey)
        );

        if (chart.series.length === 0) {
          state.charts.splice(i, 1);
        }
        break;
      }
    });
  },

  deleteChart: (chartId: string) => {
    set((state) => {
      const index = state.charts.findIndex((c) => c.id === chartId);
      if (index !== -1) state.charts.splice(index, 1);
    });
  },

  createChart: (config?: Partial<ChartConfig>) => {
    const id = generateId();
    const chart: ChartConfig = {
      id,
      title: config?.title ?? 'New Chart',
      type: config?.type ?? 'line',
      xKey: config?.xKey ?? '__rowIndex__',
      series: config?.series ?? [],
      relativeMode: config?.relativeMode ?? 'none',
      relativeBase: config?.relativeBase ?? null,
      yUnit: config?.yUnit ?? 'number',
      yAxisMin: config?.yAxisMin ?? 'auto',
      yAxisMax: config?.yAxisMax ?? 'auto',
      xAxisMin: config?.xAxisMin ?? 'auto',
      xAxisMax: config?.xAxisMax ?? 'auto',
      yScale: config?.yScale ?? 'linear',
      xScale: config?.xScale ?? 'linear',
    };
    set((state) => { state.charts.push(chart); });
    return id;
  },

  getNextSeriesColor: (chartId: string) => {
    const chart = get().charts.find((c) => c.id === chartId);
    const usedColors = new Set(chart?.series.map((s) => s.color) ?? []);
    const available = PRIMARY_PALETTE.find((c) => !usedColors.has(c));
    return available ?? PRIMARY_PALETTE[0];
  },

  updateAxisBound: (chartId: string, key: 'yAxisMin' | 'yAxisMax' | 'xAxisMin' | 'xAxisMax', value: AxisBound) => {
    set((state) => {
      const chart = state.charts.find((c) => c.id === chartId);
      if (chart) chart[key] = value;
    });
  },

  updateAxisScale: (chartId: string, key: 'yScale' | 'xScale', value: AxisScale) => {
    set((state) => {
      const chart = state.charts.find((c) => c.id === chartId);
      if (chart) chart[key] = value;
    });
  },

  setGridColumns: (cols: GridColumns) => set((state) => { state.gridColumns = cols; }),
  setShowDataModal: (show: boolean) => set((state) => { state.showDataModal = show; }),
  setShowConnectModal: (show: boolean) => set((state) => { state.showConnectModal = show; }),
  setShowConfigDiff: (show: boolean) => set((state) => { state.showConfigDiff = show; }),
  setEditingChartId: (id: string | null) => set((state) => { state.editingChartId = id; }),
})));
