import { create } from 'zustand';
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
type Row = Record<string, unknown>;

function getSeriesKey(series: SeriesIdentity): string {
  return series.columnKey + '_' + series.datasetId.slice(-6);
}

function sameSeries(a: SeriesIdentity | null | undefined, b: SeriesIdentity): boolean {
  return a?.datasetId === b.datasetId && a.columnKey === b.columnKey;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value);
}

function getEffectiveRelativeBase(chart: ChartConfig): SeriesConfig | null {
  return chart.series.find((series) => sameSeries(chart.relativeBase, series))
    ?? chart.series[0]
    ?? null;
}

function applyRelativeTransform(chart: ChartConfig, rows: Row[]): Row[] {
  if (chart.relativeMode === 'none') return rows;

  const base = getEffectiveRelativeBase(chart);
  if (!base) return rows;

  const visibleSeries = chart.series.filter((series) => series.visible);
  if (visibleSeries.length === 0) return rows;

  const baseKey = getSeriesKey(base);
  const transformedRows: Row[] = [];

  for (const row of rows) {
    const baseValue = row[baseKey];
    if (!isFiniteNumber(baseValue)) continue;
    if (chart.relativeMode === 'percentResidual' && baseValue === 0) continue;

    const nextRow: Row = { [chart.xKey]: row[chart.xKey] };
    for (const series of chart.series) {
      const key = getSeriesKey(series);
      const value = row[key];
      if (!isFiniteNumber(value)) continue;
      nextRow[key] = chart.relativeMode === 'percentResidual'
        ? ((value - baseValue) / baseValue) * 100
        : value - baseValue;
    }
    transformedRows.push(nextRow);
  }

  return transformedRows;
}

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

  getMergedData: (chartId: string) => Record<string, unknown>[];
}

export const useStore = create<AppState>((set, get) => ({
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
    set({ showDataModal: false });
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

    set({
      datasets: [dataset, ...state.datasets],
      charts: newCharts,
    });
    return datasetId;
  },

  appendRowsToDataset: (datasetId: string, rows: Record<string, unknown>[]) => {
    set((state) => {
      const datasets = state.datasets.map((d) => {
        if (d.id !== datasetId) return d;

        const colMap = new Map(d.table.columns.map((c) => [c.key, c]));
        let newRowCount = d.table.rowCount;

        for (const row of rows) {
          for (const [key, value] of Object.entries(row)) {
            if (key.startsWith('_')) continue;
            let col = colMap.get(key);
            if (!col) {
              const inferredType = typeof value === 'number' ? 'numeric' as const : 'categorical' as const;
              col = { key, header: key, type: inferredType, values: [] };
              colMap.set(key, col);
            }
            col.values.push(value as string | number | null);
          }
          newRowCount++;
        }

        return {
          ...d,
          table: {
            columns: Array.from(colMap.values()),
            rowCount: newRowCount,
            indexColumnKey: d.table.indexColumnKey,
          },
        };
      });

      const updatedDataset = datasets.find((d) => d.id === datasetId);
      if (!updatedDataset) return { datasets };

      const datasetIndex = datasets.findIndex((d) => d.id === datasetId);
      const hasChartsForDataset = state.charts.some((chart) =>
        chart.series.some((series) => series.datasetId === datasetId)
      );

      if (hasChartsForDataset || updatedDataset.table.rowCount < 2) {
        return { datasets };
      }

      const chartDatasetIndex = datasetIndex >= 0 ? datasetIndex : state.datasets.length;
      const charts = state.charts.length === 0
        ? generateCharts(updatedDataset.table, datasetId, chartDatasetIndex)
        : mergeDatasetIntoCharts(state.charts, updatedDataset.table, datasetId, chartDatasetIndex);

      return { datasets, charts };
    });
  },

  removeDataset: (id: string) => {
    set((state) => {
      const datasets = state.datasets.filter((d) => d.id !== id);
      const charts = state.charts
        .map((chart) => ({
          ...chart,
          relativeBase: chart.relativeBase?.datasetId === id ? null : chart.relativeBase,
          series: chart.series.filter((s) => s.datasetId !== id),
        }))
        .filter((chart) => chart.series.length > 0);
      return { datasets, charts };
    });
  },

  renameDataset: (id: string, name: string) => {
    set((state) => ({
      datasets: state.datasets.map((d) =>
        d.id === id ? { ...d, customName: name } : d
      ),
    }));
  },

  addSource: (source: StreamSource) => {
    set((state) => ({ sources: [...state.sources, source] }));
  },

  updateSourceStatus: (sourceId: string, status: SourceStatus) => {
    set((state) => ({
      sources: state.sources.map((s) =>
        s.id === sourceId ? { ...s, status } : s
      ),
    }));
  },

  removeSource: (sourceId: string) => {
    set((state) => {
      const datasets = state.datasets.filter((d) => d.sourceId !== sourceId);
      const removedDatasetIds = new Set(
        state.datasets.filter((d) => d.sourceId === sourceId).map((d) => d.id)
      );
      const charts = state.charts
        .map((chart) => ({
          ...chart,
          relativeBase: chart.relativeBase && removedDatasetIds.has(chart.relativeBase.datasetId)
            ? null
            : chart.relativeBase,
          series: chart.series.filter((s) => !removedDatasetIds.has(s.datasetId)),
        }))
        .filter((chart) => chart.series.length > 0);
      return {
        sources: state.sources.filter((s) => s.id !== sourceId),
        datasets,
        charts,
      };
    });
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

  updateChartRelativeMode: (chartId: string, mode: RelativeMode) => {
    set((state) => ({
      charts: state.charts.map((c) => {
        if (c.id !== chartId) return c;
        const next: ChartConfig = {
          ...c,
          relativeMode: mode,
        };
        if (mode === 'percentResidual' && next.yUnit === 'number') {
          next.yUnit = 'percentage';
        }
        return next;
      }),
    }));
  },

  updateChartRelativeBase: (chartId: string, base: SeriesIdentity | null) => {
    set((state) => ({
      charts: state.charts.map((c) =>
        c.id === chartId ? { ...c, relativeBase: base } : c
      ),
    }));
  },

  updateChartYUnit: (chartId: string, unit: ChartValueUnit) => {
    set((state) => ({
      charts: state.charts.map((c) =>
        c.id === chartId ? { ...c, yUnit: unit } : c
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
        const removedBase =
          c.relativeBase?.datasetId === datasetId && c.relativeBase.columnKey === columnKey;
        return {
          ...c,
          relativeBase: removedBase ? null : c.relativeBase,
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
  setShowConnectModal: (show: boolean) => set({ showConnectModal: show }),
  setShowConfigDiff: (show: boolean) => set({ showConfigDiff: show }),
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
              row[getSeriesKey(series)] = col.values[i];
            }
          }
        }
        rows.push(row);
      }
      return applyRelativeTransform(chart, rows);
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
            row[getSeriesKey(series)] = col.values[rowIndex];
          }
        }
      }
      rows.push(row);
    }
    return applyRelativeTransform(chart, rows);
  },
}));
