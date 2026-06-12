import React, { useCallback, useState } from 'react';
import { ResponsiveContainer } from 'recharts';

import { Settings, ChevronUp } from 'lucide-react';
import { ChartControls } from './ChartControls';
import { useChartData } from '../hooks/useChartData';
import type { ChartConfig as ChartConfigType } from '../engine/types';
import { formatChartValue } from '../utils/format';
import { LineChartView } from './charts/LineChartView';
import { AreaChartView } from './charts/AreaChartView';
import { BarChartView } from './charts/BarChartView';
import { ScatterChartView } from './charts/ScatterChartView';

export function CustomTooltip({ active, payload, label, unit }: {
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

interface LegendItem {
  dataKey: string;
  label: string;
  color: string;
}

function InteractiveLegend({
  items,
  highlightedKeys,
  onLegendClick,
}: {
  items: LegendItem[];
  highlightedKeys: Set<string> | null;
  onLegendClick: (dataKey: string, ctrlKey: boolean) => void;
}) {
  if (!items.length) return null;

  return (
    <div style={{
      maxHeight: 80,
      overflowY: 'auto',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '0 8px',
      padding: '4px 0',
    }}>
      {items.map((item) => {
        const isHighlighted = highlightedKeys === null || highlightedKeys.has(item.dataKey);
        return (
          <span
            key={item.dataKey}
            onClick={(e) => onLegendClick(item.dataKey, e.ctrlKey || e.metaKey)}
            style={{
              color: isHighlighted ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
              fontSize: 11,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'color 0.15s ease',
              userSelect: 'none',
            }}
          >
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isHighlighted ? item.color : 'rgba(255,255,255,0.15)',
              marginRight: 6,
              verticalAlign: 'middle',
              transition: 'background-color 0.15s ease',
            }} />
            {item.label}
          </span>
        );
      })}
    </div>
  );
}

const chartViewProps = (chart: ChartConfigType, data: ReturnType<typeof useChartData>, highlightedDataKeys: Set<string> | null) => ({
  data: data.sampledData,
  xKey: chart.xKey,
  series: data.visibleSeries,
  seriesKeyMap: data.seriesKeyMap,
  displayLabels: data.displayLabels,
  xDomain: data.xDomain,
  yDomain: data.yDomain,
  yUnit: chart.yUnit,
  xScale: chart.xScale,
  yScale: chart.yScale,
  relativeMode: chart.relativeMode,
  isLive: data.isLive,
  xAxisMin: data.effectiveXAxisMin,
  xAxisMax: data.effectiveXAxisMax,
  highlightedDataKeys,
});

function renderChart(chart: ChartConfigType, data: ReturnType<typeof useChartData>, highlightedDataKeys: Set<string> | null) {
  const props = chartViewProps(chart, data, highlightedDataKeys);
  switch (chart.type) {
    case 'area':
      return <AreaChartView {...props} />;
    case 'bar':
      return <BarChartView {...props} />;
    case 'scatter':
      return <ScatterChartView {...props} />;
    default:
      return <LineChartView {...props} />;
  }
}

export const ChartCard = React.memo(function ChartCard({ chart, index }: { chart: ChartConfigType; index: number }) {
  const [showControls, setShowControls] = useState(false);
  const [highlightedKeys, setHighlightedKeys] = useState<Set<string> | null>(null);
  const chartData = useChartData(chart);

  const legendItems: LegendItem[] = chartData.visibleSeries.map((s) => ({
    dataKey: chartData.seriesKeyMap.get(s)!,
    label: chartData.displayLabels.get(s)!,
    color: s.color,
  }));

  const handleLegendClick = useCallback((dataKey: string, ctrlKey: boolean) => {
    setHighlightedKeys((prev) => {
      if (prev === null) {
        return new Set([dataKey]);
      }
      const next = new Set(prev);
      if (ctrlKey) {
        if (next.has(dataKey)) {
          next.delete(dataKey);
          return next.size === 0 ? null : next;
        }
        next.add(dataKey);
        return next;
      }
      if (next.has(dataKey) && next.size === 1) {
        return null;
      }
      return new Set([dataKey]);
    });
  }, []);

  return (
    <div
      className="glass-card overflow-hidden flex flex-col opacity-0 animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
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
        <div
          className="overflow-hidden animate-fade-in"
        >
          <ChartControls chart={chart} />
        </div>
      )}

      {/* Chart */}
      <div className="px-2 pb-1" style={{ height: 260 }}>
        {chartData.visibleSeries.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/20 text-xs">
            No visible traces — add a trace or show an existing series
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart(chart, chartData, highlightedKeys)}
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 pb-3">
        <InteractiveLegend
          items={legendItems}
          highlightedKeys={highlightedKeys}
          onLegendClick={handleLegendClick}
        />
      </div>
    </div>
  );
}, (prev, next) => prev.chart === next.chart && prev.index === next.index);
