import { useRef, useState, useEffect, type DragEvent } from 'react';
import { Upload, Sparkles, ClipboardPaste, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

export function EmptyState() {
  const addData = useStore((s) => s.addData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showPastePopover, setShowPastePopover] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const pasteInputRef = useRef<HTMLTextAreaElement>(null);

  const handlePaste = (text: string) => {
    if (text.trim()) {
      addData(text);
      setShowPastePopover(false);
      setPasteText('');
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) addData(text);
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (showPastePopover) {
      pasteInputRef.current?.focus();
    }
  }, [showPastePopover]);

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center z-10"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Pulse ring */}
      <div className="relative mb-8">
        <div className="absolute inset-0 w-24 h-24 rounded-full bg-indigo-500/10 pulse-ring" />
        <div className="absolute inset-2 w-20 h-20 rounded-full bg-indigo-500/5 pulse-ring" style={{ animationDelay: '0.5s' }} />
        <motion.div
          className="relative w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center backdrop-blur-xl"
          animate={{ scale: isDragging ? 1.1 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Sparkles className="w-10 h-10 text-indigo-300/80" />
        </motion.div>
      </div>

      {/* Title */}
      <motion.h1
        className="text-4xl font-light text-white/90 tracking-tight mb-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        Spectra
      </motion.h1>

      <motion.p
        className="text-base text-white/40 mb-10 text-center max-w-md"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Paste your data or drop a file. We'll handle the rest.
      </motion.p>

      {/* Action area */}
      <motion.div
        className="flex gap-2 items-center relative"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={() => setShowPastePopover(!showPastePopover)}
          className="px-6 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80 hover:border-white/20 transition-all duration-300 flex items-center gap-2.5 cursor-pointer"
        >
          <ClipboardPaste className="w-4 h-4" />
          Paste data
        </button>

        <span className="text-white/30 text-sm">or</span>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80 hover:border-white/20 transition-all duration-300 flex items-center gap-2.5 cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          Upload file
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.json,.txt"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Paste popover */}
        <AnimatePresence>
          {showPastePopover && (
            <motion.div
              className="absolute bottom-full left-0 mb-3 w-80 glass-card p-3 z-30"
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
      </motion.div>

      {/* Supported formats hint */}
      <motion.p
        className="text-xs text-white/20 mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Supports CSV, TSV, JSON
      </motion.p>

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            className="absolute inset-0 bg-indigo-500/10 backdrop-blur-sm flex items-center justify-center z-20 border-2 border-dashed border-indigo-400/40 rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <Upload className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
              <p className="text-lg text-indigo-200 font-medium">Drop your file here</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
