import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, ClipboardPaste, Check } from 'lucide-react';
import { useStore } from '../store/useStore';

export function DataInputModal() {
  const show = useStore((s) => s.showDataModal);
  const setShow = useStore((s) => s.setShowDataModal);
  const addData = useStore((s) => s.addData);
  const datasetCount = useStore((s) => s.datasets.length);
  const [name, setName] = useState(`Dataset ${datasetCount + 1}`);
  const [showPastePopover, setShowPastePopover] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (show) {
      setName(`Dataset ${datasetCount + 1}`);
      setShowPastePopover(false);
      setPasteText('');
    }
  }, [show, datasetCount]);

  useEffect(() => {
    if (showPastePopover) {
      pasteInputRef.current?.focus();
    }
  }, [showPastePopover]);

  const handlePaste = (text: string) => {
    if (text.trim()) {
      addData(text, name || undefined);
      setShow(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        addData(content, name || undefined);
        setShow(false);
      }
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
            className="relative glass-card w-full max-w-md mx-4 p-6 space-y-5"
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
                placeholder="Dataset 1"
              />
            </div>

            {/* Paste / Upload area */}
            <div className="relative flex gap-2 items-center justify-center py-4">
              <button
                onClick={() => setShowPastePopover(!showPastePopover)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80 hover:border-white/20 transition-all duration-300 flex items-center gap-2 cursor-pointer"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                Paste data
              </button>
              <span className="text-white/30 text-sm">or</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80 hover:border-white/20 transition-all duration-300 flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.json,.txt"
                className="hidden"
                onChange={handleFile}
              />

              {/* Paste popover */}
              <AnimatePresence>
                {showPastePopover && (
                  <motion.div
                    className="absolute bottom-full left-0 right-0 mb-3 glass-card p-3 z-30"
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/40 uppercase tracking-wider">Paste your data</span>
                      <button
                        onClick={() => handlePaste(pasteText)}
                        disabled={!pasteText.trim()}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        Done
                      </button>
                    </div>
                    <textarea
                      ref={pasteInputRef}
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.metaKey) handlePaste(pasteText);
                      }}
                      placeholder="Tap here to paste..."
                      className="w-full h-32 text-xs bg-white/5 border border-white/10 rounded-lg p-2 text-white/70 placeholder:text-white/25 resize-none focus:outline-none focus:border-indigo-500/40 transition-colors"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <p className="text-xs text-white/20 text-center">Supports CSV, TSV, JSON</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
