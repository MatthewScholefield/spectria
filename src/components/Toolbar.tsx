import { useState } from 'react';
import { Plus, Columns2, Columns3, Square, X, Pencil, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';

export function Toolbar() {
  const datasets = useStore((s) => s.datasets);
  const gridColumns = useStore((s) => s.gridColumns);
  const setGridColumns = useStore((s) => s.setGridColumns);
  const setShowDataModal = useStore((s) => s.setShowDataModal);
  const renameDataset = useStore((s) => s.renameDataset);
  const removeDataset = useStore((s) => s.removeDataset);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  return (
    <motion.div
      className="flex items-center gap-3 px-6 py-3 border-b border-white/5 bg-black/20 backdrop-blur-md"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Logo */}
      <span className="text-sm font-light text-white/50 tracking-wide mr-2">Spectra</span>

      {/* Dataset chips */}
      <div className="flex gap-2 flex-1 flex-wrap">
        {datasets.map((ds) => (
          <div
            key={ds.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-xs text-white/60 group"
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
                <span className="w-2 h-2 rounded-full bg-indigo-400/60" />
                <span>{ds.name}</span>
                <button
                  onClick={() => { setEditingId(ds.id); setEditName(ds.name); }}
                  className="text-white/20 hover:text-white/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
                {datasets.length > 1 && (
                  <button
                    onClick={() => removeDataset(ds.id)}
                    className="text-white/20 hover:text-red-400/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Grid toggle */}
      <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5">
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

      {/* Add data button */}
      <button
        onClick={() => setShowDataModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-400/20 text-xs text-indigo-200 hover:bg-indigo-500/30 transition-all cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Data
      </button>
    </motion.div>
  );
}
