
import { Info, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store/useStore';
import { RunBrowser, connectRun } from './RunBrowser';
import type { SelectedRun } from './RunBrowser';

const LOCAL_DATA_MODE = !!(import.meta.env.VITE_LOCAL_DATA_MODE || import.meta.env.VITE_LOCAL_DATA_URL);
const LOCAL_DATA_URL: string = import.meta.env.VITE_LOCAL_DATA_URL ?? '';

function SupportedSourcesInfo() {
  const [showInfo, setShowInfo] = useState(false);

  return (
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
      {showInfo && (
        <div
          className="overflow-hidden animate-fade-in"
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
                href="https://github.com/MatthewScholefield/spectria#live-data-sources"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-indigo-300/60 hover:text-indigo-300/90 underline underline-offset-2 transition-colors"
              >
                View full documentation on GitHub
              </a>
            </div>
        </div>
      )}
    </div>
  );
}

export function ConnectSourceModal() {
  const showConnectModal = useStore((s) => s.showConnectModal);
  const setShowConnectModal = useStore((s) => s.setShowConnectModal);
  const addSource = useStore((s) => s.addSource);

  const handleConfirm = (runs: SelectedRun[]) => {
    for (const { serverUrl, projectName, runInfo } of runs) {
      addSource(connectRun(serverUrl, projectName, runInfo.run_id, runInfo.baseline, runInfo.config));
    }
    setShowConnectModal(false);
  };

  return (
    <>
      {showConnectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowConnectModal(false)}
        >
          <div
            className="glass-card w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <RunBrowser
              serverUrl={LOCAL_DATA_MODE ? LOCAL_DATA_URL : 'http://localhost:8420'}
              multiSelect
              onConfirm={handleConfirm}
              onClose={() => setShowConnectModal(false)}
              title={LOCAL_DATA_MODE ? 'Browse Runs' : 'Connect Live Source'}
              subtitle={LOCAL_DATA_MODE ? 'Select runs to visualize' : 'Stream training metrics from a live server in real time'}
              hideServerInput={LOCAL_DATA_MODE}
              autoFetch={LOCAL_DATA_MODE}
              infoContent={!LOCAL_DATA_MODE ? <SupportedSourcesInfo /> : undefined}
            />
          </div>
        </div>
      )}
    </>
  );
}
