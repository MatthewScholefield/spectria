import { useMemo, useState } from 'react';
import { Plus, Columns2, Columns3, Square, X, Pencil, Check, Radio, GitCompare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { computeDisplayNames, getFullName } from '../utils/format';

const LOCAL_DATA_MODE = !!(import.meta.env.VITE_LOCAL_DATA_MODE || import.meta.env.VITE_LOCAL_DATA_URL);

export function Toolbar() {
  const datasets = useStore((s) => s.datasets);
  const sources = useStore((s) => s.sources);
  const gridColumns = useStore((s) => s.gridColumns);
  const setGridColumns = useStore((s) => s.setGridColumns);
  const setShowDataModal = useStore((s) => s.setShowDataModal);
  const setShowConnectModal = useStore((s) => s.setShowConnectModal);
  const setShowConfigDiff = useStore((s) => s.setShowConfigDiff);
  const renameDataset = useStore((s) => s.renameDataset);
  const removeDataset = useStore((s) => s.removeDataset);
  const removeSource = useStore((s) => s.removeSource);
  const createChart = useStore((s) => s.createChart);
  const setEditingChartId = useStore((s) => s.setEditingChartId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const { sharedPrefix, displayNames } = useMemo(
    () => computeDisplayNames(datasets),
    [datasets],
  );

  const sortedDatasets = useMemo(
    () =>
      [...datasets].sort((a, b) => {
        const srcA = a.sourceId ? sources.find((s) => s.id === a.sourceId) : null;
        const srcB = b.sourceId ? sources.find((s) => s.id === b.sourceId) : null;
        const liveA = srcA?.status === 'live' || srcA?.status === 'connecting' ? 0 : 1;
        const liveB = srcB?.status === 'live' || srcB?.status === 'connecting' ? 0 : 1;
        return liveA - liveB;
      }),
    [datasets, sources],
  );

  return (
    <motion.div
      className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-3 border-b border-white/5 bg-black/20 backdrop-blur-md"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Row 1: Logo + scrollable dataset chips */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm font-light text-white/50 tracking-wide shrink-0">Spectria</span>

        {datasets.length > 0 && (
          <div className="flex gap-2 flex-nowrap overflow-x-auto items-center scrollbar-none -mx-1 px-1">
            {sharedPrefix && (
              <span className="text-xs text-white/30 shrink-0">{sharedPrefix}</span>
            )}
            {sortedDatasets.map((ds) => {
              const source = ds.sourceId ? sources.find((s) => s.id === ds.sourceId) : null;
              const liveDot = source?.status === 'live' ? 'bg-green-400' : source?.status === 'connecting' ? 'bg-yellow-400 animate-pulse' : null;
              const chipLabel = displayNames.get(ds.id) ?? getFullName(ds.origin);
              return (
                <div
                  key={ds.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-xs text-white/60 group shrink-0"
                >
                  {editingId === ds.id ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-xs bg-transparent w-20 py-0 px-0 border-none outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            renameDataset(ds.id, editName);
                            setEditingId(null);
                          }
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                      <button
                        onClick={() => { renameDataset(ds.id, editName); setEditingId(null); }}
                        className="text-white/30 hover:text-white/60 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${liveDot ?? 'bg-indigo-400/60'}`} />
                      <span className="whitespace-nowrap">{chipLabel}</span>
                      {liveDot && <span className="text-[9px] text-white/25 uppercase">live</span>}
                      <button
                        onClick={() => { setEditingId(ds.id); setEditName(getFullName(ds.origin)); }}
                        className="text-white/30 hover:text-white/60 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => ds.sourceId ? removeSource(ds.sourceId) : removeDataset(ds.id)}
                        className="text-white/30 hover:text-red-400/60 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 2: Actions */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0 -mx-1 px-1 overflow-x-auto scrollbar-none md:overflow-visible">
        {/* Grid toggle */}
        <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => setGridColumns(1)}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              gridColumns === 1 ? 'bg-white/10 text-white/70' : 'text-white/25 hover:text-white/40'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setGridColumns(2)}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              gridColumns === 2 ? 'bg-white/10 text-white/70' : 'text-white/25 hover:text-white/40'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setGridColumns(3)}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              gridColumns === 3 ? 'bg-white/10 text-white/70' : 'text-white/25 hover:text-white/40'
            }`}
          >
            <Columns3 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* New chart button */}
        {datasets.length > 0 && (
          <button
            onClick={() => {
              const id = createChart();
              setEditingChartId(id);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 hover:bg-white/10 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="md:hidden">Chart</span>
            <span className="hidden md:inline">New Chart</span>
          </button>
        )}

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

        {/* Connect button (hidden in local data mode — "Add Run" replaces it) */}
        {!LOCAL_DATA_MODE && (
          <button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 hover:bg-white/10 transition-all cursor-pointer shrink-0"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Connect</span>
          </button>
        )}

        {/* Add data / Add run button */}
        <button
          onClick={() => LOCAL_DATA_MODE ? setShowConnectModal(true) : setShowDataModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-400/20 text-xs text-indigo-200 hover:bg-indigo-500/30 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          {LOCAL_DATA_MODE ? 'Add Run' : 'Add Data'}
        </button>
      </div>
    </motion.div>
  );
}
