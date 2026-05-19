import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { rowToValues, createTableFromHeaders } from '../engine/stream-adapter';
import type { StreamSource, DatasetOrigin, DataTable } from '../engine/types';
import { generateId, parseRunPath } from '../utils/format';

function createTableFromRows(rows: Record<string, unknown>[]): DataTable {
  const headers: string[] = [];
  const seen = new Set<string>();
  const rowValues = rows.map((row) => rowToValues(row));

  for (const values of rowValues) {
    for (const key of values.keys()) {
      if (seen.has(key)) continue;
      seen.add(key);
      headers.push(key);
    }
  }

  const table = createTableFromHeaders(headers);
  for (const values of rowValues) {
    for (const column of table.columns) {
      column.values.push(values.get(column.key) ?? null);
    }
  }

  table.rowCount = rows.length;
  return table;
}

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
    let rafId: number | null = null;
    const pendingRows: Record<string, unknown>[] = [];

    const flushPendingRows = () => {
      if (pendingRows.length === 0) return;
      const batch = pendingRows.splice(0, pendingRows.length);

      if (!datasetId) {
        datasetId = addDatasetFromTable(createTableFromRows(batch), origin, source.id);
      } else {
        appendRowsToDataset(datasetId, batch);
      }
    };

    const scheduleFlush = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (cancelled) return;
        flushPendingRows();
      });
    };

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
        pendingRows.push(JSON.parse(e.data));
        scheduleFlush();
      } catch { /* ignore malformed */ }
    });

    es.addEventListener('complete', () => {
      if (cancelled) return;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      flushPendingRows();
      updateSourceStatus(source.id, 'completed');
      es.close();
    });

    es.onerror = () => {
      if (cancelled) return;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      flushPendingRows();
      if (es.readyState === EventSource.CLOSED) {
        updateSourceStatus(source.id, 'error');
      }
    };

    return () => {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      const sourceStillRegistered = useStore.getState().sources.some((s) => s.id === source.id);
      if (datasetId || sourceStillRegistered) {
        flushPendingRows();
      } else {
        pendingRows.length = 0;
      }

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
