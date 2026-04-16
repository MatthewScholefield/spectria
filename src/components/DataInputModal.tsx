import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Upload } from 'lucide-react';
import { useStore } from '../store/useStore';

export function DataInputModal() {
  const show = useStore((s) => s.showDataModal);
  const setShow = useStore((s) => s.setShowDataModal);
  const addData = useStore((s) => s.addData);
  const datasetCount = useStore((s) => s.datasets.length);
  const [text, setText] = useState('');
  const [name, setName] = useState(`Run ${datasetCount + 1}`);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (text.trim()) {
      addData(text, name || undefined);
      setText('');
      setName(`Run ${datasetCount + 2}`);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setText(content);
    };
    reader.readAsText(file);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShow(false)}
          />

          {/* Modal */}
          <motion.div
            className="relative glass-card w-full max-w-lg mx-4 p-6 space-y-4"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white/90">Add Dataset</h2>
              <button
                onClick={() => setShow(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dataset name */}
            <div>
              <label className="text-[11px] text-white/40 uppercase tracking-wider block mb-1.5">
                Dataset Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm"
                placeholder="Run 1"
              />
            </div>

            {/* Text area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] text-white/40 uppercase tracking-wider">
                  Data
                </label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  Upload file
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.json,.txt"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-48 text-xs font-mono resize-none"
                placeholder="Paste your CSV, TSV, or JSON data here..."
                spellCheck={false}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShow(false)}
                className="px-4 py-2 text-sm text-white/40 hover:text-white/60 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!text.trim()}
                className="px-5 py-2 text-sm font-medium bg-indigo-500/30 text-indigo-200 rounded-xl border border-indigo-400/30 hover:bg-indigo-500/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                Add Data
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
