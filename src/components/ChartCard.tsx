import { useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { Settings, ChevronUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ChartControls } from './ChartControls';
import type { ChartConfig as ChartConfigType } from '../engine/types';

function renderLegend(value: string, entry: { color?: string }) {
  return (
    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginRight: 12 }}>
      <span style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: entry.color,
        marginRight: 6,
        verticalAlign: 'middle',
      }} />
      {value}
    </span>
  );
}
import { formatChartValue } from '../utils/format';
import { downsampleData } from '../engine/downsample';
import { getDisplayLabel } from '../engine/labels';
import { computeDisplayNames } from '../utils/format';

function CustomTooltip({ active, payload, label, unit }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string | number;
  unit: ChartConfigType['yUnit'];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a3a]/95 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      {label !== undefined && (
        <p className="text-[11px] text-white/40 mb-1.5">{label}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-white/60 truncate max-w-[180px]">{entry.name}</span>
          <span className="text-white/90 font-medium ml-auto pl-3">
            {typeof entry.value === 'number' ? formatChartValue(entry.value, unit) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({ chart, index }: { chart: ChartConfigType; index: number }) {
  const [showControls, setShowControls] = useState(false);
  const datasets = useStore((s) => s.datasets);
  const sources = useStore((s) => s.sources);
  const getMergedData = useStore((s) => s.getMergedData);
  const data = getMergedData(chart.id);

  const isLive = chart.series.some((s) => {
    const ds = datasets.find((d) => d.id === s.datasetId);
    if (!ds?.sourceId) return false;
    const source = sources.find((src) => src.id === ds.sourceId);
    return source?.status === 'live' || source?.status === 'connecting';
  });

  const visibleSeries = chart.series.filter((s) => s.visible);

  // Build lookup from series object to its data key
  const seriesKeyMap = new Map(
    chart.series.map((s) => [s, s.columnKey + '_' + s.datasetId.slice(-6)])
  );

  const { displayNames: datasetDisplayNames } = computeDisplayNames(datasets);

  const displayLabels = new Map(
    chart.series.map((s) => [s, getDisplayLabel(chart.series, s, datasets, datasetDisplayNames)])
  );

  const visibleDataKeys = visibleSeries.map((s) => seriesKeyMap.get(s)!);

  const sampledData = (() => {
    if (chart.type === 'bar' || data.length <= 2000) return data;
    return downsampleData(data, 2000, visibleDataKeys);
  })();

  const xDomain = ((): [number, number] | undefined => {
    if (chart.xAxisMin === 'auto' && chart.xAxisMax === 'auto') return undefined;
    let constrainedMin = Infinity;
    let constrainedMax = -Infinity;
    for (const row of data) {
      const val = row[chart.xKey];
      if (typeof val !== 'number' || !isFinite(val)) continue;

      if (chart.xAxisMin !== 'auto' && val < chart.xAxisMin) continue;
      if (chart.xAxisMax !== 'auto' && val > chart.xAxisMax) continue;

      if (val < constrainedMin) constrainedMin = val;
      if (val > constrainedMax) constrainedMax = val;
    }
    if (constrainedMin === Infinity) return [0, 1];
    const range = constrainedMax - constrainedMin || Math.abs(constrainedMax) || 1;
    const autoMin = constrainedMin - 0.1 * range;
    const autoMax = constrainedMax + 0.1 * range;
    return [
      chart.xAxisMin === 'auto' ? autoMin : chart.xAxisMin,
      chart.xAxisMax === 'auto' ? autoMax : chart.xAxisMax,
    ];
  })();

  const yDomain = ((): [number, number] => {
    if (chart.yAxisMin !== 'auto' && chart.yAxisMax !== 'auto') {
      return [chart.yAxisMin, chart.yAxisMax];
    }

    const xLowerBound = chart.xAxisMin === 'auto' ? -Infinity : chart.xAxisMin;
    const xUpperBound = chart.xAxisMax === 'auto' ? Infinity : chart.xAxisMax;

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
  })();

  const renderChart = () => {
    const commonProps = {
      data: sampledData,
      margin: { top: 8, right: 8, left: 0, bottom: 0 },
    };
    const animProps = isLive ? { isAnimationActive: false } : {};

    const xKey = chart.xKey;
    const xAxisProps = { dataKey: xKey, tick: { fontSize: 11 }, tickLine: false, axisLine: false, ...(chart.xScale !== 'linear' ? { scale: chart.xScale } : {}), ...(xDomain ? { type: 'number' as const, domain: xDomain, allowDataOverflow: true } : {}) };
    const effectiveYScale = chart.relativeMode === 'none' ? chart.yScale : 'linear';
    const yAxisProps = {
      tick: { fontSize: 11 },
      tickLine: false,
      axisLine: false,
      width: 50,
      tickFormatter: (value: number) => formatChartValue(value, chart.yUnit),
      domain: yDomain,
      allowDataOverflow: true,
      ...(effectiveYScale !== 'linear' ? { scale: effectiveYScale } : {}),
    };

    switch (chart.type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip unit={chart.yUnit} />} />
            {visibleSeries.map((s) => (
              <Area
                key={`${s.datasetId}-${s.columnKey}`}
                type="monotone"
                dataKey={seriesKeyMap.get(s)!}
                name={displayLabels.get(s)!}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.1}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                {...animProps}
              />
            ))}
            <Legend formatter={renderLegend} />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip unit={chart.yUnit} />} />
            {visibleSeries.map((s) => (
              <Bar
                key={`${s.datasetId}-${s.columnKey}`}
                dataKey={seriesKeyMap.get(s)!}
                name={displayLabels.get(s)!}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                {...animProps}
              />
            ))}
            <Legend formatter={renderLegend} />
          </BarChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps} name={xKey} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip unit={chart.yUnit} />} />
            {visibleSeries.map((s) => (
              <Scatter
                key={`${s.datasetId}-${s.columnKey}`}
                name={displayLabels.get(s)!}
                data={sampledData.map((row) => ({
                  [xKey]: row[xKey],
                  [seriesKeyMap.get(s)!]: row[seriesKeyMap.get(s)!],
                }))}
                fill={s.color}
              />
            ))}
            <Legend formatter={renderLegend} />
          </ScatterChart>
        );

      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip unit={chart.yUnit} />} />
            {visibleSeries.map((s) => (
              <Line
                key={`${s.datasetId}-${s.columnKey}`}
                type="monotone"
                dataKey={seriesKeyMap.get(s)!}
                name={displayLabels.get(s)!}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                {...animProps}
              />
            ))}
            <Legend formatter={renderLegend} />
          </LineChart>
        );
    }
  };

  return (
    <motion.div
      className="glass-card overflow-hidden flex flex-col"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="text-sm font-medium text-white/80 truncate">{chart.title}</h3>
        <button
          onClick={() => setShowControls(!showControls)}
          className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
        >
          {showControls ? <ChevronUp className="w-4 h-4" /> : <Settings className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Controls */}
      {showControls && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <ChartControls chart={chart} />
        </motion.div>
      )}

      {/* Chart */}
      <div className="px-2 pb-3" style={{ height: 280 }}>
        {visibleSeries.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/20 text-xs">
            No visible traces — add a trace or show an existing series
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}
