import React from 'react';
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import type { SeriesConfig, ChartValueUnit, AxisScale, AxisBound } from '../../engine/types';
import { CustomTooltip } from '../ChartCard';
import { createYAxisConfig } from '../../utils/format';

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

export const BarChartView = React.memo(function BarChartView({
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
  isLive,
  highlightedDataKeys,
}: ChartViewProps) {
  const animProps = isLive ? { isAnimationActive: false } : {};
  const xAxisProps = {
    dataKey: xKey,
    tick: { fontSize: 11 },
    tickLine: false,
    axisLine: false,
    ...(xScale !== 'linear' ? { scale: xScale } : {}),
    ...(xDomain ? { type: 'number' as const, domain: xDomain, allowDataOverflow: true } : {}),
  };
  const { ticks: yTicks, tickFormatter } = React.useMemo(() => createYAxisConfig(yDomain), [yDomain]);
  const effectiveYScale = relativeMode === 'none' ? yScale : 'linear';
  const yAxisProps = {
    tick: { fontSize: 11 },
    tickLine: false,
    axisLine: false,
    width: 50,
    domain: yDomain,
    allowDataOverflow: true,
    ticks: yTicks,
    tickFormatter,
    ...(effectiveYScale !== 'linear' ? { scale: effectiveYScale } : {}),
  };

  return (
    <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis {...xAxisProps} />
      <YAxis {...yAxisProps} />
      <Tooltip content={<CustomTooltip unit={yUnit} />} />
      {series.map((s) => {
        const dataKey = seriesKeyMap.get(s)!;
        const isHighlighted = highlightedDataKeys === null || highlightedDataKeys.has(dataKey);
        return (
          <Bar
            key={`${s.datasetId}-${s.columnKey}`}
            dataKey={dataKey}
            name={displayLabels.get(s)!}
            fill={s.color}
            fillOpacity={isHighlighted ? 1 : 0.1}
            radius={[4, 4, 0, 0]}
            {...animProps}
          />
        );
      })}
    </BarChart>
  );
});
