import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';
import { getCachedMergedData } from '../store/mergedDataCache';
import { downsampleData } from '../engine/downsample';
import { getDisplayLabel } from '../engine/labels';
import { computeDisplayNames } from '../utils/format';
import type { ChartConfig, SeriesConfig, AxisBound } from '../engine/types';

function getSeriesKey(series: { columnKey: string; datasetId: string }): string {
  return series.columnKey + '_' + series.datasetId.slice(-6);
}

export interface ChartDataResult {
  data: Record<string, unknown>[];
  sampledData: Record<string, unknown>[];
  isLive: boolean;
  visibleSeries: SeriesConfig[];
  seriesKeyMap: Map<SeriesConfig, string>;
  displayLabels: Map<SeriesConfig, string>;
  visibleDataKeys: string[];
  xDomain: [number, number] | undefined;
  yDomain: [number, number];
  effectiveXAxisMin: AxisBound;
  effectiveXAxisMax: AxisBound;
}

export function useChartData(chart: ChartConfig): ChartDataResult {
  const chartId = chart.id;
  const globalAxisFilters = useStore((s) => s.globalAxisFilters);

  const effectiveXAxisMin = chart.xAxisMin !== 'auto' ? chart.xAxisMin : (globalAxisFilters[chart.xKey]?.min ?? 'auto');
  const effectiveXAxisMax = chart.xAxisMax !== 'auto' ? chart.xAxisMax : (globalAxisFilters[chart.xKey]?.max ?? 'auto');

  const relevantDatasetIds = useMemo(
    () => new Set(chart.series.map((s) => s.datasetId)),
    [chart.series],
  );

  const datasets = useStore(
    useShallow(useCallback((s) => s.datasets.filter((d) => relevantDatasetIds.has(d.id)), [relevantDatasetIds])),
  );

  const relevantSourceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const ds of datasets) {
      if (ds.sourceId) ids.add(ds.sourceId);
    }
    return ids;
  }, [datasets]);

  const sources = useStore(
    useShallow(useCallback((s) => s.sources.filter((src) => relevantSourceIds.has(src.id)), [relevantSourceIds])),
  );

  const data = useMemo(
    () => getCachedMergedData(chartId, chart, datasets),
    [chartId, chart, datasets],
  );

  const isLive = useMemo(() =>
    chart.series.some((s) => {
      const ds = datasets.find((d) => d.id === s.datasetId);
      if (!ds?.sourceId) return false;
      const source = sources.find((src) => src.id === ds.sourceId);
      return source?.status === 'live' || source?.status === 'connecting';
    }),
    [chart.series, datasets, sources],
  );

  const visibleSeries = useMemo(
    () => chart.series.filter((s) => s.visible),
    [chart.series],
  );

  const seriesKeyMap = useMemo(
    () => new Map(chart.series.map((s) => [s, getSeriesKey(s)])),
    [chart.series],
  );

  const displayLabels = useMemo(() => {
    const { displayNames: datasetDisplayNames } = computeDisplayNames(datasets);
    return new Map(
      chart.series.map((s) => [s, getDisplayLabel(chart.series, s, datasets, datasetDisplayNames)]),
    );
  }, [chart.series, datasets]);

  const visibleDataKeys = useMemo(
    () => visibleSeries.map((s) => seriesKeyMap.get(s)!),
    [visibleSeries, seriesKeyMap],
  );

  const sampledData = useMemo(() => {
    if (chart.type === 'bar' || data.length <= 2000) return data;
    return downsampleData(data, 2000, visibleDataKeys);
  }, [chart.type, data, visibleDataKeys]);

  const xDomain = useMemo((): [number, number] | undefined => {
    if (effectiveXAxisMin === 'auto' && effectiveXAxisMax === 'auto') return undefined;
    let constrainedMin = Infinity;
    let constrainedMax = -Infinity;
    for (const row of data) {
      const val = row[chart.xKey];
      if (typeof val !== 'number' || !isFinite(val)) continue;
      if (effectiveXAxisMin !== 'auto' && val < effectiveXAxisMin) continue;
      if (effectiveXAxisMax !== 'auto' && val > effectiveXAxisMax) continue;
      if (val < constrainedMin) constrainedMin = val;
      if (val > constrainedMax) constrainedMax = val;
    }
    if (constrainedMin === Infinity) return [0, 1];
    const range = constrainedMax - constrainedMin || Math.abs(constrainedMax) || 1;
    const autoMin = constrainedMin - 0.1 * range;
    const autoMax = constrainedMax + 0.1 * range;
    return [
      effectiveXAxisMin === 'auto' ? autoMin : effectiveXAxisMin,
      effectiveXAxisMax === 'auto' ? autoMax : effectiveXAxisMax,
    ];
  }, [data, chart.xKey, effectiveXAxisMin, effectiveXAxisMax]);

  const yDomain = useMemo((): [number, number] => {
    if (chart.yAxisMin !== 'auto' && chart.yAxisMax !== 'auto') {
      return [chart.yAxisMin, chart.yAxisMax];
    }
    const xLowerBound = effectiveXAxisMin === 'auto' ? -Infinity : effectiveXAxisMin;
    const xUpperBound = effectiveXAxisMax === 'auto' ? Infinity : effectiveXAxisMax;
    let min = Infinity;
    let max = -Infinity;
    for (const row of data) {
      const xVal = row[chart.xKey];
      if (typeof xVal !== 'number' || !isFinite(xVal)) continue;
      if (xVal < xLowerBound || xVal > xUpperBound) continue;
      for (const key of visibleDataKeys) {
        const val = row[key];
        if (typeof val === 'number' && isFinite(val)) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }
    }
    if (min === Infinity) return [0, 1];
    const range = max - min || Math.abs(max) || 1;
    const autoMin = min - 0.05 * range;
    const autoMax = max + 0.05 * range;
    return [
      chart.yAxisMin === 'auto' ? autoMin : chart.yAxisMin,
      chart.yAxisMax === 'auto' ? autoMax : chart.yAxisMax,
    ];
  }, [data, chart.xKey, effectiveXAxisMin, effectiveXAxisMax, chart.yAxisMin, chart.yAxisMax, visibleDataKeys]);

  return {
    data,
    sampledData,
    isLive,
    visibleSeries,
    seriesKeyMap,
    displayLabels,
    visibleDataKeys,
    xDomain,
    yDomain,
    effectiveXAxisMin,
    effectiveXAxisMax,
  };
}
