import type { SeriesConfig, Dataset } from './types';

export function computeDefaultLabel(
  allSeries: SeriesConfig[],
  series: SeriesConfig,
  datasets: Dataset[],
): string {
  const datasetIds = new Set(allSeries.map((s) => s.datasetId));
  const columnKeys = new Set(allSeries.map((s) => s.columnKey));

  const datasetName = datasets.find((d) => d.id === series.datasetId)?.name ?? '';
  const columnName = series.columnKey;

  if (columnKeys.size === 1) return datasetName;
  if (datasetIds.size === 1) return columnName;
  return `${datasetName} · ${columnName}`;
}

export function getDisplayLabel(
  allSeries: SeriesConfig[],
  series: SeriesConfig,
  datasets: Dataset[],
): string {
  return series.customLabel ?? computeDefaultLabel(allSeries, series, datasets);
}
