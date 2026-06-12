import { useState, useCallback, useEffect } from 'react';

import {
  FolderOpen, Plus, Loader2, AlertCircle, Check, GitFork,
  ArrowRight, X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { connectRun } from '../hooks/useStreamSource';
import { fetchProjects, fetchRuns } from '../sources/keras/api';
import { timeAgo } from '../utils/format';
import type { RunInfo, ProjectInfo } from '../sources/keras/types';

interface SelectedRun {
  serverUrl: string;
  projectName: string;
  runInfo: RunInfo;
}

interface RunBrowserProps {
  serverUrl: string;
  /** If true, multi-select is enabled with a confirm button. If false, each click immediately adds the source. */
  multiSelect?: boolean;
  /** Called when the user confirms multi-select. If multiSelect is false, this is never called. */
  onConfirm?: (runs: SelectedRun[]) => void;
  /** Called when a run is immediately added (single-select mode). */
  onAdd?: (run: SelectedRun) => void;
  /** If provided, shows a close button in the header. */
  onClose?: () => void;
  /** Title override. */
  title?: string;
  /** Subtitle override. */
  subtitle?: string;
  /** Auto-fetch projects on mount (default: true). */
  autoFetch?: boolean;
  /** Additional CSS class for the outer container. */
  className?: string;
  /** If true, hides the server URL input (for local data mode). */
  hideServerInput?: boolean;
  /** If provided, renders the info panel content for non-local modes. */
  infoContent?: React.ReactNode;
}

function groupRuns(runs: RunInfo[]) {
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

  const result: Array<{ groupKey: string; baseline: string | null; runs: RunInfo[] }> = [];
  for (const root of roots) {
    result.push({
      groupKey: root.run_id,
      baseline: null,
      runs: [root, ...(groups.get(root.run_id) ?? [])],
    });
    groups.delete(root.run_id);
  }
  for (const [baseline, orphanRuns] of groups) {
    result.push({ groupKey: baseline, baseline, runs: orphanRuns });
  }

  result.sort((a, b) => {
    const bestA = Math.max(...a.runs.map((r) => r.finished_at ?? 0));
    const bestB = Math.max(...b.runs.map((r) => r.finished_at ?? 0));
    return bestB - bestA;
  });

  return result;
}

export type { SelectedRun };
export { connectRun };

export function RunBrowser({
  serverUrl: initialServerUrl,
  multiSelect = false,
  onConfirm,
  onAdd,
  onClose,
  title,
  subtitle,
  autoFetch = true,
  className = '',
  hideServerInput = false,
  infoContent,
}: RunBrowserProps) {
  const sources = useStore((s) => s.sources);
  const addSource = useStore((s) => s.addSource);

  const [serverUrl, setServerUrl] = useState(initialServerUrl);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (autoFetch) {
      handleFetchProjects();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedProject(null);
    setRuns([]);
    setSelected(new Set());
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
    setSearch('');
    setSelected(new Set());
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

  const getExistingSource = useCallback(
    (projectName: string, runId: string) =>
      sources.find(
        (s) => s.serverUrl === serverUrl && s.projectName === projectName && s.runId === runId,
      ),
    [sources, serverUrl],
  );

  const toggleRun = useCallback(
    (projectName: string, runInfo: RunInfo) => {
      if (multiSelect) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(runInfo.run_id)) {
            next.delete(runInfo.run_id);
          } else {
            next.add(runInfo.run_id);
          }
          return next;
        });
      } else {
        const selectedRun: SelectedRun = { serverUrl, projectName, runInfo };
        if (onAdd) {
          onAdd(selectedRun);
        } else {
          addSource(connectRun(serverUrl, projectName, runInfo.run_id, runInfo.baseline, runInfo.config));
        }
      }
    },
    [multiSelect, serverUrl, onAdd, addSource],
  );

  const handleConfirm = useCallback(() => {
    if (!onConfirm || !selectedProject) return;
    const selectedRuns = runs
      .filter((r) => selected.has(r.run_id))
      .map((runInfo) => ({ serverUrl, projectName: selectedProject, runInfo }));
    onConfirm(selectedRuns);
    setSelected(new Set());
  }, [onConfirm, selected, runs, serverUrl, selectedProject]);

  const getStatusDot = useCallback(
    (projectName: string, runInfo: RunInfo) => {
      const existing = getExistingSource(projectName, runInfo.run_id);
      return existing?.status === 'live' ? 'bg-green-400'
        : existing?.status === 'connecting' ? 'bg-yellow-400'
        : existing?.status === 'completed' ? 'bg-blue-400'
        : existing?.status === 'error' ? 'bg-red-400'
        : runInfo.status === 'running' ? 'bg-green-400'
        : 'bg-white/20';
    },
    [getExistingSource],
  );

  const getStatusLabel = useCallback(
    (projectName: string, runInfo: RunInfo) => {
      const existing = getExistingSource(projectName, runInfo.run_id);
      if (existing) {
        return (
          <span className="text-[10px] text-white/30 capitalize flex items-center gap-1">
            {existing.status === 'live' && <Check className="w-3 h-3 text-green-400" />}
            {existing.status}
          </span>
        );
      }
      return (
        <span className="text-[10px] text-white/25 uppercase">
          {runInfo.status === 'running' ? 'running' : timeAgo(runInfo.finished_at)}
        </span>
      );
    },
    [getExistingSource],
  );

  const groupedRuns = groupRuns(runs);

  const selectedCount = selected.size;

  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      {/* Header */}
      {(title || subtitle || onClose) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            {title && <h2 className="text-sm font-medium text-white/80">{title}</h2>}
            {subtitle && <p className="text-[11px] text-white/30 mt-0.5">{subtitle}</p>}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info content */}
        {infoContent}

        {/* Server URL (hidden when hideServerInput) */}
        {!hideServerInput && (
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">
              Server URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => {
                  setServerUrl(e.target.value);
                  setProjects([]);
                  setSelectedProject(null);
                  setRuns([]);
                  setSelected(new Set());
                }}
                className="flex-1 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 placeholder:text-white/25 focus:outline-none focus:border-indigo-500/40"
                placeholder="http://localhost:8420"
              />
              <button
                onClick={handleFetchProjects}
                disabled={loading || !serverUrl}
                className="px-3 py-2 rounded-lg bg-indigo-500/20 border border-indigo-400/20 text-xs text-indigo-200 hover:bg-indigo-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
              >
                {loading && !projects.length ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Connect
              </button>
            </div>
          </div>
        )}

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

        {/* Search */}
        {runs.length > 0 && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter runs…"
            className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 placeholder:text-white/25 focus:outline-none focus:border-indigo-500/40"
          />
        )}

        {/* Runs */}
        {loading && selectedProject && runs.length === 0 && (
          <div className="flex items-center justify-center py-4 text-white/30">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}

        {groupedRuns
          .map((group) => ({
            ...group,
            runs: group.runs.filter((run) =>
              run.run_id.toLowerCase().includes(debouncedSearch.toLowerCase()),
            ),
          }))
          .filter((group) => group.runs.length > 0)
          .map((group) => (
            <div key={group.groupKey}>
              {group.baseline && (
                <p className="text-[10px] text-white/25 mb-1 ml-1 flex items-center gap-0.5">
                  <GitFork className="w-2.5 h-2.5" />{group.baseline}
                </p>
              )}
              <div className="space-y-1">
                {group.runs.map((run) => {
                  const existing = getExistingSource(selectedProject!, run.run_id);
                  const isSelected = selected.has(run.run_id);
                  const alreadyConnected = !!existing;

                  return (
                    <button
                      key={run.run_id}
                      onClick={() => toggleRun(selectedProject!, run)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-500/15 ring-1 ring-indigo-400/30'
                          : alreadyConnected
                            ? 'bg-white/[0.03]'
                            : 'bg-white/5 hover:bg-white/8'
                      }`}
                    >
                      {existing && <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusDot(selectedProject!, run)}`} />}
                      <span className="flex-1 text-xs text-white/70 truncate" title={run.run_id}>{run.run_id}</span>
                      {run.baseline && (
                        <span className="text-[10px] text-white/30 flex items-center gap-0.5"><GitFork className="w-2.5 h-2.5" />{run.baseline}</span>
                      )}
                      {getStatusLabel(selectedProject!, run)}
                      {multiSelect ? (
                        <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-indigo-500/40 text-indigo-200'
                            : alreadyConnected
                              ? 'text-blue-400/50'
                              : 'bg-white/5 text-white/30 hover:text-white/60'
                        }`}>
                          {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        </span>
                      ) : !alreadyConnected ? (
                        <span className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors">
                          <Plus className="w-3 h-3" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {/* Confirm bar (multi-select mode) */}
      {multiSelect && selectedCount > 0 && (
        <div
          className="flex items-center justify-between px-5 py-3 border-t border-white/5 bg-white/[0.02] animate-fade-in"
        >
          <span className="text-xs text-white/50">
            {selectedCount} run{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/25 border border-indigo-400/25 text-xs font-medium text-indigo-200 hover:bg-indigo-500/35 transition-all cursor-pointer"
          >
            Continue
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
