import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import type { ChartConfig, ChartType, AxisBound, AxisScale } from '../engine/types';
import { Eye, EyeOff } from 'lucide-react';

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
  const updateAxisBound = useStore((s) => s.updateAxisBound);
  const updateAxisScale = useStore((s) => s.updateAxisScale);

  // Collect all available column keys across datasets for X-axis selection
  const allXKeys = datasets.length > 0
    ? datasets[0].table.columns.map((c) => c.key)
    : [];

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
            {allXKeys.map((key) => (
              <option key={key} value={key}>{key}</option>
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
        {chart.series.map((series, i) => (
          <div key={`${series.datasetId}-${series.columnKey}`} className="flex items-center gap-2">
            <button
              onClick={() => toggleSeriesVisibility(chart.id, i)}
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
              onChange={(e) => updateSeriesColor(chart.id, i, e.target.value)}
            />
            <input
              type="text"
              value={series.label}
              onChange={(e) => updateSeriesLabel(chart.id, i, e.target.value)}
              className="flex-1 text-xs bg-transparent py-0.5"
            />
          </div>
        ))}
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
