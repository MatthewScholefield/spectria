import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { rowToValues, createTableFromHeaders } from '../engine/stream-adapter';
import type { StreamSource, DatasetOrigin } from '../engine/types';
import { generateId, parseRunPath } from '../utils/format';

export function useStreamSource(source: StreamSource | null) {
  const addDatasetFromTable = useStore((s) => s.addDatasetFromTable);
  const appendRowsToDataset = useStore((s) => s.appendRowsToDataset);
  const updateSourceStatus = useStore((s) => s.updateSourceStatus);

  useEffect(() => {
    if (!source || source.status === 'completed' || source.status === 'error') return;

    const sseUrl = `${source.serverUrl}/api/projects/${encodeURIComponent(source.projectName)}/runs/${encodeURIComponent(source.runId)}/events`;
    const origin: DatasetOrigin = { kind: 'run', project: source.projectName, path: parseRunPath(source.runId) };

    let cancelled = false;
    let datasetId: string | null = null;

    updateSourceStatus(source.id, 'connecting');

    const es = new EventSource(sseUrl);

    es.addEventListener('status', (e: MessageEvent) => {
      if (cancelled) return;
      try {
        const { status } = JSON.parse(e.data);
        if (status === 'running') {
          updateSourceStatus(source.id, 'live');
        }
      } catch { /* ignore malformed */ }
    });

    es.addEventListener('row', (e: MessageEvent) => {
      if (cancelled) return;
      try {
        const row = JSON.parse(e.data);
        const values = rowToValues(row);

        if (!datasetId) {
          const headers = Array.from(values.keys());
          const table = createTableFromHeaders(headers);
          for (const col of table.columns) {
            col.values.push(values.get(col.key) ?? null);
          }
          table.rowCount = 1;
          datasetId = addDatasetFromTable(table, origin, source.id);
        } else {
          appendRowsToDataset(datasetId, [row]);
        }
      } catch { /* ignore malformed */ }
    });

    es.addEventListener('complete', () => {
      if (cancelled) return;
      updateSourceStatus(source.id, 'completed');
      es.close();
    });

    es.onerror = () => {
      if (cancelled) return;
      if (es.readyState === EventSource.CLOSED) {
        updateSourceStatus(source.id, 'error');
      }
    };

    return () => {
      cancelled = true;
      es.close();
    };
  }, [source?.id, source?.serverUrl, source?.projectName, source?.runId]);
}

export function useAllStreamSources() {
  const sources = useStore((s) => s.sources);
  const activeSources = sources.filter(
    (s) => s.status === 'connecting' || s.status === 'live'
  );
  return activeSources;
}

// Standalone function to connect a source (used by ConnectSourceModal)
export function connectRun(
  serverUrl: string,
  projectName: string,
  runId: string,
  baseline?: string,
  runConfig?: Record<string, unknown>,
): StreamSource {
  return {
    id: generateId(),
    kind: 'stream',
    name: `${projectName} / ${runId}`,
    serverUrl,
    projectName,
    runId,
    baseline,
    status: 'idle',
    runConfig,
  };
}
