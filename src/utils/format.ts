import type { ChartValueUnit, Dataset, DatasetOrigin } from '../engine/types';

export function formatNumber(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) < 1_000_000) {
    return value.toLocaleString();
  }
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (Math.abs(value) < 0.001 && value !== 0) {
    return value.toExponential(2);
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function formatChartValue(value: number, unit: ChartValueUnit): string {
  const formatted = formatNumber(value);
  const suffixes: Partial<Record<ChartValueUnit, string>> = {
    percentage: '%',
    seconds: 's',
    milliseconds: 'ms',
    minutes: 'min',
    hours: 'hr',
    bytes: 'B',
    kilobytes: 'KB',
    megabytes: 'MB',
    gigabytes: 'GB',
    dollars: '$',
  };

  if (unit === 'number' || unit === 'count') {
    return formatted;
  }
  if (unit === 'percentage') {
    return `${formatted}%`;
  }
  if (unit === 'dollars') {
    return `$${formatted}`;
  }
  if (unit.startsWith('custom:')) {
    const customUnit = unit.slice('custom:'.length).trim();
    return customUnit ? `${formatted} ${customUnit}` : formatted;
  }
  return `${formatted}${suffixes[unit] ? ` ${suffixes[unit]}` : ''}`;
}

export function createTickFormatter(
  domain: [number, number],
): (value: number) => string {
  const range = Math.abs(domain[1] - domain[0]);
  if (range === 0) return (v: number) => v.toLocaleString();

  const tickStep = range / 5;
  const min = Math.min(domain[0], domain[1]);
  const max = Math.max(domain[0], domain[1]);

  let precision = Math.max(0, Math.ceil(-Math.log10(tickStep)));

  // Simulate the actual tick positions Recharts would use (~5 evenly spaced)
  const simTicks: number[] = [];
  for (let i = 0; i <= 5; i++) {
    simTicks.push(min + i * (max - min) / 5);
  }

  // Bump precision only if the actual tick positions collide
  while (precision <= 6) {
    const formatted = simTicks.map(t => t.toFixed(precision));
    if (new Set(formatted).size === formatted.length) break;
    precision++;
  }

  return (value: number) => {
    const rounded = parseFloat(value.toFixed(precision));
    if (rounded === 0) return '0';
    return rounded.toLocaleString(undefined, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  };
}

export function timeAgo(epoch: number | null): string {
  if (!epoch) return 'completed';
  const seconds = Math.floor(Date.now() / 1000) - epoch;
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateDatasetName(existingCount: number): string {
  return `Dataset ${existingCount + 1}`;
}

export function parseRunPath(runId: string): string[] {
  return runId.split(':');
}

export function getFullName(origin: DatasetOrigin): string {
  if (origin.kind === 'manual') return origin.label;
  const path = origin.path.join(':');
  return `${origin.project} / ${path}`;
}

export function computeDisplayNames(datasets: Dataset[]): {
  sharedPrefix: string;
  displayNames: Map<string, string>;
} {
  const displayNames = new Map<string, string>();

  const runDatasets = datasets.filter(
    (d) => d.origin.kind === 'run' && !d.customName,
  );

  for (const ds of datasets) {
    if (ds.customName) {
      displayNames.set(ds.id, ds.customName);
    } else if (ds.origin.kind === 'manual') {
      displayNames.set(ds.id, ds.origin.label);
    }
    // run datasets handled below
  }

  if (runDatasets.length === 0) {
    return { sharedPrefix: '', displayNames };
  }

  // Build hierarchies: [project, ...path]
  const hierarchies = runDatasets.map((d) => {
    const o = d.origin as Extract<DatasetOrigin, { kind: 'run' }>;
    return [o.project, ...o.path];
  });

  // Find longest common prefix, capped so at least one part remains as suffix
  const minLen = Math.min(...hierarchies.map((h) => h.length));
  let prefixLen = 0;
  for (let i = 0; i < minLen - 1; i++) {
    const part = hierarchies[0][i];
    if (hierarchies.every((h) => h[i] === part)) {
      prefixLen++;
    } else {
      break;
    }
  }

  // Format the shared prefix
  let sharedPrefix = '';
  if (prefixLen > 0) {
    const prefixParts = hierarchies[0].slice(0, prefixLen);
    if (prefixLen === 1) {
      sharedPrefix = prefixParts[0];
    } else {
      const project = prefixParts[0];
      const rest = prefixParts.slice(1).join(':');
      sharedPrefix = `${project} / ${rest}`;
    }
  }

  // Compute display names — suffix after prefix (always at least one part)
  for (let i = 0; i < runDatasets.length; i++) {
    const ds = runDatasets[i];
    const suffix = hierarchies[i].slice(prefixLen);
    displayNames.set(ds.id, suffix.join(':'));
  }

  return { sharedPrefix, displayNames };
}
