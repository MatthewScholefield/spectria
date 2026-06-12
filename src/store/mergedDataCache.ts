import type { ChartConfig, Dataset, SeriesIdentity } from '../engine/types';

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

function getEffectiveRelativeBase(chart: ChartConfig) {
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

function computeDepsHash(chart: ChartConfig, datasets: Dataset[]): string {
  const parts: string[] = [
    chart.xKey,
    chart.relativeMode,
    chart.relativeBase?.datasetId ?? '',
    chart.relativeBase?.columnKey ?? '',
  ];
  for (const s of chart.series) {
    parts.push(`${s.datasetId}|${s.columnKey}|${s.visible}`);
  }
  const relevantIds = new Set(chart.series.map((s) => s.datasetId));
  for (const ds of datasets) {
    if (!relevantIds.has(ds.id)) continue;
    parts.push(ds.id);
    parts.push(String(ds.table.rowCount));
    const seriesCols = new Set(chart.series.filter((s) => s.datasetId === ds.id).map((s) => s.columnKey));
    for (const col of ds.table.columns) {
      if (!seriesCols.has(col.key)) continue;
      parts.push(col.key);
      parts.push(String(col.values.length));
    }
  }
  return parts.join('\0');
}

interface CacheEntry {
  deps: string;
  data: Row[];
}

const cache = new Map<string, CacheEntry>();

export function getCachedMergedData(chartId: string, chart: ChartConfig, datasets: Dataset[]): Row[] {
  const deps = computeDepsHash(chart, datasets);
  const entry = cache.get(chartId);
  if (entry && entry.deps === deps) return entry.data;

  const data = computeMergedData(chart, datasets);
  cache.set(chartId, { deps, data });
  return data;
}

export function invalidateMergedData(chartId?: string): void {
  if (chartId) {
    cache.delete(chartId);
  } else {
    cache.clear();
  }
}

function computeMergedData(chart: ChartConfig, datasets: Dataset[]): Row[] {
  const relevantDatasetIds = new Set(chart.series.map((s) => s.datasetId));
  const relevantDatasets = datasets.filter((d) => relevantDatasetIds.has(d.id));

  if (chart.xKey === '__rowIndex__') {
    const maxRows = Math.max(...relevantDatasets.map((d) => d.table.rowCount), 0);
    const rows: Row[] = [];
    for (let i = 0; i < maxRows; i++) {
      const row: Row = { '__rowIndex__': i };
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

  const rows: Row[] = [];
  for (const xValue of sortedXValues) {
    const row: Row = { [chart.xKey]: xValue };
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
}
