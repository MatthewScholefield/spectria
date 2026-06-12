import React from 'react';
import {
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import type { SeriesConfig, ChartValueUnit, AxisScale, AxisBound } from '../../engine/types';
import { CustomTooltip } from '../ChartCard';

interface ChartViewProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: SeriesConfig[];
  seriesKeyMap: Map<SeriesConfig, string>;
  displayLabels: Map<SeriesConfig, string>;
  xDomain: [number, number] | undefined;
  yDomain: [number, number];
  yUnit: ChartValueUnit;
  xScale: AxisScale;
  yScale: AxisScale;
  relativeMode: string;
  isLive: boolean;
  xAxisMin: AxisBound;
  xAxisMax: AxisBound;
  highlightedDataKeys: Set<string> | null;
}

export const ScatterChartView = React.memo(function ScatterChartView({
  data,
  xKey,
  series,
  seriesKeyMap,
  displayLabels,
  xDomain,
  yDomain,
  yUnit,
  xScale,
  yScale,
  relativeMode,
  highlightedDataKeys,
}: ChartViewProps) {
  const xAxisProps = {
    dataKey: xKey,
    tick: { fontSize: 11 },
    tickLine: false,
    axisLine: false,
    ...(xScale !== 'linear' ? { scale: xScale } : {}),
    ...(xDomain ? { type: 'number' as const, domain: xDomain, allowDataOverflow: true } : {}),
  };
  const effectiveYScale = relativeMode === 'none' ? yScale : 'linear';
  const yAxisProps = {
    tick: { fontSize: 11 },
    tickLine: false,
    axisLine: false,
    width: 50,
    domain: yDomain,
    allowDataOverflow: true,
    ...(effectiveYScale !== 'linear' ? { scale: effectiveYScale } : {}),
  };

  return (
    <ScatterChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis {...xAxisProps} name={xKey} />
      <YAxis {...yAxisProps} />
      <Tooltip content={<CustomTooltip unit={yUnit} />} />
      {series.map((s) => {
        const dataKey = seriesKeyMap.get(s)!;
        const isHighlighted = highlightedDataKeys === null || highlightedDataKeys.has(dataKey);
        return (
          <Scatter
            key={`${s.datasetId}-${s.columnKey}`}
            name={displayLabels.get(s)!}
            data={data.map((row) => ({
              [xKey]: row[xKey],
              [dataKey]: row[dataKey],
            }))}
            fill={s.color}
            fillOpacity={isHighlighted ? 1 : 0.1}
            strokeOpacity={isHighlighted ? 1 : 0.1}
          />
        );
      })}
    </ScatterChart>
  );
});
