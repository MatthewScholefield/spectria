import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Server, FolderOpen, Play, Loader2, AlertCircle, Check, Info, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { fetchProjects, fetchRuns } from '../sources/keras/api';
import { connectRun } from '../hooks/useStreamSource';
import type { RunInfo, ProjectInfo } from '../sources/keras/types';

function RunRow({ serverUrl, projectName, runInfo }: {
  serverUrl: string;
  projectName: string;
  runInfo: RunInfo;
}) {
  const sources = useStore((s) => s.sources);
  const addSource = useStore((s) => s.addSource);
  const existing = sources.find(
    (s) => s.serverUrl === serverUrl && s.projectName === projectName && s.runId === runInfo.run_id
  );

  const statusDot = existing?.status === 'live' ? 'bg-green-400'
    : existing?.status === 'connecting' ? 'bg-yellow-400'
    : existing?.status === 'completed' ? 'bg-blue-400'
    : existing?.status === 'error' ? 'bg-red-400'
    : 'bg-white/20';

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
      {existing && <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />}
      <span className="flex-1 text-xs text-white/70 truncate">{runInfo.run_id}</span>
      {runInfo.baseline && (
        <span className="text-[10px] text-white/30">baseline: {runInfo.baseline}</span>
      )}
      <span className="text-[10px] text-white/25 uppercase">{runInfo.status}</span>
      {!existing ? (
        <button
          onClick={() => addSource(connectRun(
            serverUrl, projectName, runInfo.run_id, runInfo.baseline, runInfo.config,
          ))}
          className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors cursor-pointer"
        >
          <Play className="w-3 h-3" />
        </button>
      ) : (
        <span className="text-[10px] text-white/30 capitalize flex items-center gap-1">
          {existing.status === 'live' && <Check className="w-3 h-3 text-green-400" />}
          {existing.status}
        </span>
      )}
    </div>
  );
}

export function ConnectSourceModal() {
  const showConnectModal = useStore((s) => s.showConnectModal);
  const setShowConnectModal = useStore((s) => s.setShowConnectModal);

  const [serverUrl, setServerUrl] = useState('http://localhost:8420');
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const handleFetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedProject(null);
    setRuns([]);
    try {
      const result = await fetchProjects(serverUrl);
      setProjects(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [serverUrl]);

  const handleSelectProject = useCallback(async (projectName: string) => {
    setSelectedProject(projectName);
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRuns(serverUrl, projectName);
      setRuns(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch runs');
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [serverUrl]);

  // Group runs by baseline
  const groupedRuns = (() => {
    if (runs.length === 0) return [];
    const groups = new Map<string, RunInfo[]>();
    const roots: RunInfo[] = [];

    for (const run of runs) {
      if (run.baseline) {
        const group = groups.get(run.baseline) ?? [];
        group.push(run);
        groups.set(run.baseline, group);
      } else {
        roots.push(run);
      }
    }

    const result: Array<{ baseline: string | null; runs: RunInfo[] }> = [];
    for (const root of roots) {
      result.push({
        baseline: null,
        runs: [root, ...(groups.get(root.run_id) ?? [])],
      });
      groups.delete(root.run_id);
    }
    // Orphaned runs (baseline references a run not in this list)
    for (const [baseline, orphanRuns] of groups) {
      result.push({ baseline, runs: orphanRuns });
    }
    return result;
  })();

  return (
    <AnimatePresence>
      {showConnectModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowConnectModal(false)}
        >
          <motion.div
            className="glass-card w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div>
                <h2 className="text-sm font-medium text-white/80">Connect Live Source</h2>
                <p className="text-[11px] text-white/30 mt-0.5">
                  Stream training metrics from a live server in real time
                </p>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Supported sources info */}
              <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3.5 py-3">
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="w-full flex items-center gap-2 text-left cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-indigo-300/60 shrink-0" />
                  <span className="text-[11px] text-white/40 flex-1">
                    Supported: <span className="text-white/60">Keras training metrics servers</span>
                  </span>
                  <ChevronDown className={`w-3 h-3 text-white/20 transition-transform ${showInfo ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showInfo && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-white/5 space-y-2 text-[11px] text-white/35 leading-relaxed">
                        <p>
                          Your server must implement these endpoints:
                        </p>
                        <div className="font-mono text-[10px] space-y-1 bg-black/20 rounded-md px-3 py-2">
                          <p><span className="text-indigo-300/50">GET</span> /api/projects</p>
                          <p><span className="text-indigo-300/50">GET</span> /api/projects/<span className="text-white/25">{'{name}'}</span>/runs</p>
                          <p><span className="text-indigo-300/50">GET</span> /api/projects/<span className="text-white/25">{'{name}'}</span>/runs/<span className="text-white/25">{'{id}'}</span>/data</p>
                          <p><span className="text-green-300/50">SSE</span> /api/projects/<span className="text-white/25">{'{name}'}</span>/runs/<span className="text-white/25">{'{id}'}</span>/events</p>
                        </div>
                        <p>
                          SSE events use type <code className="text-white/50 bg-white/5 px-1 rounded">row</code> with JSON
                          payload (one metric row). Send <code className="text-white/50 bg-white/5 px-1 rounded">complete</code> to end the stream.
                        </p>
                        <a
                          href="https://github.com/matthewscholeman/spectra#live-data-sources"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-indigo-300/60 hover:text-indigo-300/90 underline underline-offset-2 transition-colors"
                        >
                          View full documentation on GitHub
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* Server URL */}
              <div>
                <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">
                  Server URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => { setServerUrl(e.target.value); setProjects([]); setSelectedProject(null); setRuns([]); }}
                    className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 placeholder:text-white/25 focus:outline-none focus:border-indigo-500/40"
                    placeholder="http://localhost:8420"
                  />
                  <button
                    onClick={handleFetchProjects}
                    disabled={loading || !serverUrl}
                    className="px-3 py-2 rounded-lg bg-indigo-500/20 border border-indigo-400/20 text-xs text-indigo-200 hover:bg-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {loading && !projects.length ? <Loader2 className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3" />}
                    Connect
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-300/80 bg-red-500/10 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Projects */}
              {projects.length > 0 && (
                <div>
                  <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">
                    Projects
                  </label>
                  <div className="space-y-1">
                    {projects.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => handleSelectProject(p.name)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all cursor-pointer ${
                          selectedProject === p.name
                            ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/20'
                            : 'bg-white/5 text-white/60 hover:bg-white/8 border border-transparent'
                        }`}
                      >
                        <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1">{p.name}</span>
                        <span className="text-white/25">{p.run_count} runs</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Runs */}
              {loading && selectedProject && runs.length === 0 && (
                <div className="flex items-center justify-center py-4 text-white/30">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}

              {groupedRuns.map((group) => (
                <div key={group.baseline ?? '__root__'}>
                  {group.baseline && (
                    <p className="text-[10px] text-white/25 mb-1 ml-1">
                      baseline: {group.baseline}
                    </p>
                  )}
                  <div className="space-y-1">
                    {group.runs.map((run) => (
                      <RunRow
                        key={run.run_id}
                        serverUrl={serverUrl}
                        projectName={selectedProject!}
                        runInfo={run}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
