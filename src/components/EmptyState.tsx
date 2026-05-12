import { useRef, useState, useEffect, type DragEvent } from 'react';
import { Upload, Sparkles, Check, Radio, Loader2, FolderOpen, Plus, ChevronDown, GitFork, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { connectRun } from '../hooks/useStreamSource';
import { fetchProjects } from '../sources/keras/api';
import { timeAgo } from '../utils/format';
import type { ProjectInfo, RunInfo } from '../sources/keras/types';

const LOCAL_DATA_MODE = !!(import.meta.env.VITE_LOCAL_DATA_MODE || import.meta.env.VITE_LOCAL_DATA_URL);
const LOCAL_DATA_URL: string = import.meta.env.VITE_LOCAL_DATA_URL ?? '';

function LocalDataEmptyState() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [runsByProject, setRunsByProject] = useState<Record<string, RunInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const addSource = useStore((s) => s.addSource);
  const sources = useStore((s) => s.sources);

  useEffect(() => {
    setError(null);
    fetchProjects(LOCAL_DATA_URL)
      .then(setProjects)
      .catch((e) => {
        console.error('Failed to fetch local projects', e);
        setError(e instanceof Error ? e.message : 'Failed to load training logs');
        setProjects([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleExpandProject = async (projectName: string) => {
    if (expandedProject === projectName) {
      setExpandedProject(null);
      return;
    }
    setExpandedProject(projectName);
    if (!runsByProject[projectName]) {
      setLoadingRuns(projectName);
      try {
        const res = await fetch(`${LOCAL_DATA_URL}/api/projects/${encodeURIComponent(projectName)}/runs`);
        const runs = await res.json();
        setRunsByProject((prev) => ({ ...prev, [projectName]: runs }));
      } catch (e) {
        console.error(`Failed to fetch runs for ${projectName}`, e);
        setRunsByProject((prev) => ({ ...prev, [projectName]: [] }));
      }
      setLoadingRuns(null);
    }
  };

  const handleRunClick = (projectName: string, run: RunInfo) => {
    const alreadyConnected = sources.some(
      (s) => s.serverUrl === LOCAL_DATA_URL && s.projectName === projectName && s.runId === run.run_id,
    );
    if (alreadyConnected) return;
    addSource(connectRun(LOCAL_DATA_URL, projectName, run.run_id, run.baseline, run.config));
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center z-10 px-4 pt-[12vh]">
      <div className="relative mb-8">
        <div className="absolute inset-0 w-24 h-24 rounded-full bg-indigo-500/10 pulse-ring" />
        <div className="absolute inset-2 w-20 h-20 rounded-full bg-indigo-500/5 pulse-ring" style={{ animationDelay: '0.5s' }} />
        <motion.div
          className="relative w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center backdrop-blur-xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Sparkles className="w-10 h-10 text-indigo-300/80" />
        </motion.div>
      </div>

      <motion.h1
        className="text-4xl font-light text-white/90 tracking-tight mb-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        Spectria
      </motion.h1>

      <motion.p
        className="text-base text-white/40 mb-8 text-center max-w-md shrink-0"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {loading ? 'Loading...' : error ? 'Unable to load training logs' : projects.length === 0 ? 'No training logs found' : 'Select a run to visualize'}
      </motion.p>

      {loading ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
        </motion.div>
      ) : error ? (
        <motion.div
          className="flex items-center gap-2 text-xs text-red-300/80 bg-red-500/10 rounded-lg px-3 py-2 max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </motion.div>
      ) : projects.length === 0 ? (
        <motion.p
          className="text-xs text-white/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Place your logs in the logdir and restart the server
        </motion.p>
      ) : (
        <motion.div
          className="w-full max-w-md space-y-2 overflow-y-auto flex-1 min-h-0 pb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {projects.map((project) => (
            <div key={project.name} className="rounded-xl bg-white/5 border border-white/8 overflow-hidden">
              <button
                onClick={() => handleExpandProject(project.name)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-indigo-300/60 shrink-0" />
                <span className="flex-1 text-sm text-white/70">{project.name}</span>
                <span className="text-xs text-white/25">{project.run_count} runs</span>
                <ChevronDown className={`w-4 h-4 text-white/20 transition-transform ${expandedProject === project.name ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {expandedProject === project.name && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-1">
                      {loadingRuns === project.name ? (
                        <div className="flex justify-center py-3">
                          <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
                        </div>
                      ) : [...(runsByProject[project.name] || [])]
                        .sort((a, b) => (b.finished_at ?? 0) - (a.finished_at ?? 0))
                        .map((run) => {
                        const connected = sources.some(
                          (s) => s.serverUrl === LOCAL_DATA_URL && s.projectName === project.name && s.runId === run.run_id,
                        );
                        return (
                          <div key={run.run_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${run.status === 'running' ? 'bg-green-400' : connected ? 'bg-blue-400' : 'bg-white/20'}`} />
                            <span className="flex-1 text-xs text-white/60 truncate">{run.run_id}</span>
                            {run.baseline && <span className="text-[10px] text-white/25 flex items-center gap-0.5"><GitFork className="w-2.5 h-2.5" />{run.baseline}</span>}
                            <span className="text-[10px] text-white/25 uppercase">
                              {run.status === 'running' ? 'running' : timeAgo(run.finished_at)}
                            </span>
                            <button
                              onClick={() => handleRunClick(project.name, run)}
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                connected ? 'text-blue-400/50' : 'text-white/30 hover:text-white/60 hover:bg-white/10'
                              }`}
                              disabled={connected}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      )}
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
        Spectria
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
        <AnimatePresence>
          {showPastePopover && (
            <motion.div
              className="absolute bottom-full left-0 mb-3 w-80 glass-card p-3 z-30 bg-[rgba(15,15,35,0.85)]"
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
                className="w-full h-32 text-xs bg-white/5 border border-white/10 rounded-lg p-2 text-white/90 placeholder:text-white/35 resize-none focus:outline-none focus:border-indigo-500/40 transition-colors"
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

export function EmptyState() {
  if (LOCAL_DATA_MODE) {
    return <LocalDataEmptyState />;
  }
  return <DefaultEmptyState />;
}
