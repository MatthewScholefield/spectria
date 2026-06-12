import { useRef, useState, useEffect, type DragEvent } from 'react';
import { Upload, Sparkles, Check, Radio } from 'lucide-react';

import { useStore } from '../store/useStore';
import { RunBrowser, connectRun } from './RunBrowser';
import type { SelectedRun } from './RunBrowser';

const LOCAL_DATA_MODE = !!(import.meta.env.VITE_LOCAL_DATA_MODE || import.meta.env.VITE_LOCAL_DATA_URL);
const LOCAL_DATA_URL: string = import.meta.env.VITE_LOCAL_DATA_URL ?? '';

function LocalDataEmptyState() {
  const addSource = useStore((s) => s.addSource);

  const handleConfirm = (runs: SelectedRun[]) => {
    for (const { serverUrl, projectName, runInfo } of runs) {
      addSource(connectRun(serverUrl, projectName, runInfo.run_id, runInfo.baseline, runInfo.config));
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center z-10 px-4 pt-[12vh]">
      <div className="relative mb-8">
        <div className="absolute inset-0 w-24 h-24 rounded-full bg-indigo-500/10 pulse-ring" />
        <div className="absolute inset-2 w-20 h-20 rounded-full bg-indigo-500/5 pulse-ring" style={{ animationDelay: '0.5s' }} />
        <div
          className="relative w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center backdrop-blur-xl animate-scale-in"
        >
          <Sparkles className="w-10 h-10 text-indigo-300/80" />
        </div>
      </div>

      <h1
        className="text-4xl font-light text-white/90 tracking-tight mb-3 opacity-0 animate-fade-in"
        style={{ animationDelay: '100ms' }}
      >
        Spectria
      </h1>

      <p
        className="text-base text-white/40 mb-6 text-center max-w-md shrink-0 opacity-0 animate-fade-in"
        style={{ animationDelay: '200ms' }}
      >
        Select runs to visualize
      </p>

      <div
        className="w-full max-w-md flex-1 min-h-0 overflow-hidden opacity-0 animate-fade-in"
        style={{ animationDelay: '300ms' }}
      >
        <div className="glass-card h-full flex flex-col overflow-hidden">
          <RunBrowser
            serverUrl={LOCAL_DATA_URL}
            multiSelect
            onConfirm={handleConfirm}
            title="Browse Runs"
            subtitle="Select runs to visualize"
            hideServerInput
            autoFetch
            className="flex-1 min-h-0"
          />
        </div>
      </div>
    </div>
  );
}

function DefaultEmptyState() {
  const addData = useStore((s) => s.addData);
  const setShowConnectModal = useStore((s) => s.setShowConnectModal);
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
        <div
          className="relative w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center backdrop-blur-xl animate-scale-in"
          style={{ transform: isDragging ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.3s ease' }}
        >
          <Sparkles className="w-10 h-10 text-indigo-300/80" />
        </div>
      </div>

      {/* Title */}
      <h1
        className="text-4xl font-light text-white/90 tracking-tight mb-3 opacity-0 animate-fade-in"
        style={{ animationDelay: '100ms' }}
      >
        Spectria
      </h1>

      <p
        className="text-base text-white/40 mb-10 text-center max-w-md opacity-0 animate-fade-in"
        style={{ animationDelay: '200ms' }}
      >
        Paste your data or drop a file. We'll handle the rest.
      </p>

      {/* Action area */}
      <div
        className="flex gap-2 items-center relative opacity-0 animate-fade-in"
        style={{ animationDelay: '300ms' }}
      >
        <span
          role="button"
          tabIndex={0}
          onClick={() => setShowPastePopover(!showPastePopover)}
          onKeyDown={(e) => { if (e.key === 'Enter') setShowPastePopover(!showPastePopover); }}
          className="text-sm font-semibold text-white/60 hover:text-indigo-300 transition-colors duration-200 cursor-pointer select-none"
        >
          Paste data
        </span>

        <span className="text-white/30 text-sm">or</span>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80 hover:border-white/20 transition-all duration-300 flex items-center gap-2.5 cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          Upload file
        </button>

        <span className="text-white/30 text-sm">or</span>

        <button
          onClick={() => setShowConnectModal(true)}
          className="px-6 py-3 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80 hover:border-white/20 transition-all duration-300 flex items-center gap-2.5 cursor-pointer"
        >
          <Radio className="w-4 h-4" />
          Live source
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.json,.txt"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Paste popover */}
        {showPastePopover && (
          <div
            className="absolute bottom-full left-0 mb-3 w-80 glass-card p-3 z-30 bg-[rgba(15,15,35,0.85)] animate-scale-in"
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
                className="w-full h-32 text-xs bg-white/5 border border-white/10 rounded-lg p-2 text-white/90 placeholder:text-white/35 resize-none focus:outline-none focus:border-indigo-500/40 transition-colors"
              />
          </div>
        )}
      </div>

      {/* Supported formats hint */}
      <p
        className="text-xs text-white/20 mt-8 opacity-0 animate-fade-in"
        style={{ animationDelay: '500ms' }}
      >
        Supports CSV, TSV, JSON
      </p>

      {/* Drag overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 bg-indigo-500/10 backdrop-blur-sm flex items-center justify-center z-20 border-2 border-dashed border-indigo-400/40 rounded-2xl animate-fade-in"
        >
          <div className="text-center">
            <Upload className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
            <p className="text-lg text-indigo-200 font-medium">Drop your file here</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function EmptyState() {
  if (LOCAL_DATA_MODE) {
    return <LocalDataEmptyState />;
  }
  return <DefaultEmptyState />;
}
