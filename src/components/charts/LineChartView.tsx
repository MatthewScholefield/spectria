import React from 'react';
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import type { SeriesConfig, ChartValueUnit, AxisScale, AxisBound } from '../../engine/types';
import { CustomTooltip } from '../ChartCard';
import { createTickFormatter } from '../../utils/format';

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

export const LineChartView = React.memo(function LineChartView({
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
  const tickFormatter = React.useMemo(() => createTickFormatter(yDomain), [yDomain]);
  const effectiveYScale = relativeMode === 'none' ? yScale : 'linear';
  const yAxisProps = {
    tick: { fontSize: 11 },
    tickLine: false,
    axisLine: false,
    width: 50,
    domain: yDomain,
    allowDataOverflow: true,
    tickFormatter,
    ...(effectiveYScale !== 'linear' ? { scale: effectiveYScale } : {}),
  };

  return (
    <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis {...xAxisProps} />
      <YAxis {...yAxisProps} />
      <Tooltip content={<CustomTooltip unit={yUnit} />} />
      {series.map((s) => {
        const dataKey = seriesKeyMap.get(s)!;
        const isHighlighted = highlightedDataKeys === null || highlightedDataKeys.has(dataKey);
        return (
          <Line
            key={`${s.datasetId}-${s.columnKey}`}
            type="monotone"
            dataKey={dataKey}
            name={displayLabels.get(s)!}
            stroke={s.color}
            strokeWidth={isHighlighted ? 2 : 1}
            strokeOpacity={isHighlighted ? 1 : 0.1}
            dot={false}
            activeDot={isHighlighted ? { r: 4, strokeWidth: 0 } : false}
            {...animProps}
          />
        );
      })}
    </LineChart>
  );
});
