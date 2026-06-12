import { useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Filter, Plus, GitCompare, X, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { AxisBound, GlobalAxisFilter } from '../engine/types';

interface AxisInfo {
  key: string;
  header: string;
  chartCount: number;
  dataMin: number;
  dataMax: number;
}

function useAxisInfo(): AxisInfo[] {
  const { charts, datasets } = useStore(
    useShallow((s) => ({ charts: s.charts, datasets: s.datasets })),
  );

  return useMemo(() => {
    const keyData = new Map<string, { headers: Set<string>; chartCount: number; min: number; max: number }>();

    for (const chart of charts) {
      if (chart.xKey === '__rowIndex__') continue;
      const entry = keyData.get(chart.xKey);
      if (entry) {
        entry.chartCount++;
      } else {
        keyData.set(chart.xKey, { headers: new Set(), chartCount: 1, min: Infinity, max: -Infinity });
      }
    }

    for (const dataset of datasets) {
      for (const col of dataset.table.columns) {
        const entry = keyData.get(col.key);
        if (!entry) continue;
        entry.headers.add(col.header);
        for (const val of col.values) {
          if (typeof val === 'number' && isFinite(val)) {
            if (val < entry.min) entry.min = val;
            if (val > entry.max) entry.max = val;
          }
        }
      }
    }

    return Array.from(keyData.entries())
      .map(([key, data]) => ({
        key,
        header: data.headers.values().next().value ?? key,
        chartCount: data.chartCount,
        dataMin: data.min === Infinity ? 0 : data.min,
        dataMax: data.max === -Infinity ? 0 : data.max,
      }))
      .sort((a, b) => b.chartCount - a.chartCount);
  }, [charts, datasets]);
}

function FilterRow({ axis, filter, onChange, onRemove }: {
  axis: AxisInfo;
  filter: GlobalAxisFilter | undefined;
  onChange: (bounds: GlobalAxisFilter) => void;
  onRemove: () => void;
}) {
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);

  const toStr = (v: AxisBound) => v === 'auto' ? '' : String(v);
  const fromStr = (s: string): AxisBound => {
    const trimmed = s.trim();
    if (trimmed === '') return 'auto';
    const n = Number(trimmed);
    return isNaN(n) ? 'auto' : n;
  };

  const commit = () => {
    const min = fromStr(minRef.current?.value ?? '');
    const max = fromStr(maxRef.current?.value ?? '');
    if (min === 'auto' && max === 'auto') {
      onRemove();
    } else {
      onChange({ min, max });
    }
  };

  const isActive = filter !== undefined;

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${isActive ? 'bg-indigo-500/10 border border-indigo-400/20' : 'bg-white/3 border border-transparent'}`}>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-white/70 font-medium truncate">{axis.header}</span>
          {axis.chartCount > 1 && (
            <span className="text-[9px] text-indigo-300/70 bg-indigo-500/15 px-1.5 py-0.5 rounded-full shrink-0">
              {axis.chartCount} charts
            </span>
          )}
        </div>
        <span className="text-[9px] text-white/25">
          range: {axis.dataMin === axis.dataMax ? axis.dataMin : `${axis.dataMin} – ${axis.dataMax}`}
        </span>
      </div>
      <input
        ref={minRef}
        key={`min-${filter?.min ?? 'auto'}`}
        type="text"
        defaultValue={toStr(filter?.min ?? 'auto')}
        placeholder="min"
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') minRef.current?.blur(); }}
        className="w-14 text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/60 text-center outline-none placeholder:text-white/20"
      />
      <span className="text-[10px] text-white/20">to</span>
      <input
        ref={maxRef}
        key={`max-${filter?.max ?? 'auto'}`}
        type="text"
        defaultValue={toStr(filter?.max ?? 'auto')}
        placeholder="max"
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') maxRef.current?.blur(); }}
        className="w-14 text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/60 text-center outline-none placeholder:text-white/20"
      />
      {isActive && (
        <button
          onClick={onRemove}
          className="p-0.5 text-white/30 hover:text-red-400/60 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export function ChartToolbar() {
  const [showFilters, setShowFilters] = useState(false);
  const axisInfo = useAxisInfo();
  const globalAxisFilters = useStore((s) => s.globalAxisFilters);
  const setGlobalAxisFilter = useStore((s) => s.setGlobalAxisFilter);
  const removeGlobalAxisFilter = useStore((s) => s.removeGlobalAxisFilter);
  const clearGlobalAxisFilters = useStore((s) => s.clearGlobalAxisFilters);
  const createChart = useStore((s) => s.createChart);
  const setEditingChartId = useStore((s) => s.setEditingChartId);
  const setShowConfigDiff = useStore((s) => s.setShowConfigDiff);
  const sources = useStore((s) => s.sources);

  const activeFilterCount = Object.keys(globalAxisFilters).length;
  const hasAxes = axisInfo.length > 0;

  if (!hasAxes) return null;

  return (
    <div className="border-b border-white/5 bg-black/10">
      {/* Action bar */}
      <div className="flex items-center gap-1.5 px-4 md:px-6 py-1.5">
        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer shrink-0 ${
            showFilters || activeFilterCount > 0
              ? 'bg-indigo-500/15 border-indigo-400/25 text-indigo-200/80'
              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-indigo-400/30 text-indigo-100 text-[9px] px-1.5 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {/* Active filter chips */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {Object.entries(globalAxisFilters).map(([key, bounds]) => {
              const info = axisInfo.find((a) => a.key === key);
              const label = info?.header ?? key;
              const minStr = bounds.min !== 'auto' ? `≥${bounds.min}` : '';
              const maxStr = bounds.max !== 'auto' ? `≤${bounds.max}` : '';
              const rangeStr = [minStr, maxStr].filter(Boolean).join(', ') || 'set';
              return (
                <span
                  key={key}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-400/15 text-[10px] text-indigo-200/60 shrink-0"
                >
                  {label} {rangeStr}
                </span>
              );
            })}
          </div>
        )}

        <div className="flex-1" />

        {/* New chart button */}
        <button
          onClick={() => {
            const id = createChart();
            setEditingChartId(id);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 hover:bg-white/10 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">New Chart</span>
        </button>

        {/* Compare Config button */}
        {sources.length > 1 && sources.some((s) => s.runConfig) && (
          <button
            onClick={() => setShowConfigDiff(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 hover:bg-white/10 transition-all cursor-pointer shrink-0"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Compare</span>
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="px-4 md:px-6 pb-3 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Global Axis Filters</span>
            {activeFilterCount > 0 && (
              <button
                onClick={clearGlobalAxisFilters}
                className="text-[10px] text-white/30 hover:text-white/50 transition-colors cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="space-y-1">
            {axisInfo.map((axis) => (
              <FilterRow
                key={axis.key}
                axis={axis}
                filter={globalAxisFilters[axis.key]}
                onChange={(bounds) => setGlobalAxisFilter(axis.key, bounds)}
                onRemove={() => removeGlobalAxisFilter(axis.key)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
