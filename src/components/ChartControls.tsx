import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import type { ChartConfig, ChartType, AxisBound, AxisScale, ChartValueUnit, RelativeMode, SeriesConfig } from '../engine/types';
import { computeDefaultLabel, getDisplayLabel } from '../engine/labels';
import { getFullName } from '../utils/format';
import { useDisplayNames } from '../hooks/useDisplayNames';
import { Eye, EyeOff, Plus, Trash2, X } from 'lucide-react';

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'bar', label: 'Bar' },
  { value: 'scatter', label: 'Scatter' },
];

const RELATIVE_MODES: { value: RelativeMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'residual', label: 'Delta' },
  { value: 'percentResidual', label: '% Delta' },
];

const VALUE_UNITS: { value: ChartValueUnit; label: string }[] = [
  { value: 'number', label: 'Number' },
  { value: 'percentage', label: '%' },
  { value: 'seconds', label: 'Duration (s)' },
  { value: 'milliseconds', label: 'Duration (ms)' },
  { value: 'minutes', label: 'Duration (min)' },
  { value: 'hours', label: 'Duration (hr)' },
  { value: 'bytes', label: 'Bytes' },
  { value: 'kilobytes', label: 'Kilobytes' },
  { value: 'megabytes', label: 'Megabytes' },
  { value: 'gigabytes', label: 'Gigabytes' },
  { value: 'dollars', label: 'Dollars' },
  { value: 'count', label: 'Count' },
];

export function ChartControls({ chart }: { chart: ChartConfig }) {
  const chartDatasetIds = useMemo(() => new Set(chart.series.map((s) => s.datasetId)), [chart.series]);
  const datasets = useStore(
    useCallback((s) => s.datasets.filter((d) => chartDatasetIds.has(d.id)), [chartDatasetIds]),
  );
  const allDatasets = useStore((s) => s.datasets);
  const updateChartTitle = useStore((s) => s.updateChartTitle);
  const updateChartType = useStore((s) => s.updateChartType);
  const updateChartXKey = useStore((s) => s.updateChartXKey);
  const updateChartRelativeMode = useStore((s) => s.updateChartRelativeMode);
  const updateChartRelativeBase = useStore((s) => s.updateChartRelativeBase);
  const updateChartYUnit = useStore((s) => s.updateChartYUnit);
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

  const { displayNames: datasetDisplayNames } = useDisplayNames();

  // Memoize display labels per series for performance
  const seriesLabels = useMemo(
    () => new Map(chart.series.map((s) => [s, getDisplayLabel(chart.series, s, allDatasets, datasetDisplayNames)])),
    [chart.series, allDatasets, datasetDisplayNames],
  );

  // Dataset IDs participating in this chart
  const isNumericSeries = (series: SeriesConfig) => {
    const ds = datasets.find((d) => d.id === series.datasetId);
    const col = ds?.table.columns.find((c) => c.key === series.columnKey);
    return col?.type === 'numeric';
  };
  const relativeBaseOptions = chart.series.filter(isNumericSeries);
  const effectiveRelativeBase = relativeBaseOptions.find(
    (series) => chart.relativeBase?.datasetId === series.datasetId && chart.relativeBase.columnKey === series.columnKey
  ) ?? relativeBaseOptions[0] ?? null;
  const relativeBaseValue = effectiveRelativeBase
    ? `${effectiveRelativeBase.datasetId}::${effectiveRelativeBase.columnKey}`
    : '';

  // X-axis: collect columns from all datasets in the chart
  const allXKeys = useMemo(() => {
    const keySet = new Map<string, string>();
    for (const ds of allDatasets) {
      if (!chartDatasetIds.has(ds.id) && allDatasets.length > 0) continue;
      for (const col of ds.table.columns) {
        if (!keySet.has(col.key)) {
          keySet.set(col.key, col.key);
        }
      }
    }
    for (const ds of allDatasets) {
      if (!chartDatasetIds.has(ds.id)) continue;
      for (const col of ds.table.columns) {
        if (!keySet.has(col.key)) {
          keySet.set(col.key, col.key);
        }
      }
    }
    return Array.from(keySet.entries());
  }, [allDatasets, chartDatasetIds]);

  const handleAddTrace = (datasetId: string, columnKey: string) => {
    const ds = allDatasets.find((d) => d.id === datasetId);
    if (!ds) return;
    const color = getNextSeriesColor(chart.id);
    addSeries(chart.id, {
      datasetId,
      columnKey,
      color,
      visible: true,
    });
  };

  const handleRelativeModeChange = (mode: RelativeMode) => {
    updateChartRelativeMode(chart.id, mode);
    if (mode !== 'none' && !effectiveRelativeBase && relativeBaseOptions[0]) {
      updateChartRelativeBase(chart.id, {
        datasetId: relativeBaseOptions[0].datasetId,
        columnKey: relativeBaseOptions[0].columnKey,
      });
    }
  };

  const handleRelativeBaseChange = (value: string) => {
    const nextBase = relativeBaseOptions.find(
      (series) => `${series.datasetId}::${series.columnKey}` === value
    );
    updateChartRelativeBase(
      chart.id,
      nextBase ? { datasetId: nextBase.datasetId, columnKey: nextBase.columnKey } : null,
    );
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

      {/* Data */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-white/30 uppercase tracking-wider">Data</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30 w-12">Transform</span>
          <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5">
            {RELATIVE_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => handleRelativeModeChange(mode.value)}
                className={`px-2 py-1 text-[10px] rounded-md transition-all cursor-pointer ${
                  chart.relativeMode === mode.value
                    ? 'bg-white/10 text-white/80'
                    : 'text-white/30 hover:text-white/50'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        {chart.relativeMode !== 'none' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30 w-8">Base</span>
            <select
              value={relativeBaseValue}
              onChange={(e) => handleRelativeBaseChange(e.target.value)}
              disabled={relativeBaseOptions.length === 0}
              className="min-w-0 flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/70 outline-none disabled:text-white/25"
            >
              {relativeBaseOptions.length === 0 ? (
                <option value="">No numeric visible series</option>
              ) : (
                relativeBaseOptions.map((series) => (
                  <option key={`${series.datasetId}-${series.columnKey}`} value={`${series.datasetId}::${series.columnKey}`}>
                    {seriesLabels.get(series)}{series.visible ? '' : ' (hidden)'}
                  </option>
                ))
              )}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30 w-12">Unit</span>
          <UnitSelector
            value={chart.yUnit}
            onChange={(unit) => updateChartYUnit(chart.id, unit)}
          />
        </div>
      </div>

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
            <InputWithBlurCommit
              value={seriesLabels.get(series) ?? ''}
              onCommit={(raw) => {
                const defaultLabel = computeDefaultLabel(chart.series, series, allDatasets, datasetDisplayNames);
                const currentLabel = seriesLabels.get(series) ?? '';
                const effective = (!raw || raw === defaultLabel || raw === currentLabel) ? '' : raw;
                updateSeriesLabel(chart.id, series.datasetId, series.columnKey, effective);
              }}
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
        <button
          onClick={() => {
            setShowAddTrace(!showAddTrace);
            if (showAddTrace) setSelectedDatasetId(null);
          }}
          className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-white/30 hover:text-white/50 rounded-md hover:bg-white/5 transition-all cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          Add trace
        </button>

        {showAddTrace && (
          <div className="ml-4 pl-2 border-l border-white/5 space-y-1.5">
            {allDatasets.length > 1 && (
              <div className="flex flex-wrap gap-1">
                {allDatasets.map((ds) => (
                  <button
                    key={ds.id}
                    onClick={() => setSelectedDatasetId(ds.id)}
                    className={`px-2 py-1 text-[10px] rounded-md transition-all cursor-pointer ${
                      selectedDatasetId === ds.id
                        ? 'bg-white/10 text-white/80'
                        : 'text-white/30 hover:text-white/50'
                    }`}
                  >
                    {datasetDisplayNames.get(ds.id) ?? getFullName(ds.origin)}
                  </button>
                ))}
              </div>
            )}
            {(selectedDatasetId || allDatasets.length === 1 ? selectedDatasetId ?? allDatasets[0]?.id : null) && (() => {
              const ds = allDatasets.find((d) => d.id === (selectedDatasetId ?? allDatasets[0]?.id));
              if (!ds) return null;
              const existingKeys = new Set(
                chart.series
                  .filter((s) => s.datasetId === ds.id)
                  .map((s) => s.columnKey)
              );
              const availableCols = ds.table.columns.filter(
                (c) => (c.type === 'numeric' || c.type === 'categorical') && !existingKeys.has(c.key)
              );
              if (availableCols.length === 0) {
                return <p className="text-[10px] text-white/30 py-1">No available columns</p>;
              }
              return (
                <div className="space-y-0.5">
                  {availableCols.map((col) => (
                    <button
                      key={col.key}
                      onClick={() => {
                        handleAddTrace(ds.id, col.key);
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
  );
}

function getUnitLabel(value: ChartValueUnit): string {
  if (value.startsWith('custom:')) {
    return value.slice('custom:'.length);
  }
  return VALUE_UNITS.find((unit) => unit.value === value)?.label ?? value;
}

function parseUnitValue(raw: string): ChartValueUnit {
  const trimmed = raw.trim();
  const matchedUnit = VALUE_UNITS.find(
    (unit) => unit.label.toLowerCase() === trimmed.toLowerCase() || unit.value === trimmed
  );

  if (matchedUnit) {
    return matchedUnit.value;
  }
  if (trimmed.startsWith('custom:')) {
    const customUnit = trimmed.slice('custom:'.length).trim();
    return customUnit ? `custom:${customUnit}` : 'number';
  }
  return trimmed ? `custom:${trimmed}` : 'number';
}

function UnitSelector({ value, onChange }: {
  value: ChartValueUnit;
  onChange: (unit: ChartValueUnit) => void;
}) {
  const datalistId = useId();
  const [draft, setDraft] = useState(getUnitLabel(value));

  useEffect(() => {
    setDraft(getUnitLabel(value));
  }, [value]);

  const commit = (raw: string) => {
    const nextUnit = parseUnitValue(raw);
    onChange(nextUnit);
    setDraft(getUnitLabel(nextUnit));
  };

  return (
    <div className="min-w-0 flex-1">
      <input
        key={value}
        list={datalistId}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white/70 outline-none placeholder:text-white/20"
        placeholder="Search or enter custom"
      />
      <datalist id={datalistId}>
        {VALUE_UNITS.map((unit) => (
          <option key={unit.value} value={unit.label} />
        ))}
      </datalist>
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
  placeholder?: string;
  onCommit: (raw: string) => void;
  className: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <input
      key={value}
      ref={inputRef}
      type="text"
      defaultValue={value}
      placeholder={placeholder}
      onBlur={(e) => onCommit(e.currentTarget.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.blur(); }}
      className={className}
    />
  );
}
