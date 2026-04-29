import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { ChartConfig, ChartType, AxisBound, AxisScale } from '../engine/types';
import { Eye, EyeOff, Plus, Trash2, X } from 'lucide-react';

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'bar', label: 'Bar' },
  { value: 'scatter', label: 'Scatter' },
];

export function ChartControls({ chart }: { chart: ChartConfig }) {
  const datasets = useStore((s) => s.datasets);
  const updateChartTitle = useStore((s) => s.updateChartTitle);
  const updateChartType = useStore((s) => s.updateChartType);
  const updateChartXKey = useStore((s) => s.updateChartXKey);
  const toggleSeriesVisibility = useStore((s) => s.toggleSeriesVisibility);
  const updateSeriesColor = useStore((s) => s.updateSeriesColor);
  const updateSeriesLabel = useStore((s) => s.updateSeriesLabel);
  const addSeries = useStore((s) => s.addSeries);
  const removeSeries = useStore((s) => s.removeSeries);
  const deleteChart = useStore((s) => s.deleteChart);
  const getNextSeriesColor = useStore((s) => s.getNextSeriesColor);
  const updateAxisBound = useStore((s) => s.updateAxisBound);
  const updateAxisScale = useStore((s) => s.updateAxisScale);

  const [showAddTrace, setShowAddTrace] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const addTraceRef = useRef<HTMLDivElement>(null);

  // Close add-trace popover on outside click
  useEffect(() => {
    if (!showAddTrace) return;
    const handler = (e: MouseEvent) => {
      if (addTraceRef.current && !addTraceRef.current.contains(e.target as Node)) {
        setShowAddTrace(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddTrace]);

  // Dataset IDs participating in this chart
  const chartDatasetIds = new Set(chart.series.map((s) => s.datasetId));

  // X-axis: collect columns from all datasets in the chart
  const allXKeys = (() => {
    const keySet = new Map<string, string>(); // key → label (suffixed if collides)
    for (const ds of datasets) {
      if (!chartDatasetIds.has(ds.id) && datasets.length > 0) continue;
      // Include all datasets for X-axis options; prefer ones in the chart
      for (const col of ds.table.columns) {
        if (!keySet.has(col.key)) {
          keySet.set(col.key, col.key);
        }
      }
    }
    // Also include columns from datasets that have series on this chart
    for (const ds of datasets) {
      if (!chartDatasetIds.has(ds.id)) continue;
      for (const col of ds.table.columns) {
        if (!keySet.has(col.key)) {
          keySet.set(col.key, col.key);
        }
      }
    }
    return Array.from(keySet.entries());
  })();

  // Auto-select first dataset when opening add-trace
  useEffect(() => {
    if (showAddTrace && !selectedDatasetId && datasets.length > 0) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [showAddTrace, selectedDatasetId, datasets]);

  const handleAddTrace = (datasetId: string, columnKey: string, header: string) => {
    const ds = datasets.find((d) => d.id === datasetId);
    if (!ds) return;
    const color = getNextSeriesColor(chart.id);
    addSeries(chart.id, {
      datasetId,
      columnKey,
      label: `${ds.name} · ${header}`,
      color,
      visible: true,
    });
  };

  return (
    <div className="px-5 pb-4 space-y-3 border-b border-white/5">
      {/* Title + Chart Type row */}
      <div className="flex gap-3 items-center">
        <input
          type="text"
          value={chart.title}
          onChange={(e) => updateChartTitle(chart.id, e.target.value)}
          className="flex-1 text-xs bg-transparent"
          placeholder="Chart title"
        />
        <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5">
          {CHART_TYPES.map((ct) => (
            <button
              key={ct.value}
              onClick={() => updateChartType(chart.id, ct.value)}
              className={`px-2 py-1 text-[10px] rounded-md transition-all cursor-pointer ${
                chart.type === ct.value
                  ? 'bg-white/10 text-white/80'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              {ct.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => deleteChart(chart.id)}
          className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400/60 transition-colors cursor-pointer"
          title="Delete chart"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* X-axis selector */}
      {allXKeys.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30 w-8">X axis</span>
          <select
            value={chart.xKey}
            onChange={(e) => updateChartXKey(chart.id, e.target.value)}
            className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/70 outline-none"
          >
            <option value="__rowIndex__">Row Index</option>
            {allXKeys.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Axis range */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-white/30 uppercase tracking-wider">Axis Range</span>
        <ScaleRow label="Y" scale={chart.yScale} onChange={(v) => updateAxisScale(chart.id, 'yScale', v)} />
        <AxisRow label="Y" min={chart.yAxisMin} max={chart.yAxisMax} onChangeMin={(v) => updateAxisBound(chart.id, 'yAxisMin', v)} onChangeMax={(v) => updateAxisBound(chart.id, 'yAxisMax', v)} />
        <ScaleRow label="X" scale={chart.xScale} onChange={(v) => updateAxisScale(chart.id, 'xScale', v)} />
        <AxisRow label="X" min={chart.xAxisMin} max={chart.xAxisMax} onChangeMin={(v) => updateAxisBound(chart.id, 'xAxisMin', v)} onChangeMax={(v) => updateAxisBound(chart.id, 'xAxisMax', v)} />
      </div>

      {/* Series list */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-white/30 uppercase tracking-wider">Series</span>
        {chart.series.map((series) => (
          <div key={`${series.datasetId}-${series.columnKey}`} className="flex items-center gap-2">
            <button
              onClick={() => toggleSeriesVisibility(chart.id, series.datasetId, series.columnKey)}
              className="text-white/30 hover:text-white/60 transition-colors cursor-pointer"
            >
              {series.visible
                ? <Eye className="w-3.5 h-3.5" />
                : <EyeOff className="w-3.5 h-3.5" />
              }
            </button>
            <input
              type="color"
              value={series.color}
              onChange={(e) => updateSeriesColor(chart.id, series.datasetId, series.columnKey, e.target.value)}
            />
            <input
              type="text"
              value={series.label}
              onChange={(e) => updateSeriesLabel(chart.id, series.datasetId, series.columnKey, e.target.value)}
              className="flex-1 text-xs bg-transparent py-0.5"
            />
            <button
              onClick={() => removeSeries(chart.id, series.datasetId, series.columnKey)}
              className="p-0.5 text-white/20 hover:text-red-400/60 transition-colors cursor-pointer"
              title="Remove trace"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Add trace */}
        <div className="relative" ref={addTraceRef}>
          <button
            onClick={() => setShowAddTrace(!showAddTrace)}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-white/30 hover:text-white/50 rounded-md hover:bg-white/5 transition-all cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Add trace
          </button>

          {showAddTrace && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-[#1a1a3a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 min-w-[220px]">
              {/* Dataset selector */}
              {datasets.length > 1 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {datasets.map((ds) => (
                    <button
                      key={ds.id}
                      onClick={() => setSelectedDatasetId(ds.id)}
                      className={`px-2 py-1 text-[10px] rounded-md transition-all cursor-pointer ${
                        selectedDatasetId === ds.id
                          ? 'bg-white/10 text-white/80'
                          : 'text-white/30 hover:text-white/50'
                      }`}
                    >
                      {ds.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Column list */}
              {selectedDatasetId && (() => {
                const ds = datasets.find((d) => d.id === selectedDatasetId);
                if (!ds) return null;
                const existingKeys = new Set(
                  chart.series
                    .filter((s) => s.datasetId === selectedDatasetId)
                    .map((s) => s.columnKey)
                );
                const availableCols = ds.table.columns.filter(
                  (c) => (c.type === 'numeric' || c.type === 'categorical') && !existingKeys.has(c.key)
                );
                if (availableCols.length === 0) {
                  return <p className="text-[10px] text-white/30">No available columns</p>;
                }
                return (
                  <div className="space-y-0.5 max-h-40 overflow-y-auto">
                    {availableCols.map((col) => (
                      <button
                        key={col.key}
                        onClick={() => {
                          handleAddTrace(ds.id, col.key, col.header);
                          setShowAddTrace(false);
                        }}
                        className="w-full text-left px-2 py-1.5 text-[11px] text-white/50 hover:text-white/80 hover:bg-white/5 rounded-md transition-all cursor-pointer"
                      >
                        {col.header}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const SCALES: { value: AxisScale; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'log', label: 'Log' },
  { value: 'sqrt', label: 'Sqrt' },
];

function ScaleRow({ label, scale, onChange }: {
  label: string;
  scale: AxisScale;
  onChange: (v: AxisScale) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/30 w-3">{label}</span>
      <div className="flex gap-0.5 bg-white/5 rounded-md p-0.5">
        {SCALES.map((s) => (
          <button
            key={s.value}
            onClick={() => onChange(s.value)}
            className={`px-2 py-0.5 text-[10px] rounded transition-all cursor-pointer ${
              scale === s.value
                ? 'bg-white/10 text-white/80'
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AxisRow({ label, min, max, onChangeMin, onChangeMax }: {
  label: string;
  min: AxisBound;
  max: AxisBound;
  onChangeMin: (v: AxisBound) => void;
  onChangeMax: (v: AxisBound) => void;
}) {
  const toStr = (v: AxisBound) => v === 'auto' ? '' : String(v);
  const fromStr = (s: string): AxisBound => {
    const trimmed = s.trim();
    if (trimmed === '') return 'auto';
    const n = Number(trimmed);
    return isNaN(n) ? 'auto' : n;
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/30 w-3">{label}</span>
      <InputWithBlurCommit
        value={toStr(min)}
        placeholder="auto"
        onCommit={(s) => onChangeMin(fromStr(s))}
        className="w-14 text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/60 text-center outline-none placeholder:text-white/20"
      />
      <span className="text-[10px] text-white/20">to</span>
      <InputWithBlurCommit
        value={toStr(max)}
        placeholder="auto"
        onCommit={(s) => onChangeMax(fromStr(s))}
        className="w-14 text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/60 text-center outline-none placeholder:text-white/20"
      />
    </div>
  );
}

function InputWithBlurCommit({ value, placeholder, onCommit, className }: {
  value: string;
  placeholder: string;
  onCommit: (raw: string) => void;
  className: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState(value);
  const focused = useRef(false);

  if (value !== local && !focused.current) {
    setLocal(value);
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; onCommit(local); }}
      onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.blur(); }}
      className={className}
    />
  );
}
