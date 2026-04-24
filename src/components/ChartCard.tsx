import { useState, useMemo } from 'react';
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
import { formatNumber } from '../utils/format';
import { downsampleData } from '../engine/downsample';

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string | number;
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
            {typeof entry.value === 'number' ? formatNumber(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({ chart, index }: { chart: ChartConfigType; index: number }) {
  const [showControls, setShowControls] = useState(false);
  const datasets = useStore((s) => s.datasets);
  const getMergedData = useStore((s) => s.getMergedData);
  const data = useMemo(() => getMergedData(chart.id), [chart.id, chart.series, chart.xKey, datasets]);

  const visibleSeries = chart.series.filter((s) => s.visible);

  // Build unique data keys for each series (columnKey + short datasetId)
  const seriesDataKeys = chart.series.map(
    (s) => s.columnKey + '_' + s.datasetId.slice(-6)
  );

  const visibleDataKeys = visibleSeries.map(
    (s) => s.columnKey + '_' + s.datasetId.slice(-6)
  );

  const sampledData = useMemo(() => {
    if (chart.type === 'bar' || data.length <= 2000) return data;
    return downsampleData(data, 2000, visibleDataKeys);
  }, [data, chart.type, visibleDataKeys]);

  const yDomain = useMemo((): [number, number] => {
    if (chart.yAxisMin !== 'auto' && chart.yAxisMax !== 'auto') {
      return [chart.yAxisMin, chart.yAxisMax];
    }
    let min = Infinity;
    let max = -Infinity;
    for (const row of data) {
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
  }, [data, visibleDataKeys, chart.yAxisMin, chart.yAxisMax]);

  const xDomain = useMemo((): [number | 'auto', number | 'auto'] | undefined => {
    const min = chart.xAxisMin === 'auto' ? 'auto' as const : chart.xAxisMin;
    const max = chart.xAxisMax === 'auto' ? 'auto' as const : chart.xAxisMax;
    if (min === 'auto' && max === 'auto') return undefined;
    return [min, max];
  }, [chart.xAxisMin, chart.xAxisMax]);

  const renderChart = () => {
    const commonProps = {
      data: sampledData,
      margin: { top: 8, right: 8, left: 0, bottom: 0 },
    };

    const xKey = chart.xKey;
    const xAxisProps = { dataKey: xKey, tick: { fontSize: 11 }, tickLine: false, axisLine: false, ...(chart.xScale !== 'linear' ? { scale: chart.xScale } : {}), ...(xDomain ? { domain: xDomain, allowDataOverflow: true } : {}) };
    const yAxisProps = { tick: { fontSize: 11 }, tickLine: false, axisLine: false, width: 50, tickFormatter: formatNumber, domain: yDomain, allowDataOverflow: true, ...(chart.yScale !== 'linear' ? { scale: chart.yScale } : {}) };

    switch (chart.type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            {visibleSeries.map((s) => (
              <Area
                key={`${s.datasetId}-${s.columnKey}`}
                type="monotone"
                dataKey={seriesDataKeys[chart.series.indexOf(s)]}
                name={s.label}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.1}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
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
            <Tooltip content={<CustomTooltip />} />
            {visibleSeries.map((s) => (
              <Bar
                key={`${s.datasetId}-${s.columnKey}`}
                dataKey={seriesDataKeys[chart.series.indexOf(s)]}
                name={s.label}
                fill={s.color}
                radius={[4, 4, 0, 0]}
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
            <Tooltip content={<CustomTooltip />} />
            {visibleSeries.map((s) => (
              <Scatter
                key={`${s.datasetId}-${s.columnKey}`}
                name={s.label}
                data={sampledData.map((row) => ({
                  [xKey]: row[xKey],
                  [seriesDataKeys[chart.series.indexOf(s)]]: row[seriesDataKeys[chart.series.indexOf(s)]],
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
            <Tooltip content={<CustomTooltip />} />
            {visibleSeries.map((s) => (
              <Line
                key={`${s.datasetId}-${s.columnKey}`}
                type="monotone"
                dataKey={seriesDataKeys[chart.series.indexOf(s)]}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
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
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
