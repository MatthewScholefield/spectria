import React from 'react';
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import type { SeriesConfig, ChartValueUnit, AxisScale, AxisBound } from '../../engine/types';
import { ScrollableLegend as LegendContent } from '../ChartCard';
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
    <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis {...xAxisProps} />
      <YAxis {...yAxisProps} />
      <Tooltip content={<CustomTooltip unit={yUnit} />} />
      {series.map((s) => (
        <Bar
          key={`${s.datasetId}-${s.columnKey}`}
          dataKey={seriesKeyMap.get(s)!}
          name={displayLabels.get(s)!}
          fill={s.color}
          radius={[4, 4, 0, 0]}
          {...animProps}
        />
      ))}
      <Legend content={<LegendContent />} />
    </BarChart>
  );
});
