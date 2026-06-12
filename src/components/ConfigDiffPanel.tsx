
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';

function flattenConfig(obj: Record<string, unknown>, prefix = ''): Map<string, unknown> {
  const result = new Map<string, unknown>();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [k, v] of flattenConfig(value as Record<string, unknown>, fullKey)) {
        result.set(k, v);
      }
    } else {
      result.set(fullKey, value);
    }
  }
  return result;
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export function ConfigDiffPanel() {
  const showConfigDiff = useStore((s) => s.showConfigDiff);
  const setShowConfigDiff = useStore((s) => s.setShowConfigDiff);
  const sources = useStore((s) => s.sources);

  const sourcesWithConfig = sources.filter((s) => s.runConfig);

  if (sourcesWithConfig.length < 2) return null;

  // Flatten all configs and collect all keys
  const flatConfigs = sourcesWithConfig.map((s) => ({
    name: s.runId,
    flat: flattenConfig(s.runConfig!),
  }));

  const allKeys = new Set<string>();
  for (const { flat } of flatConfigs) {
    for (const key of flat.keys()) {
      allKeys.add(key);
    }
  }
  const sortedKeys = Array.from(allKeys).sort();

  // Determine which values differ
  function isDiff(key: string): boolean {
    const values = new Set<string>();
    for (const { flat } of flatConfigs) {
      values.add(formatValue(flat.get(key)));
    }
    return values.size > 1;
  }

  return (
    <>
      {showConfigDiff && (
        <div
          className="fixed right-0 top-0 bottom-0 w-96 z-40 glass-card border-l border-white/10 overflow-y-auto animate-slide-right"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 sticky top-0 bg-[#0a0a1a]/90 backdrop-blur-xl z-10">
            <h3 className="text-xs font-medium text-white/70 uppercase tracking-wider">Config Diff</h3>
            <button
              onClick={() => setShowConfigDiff(false)}
              className="p-1 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Table */}
          <div className="p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/30">
                  <th className="text-left py-1.5 pr-2 font-normal sticky top-11 bg-[#0a0a1a]/90">Key</th>
                  {flatConfigs.map(({ name }) => (
                    <th key={name} className="text-right py-1.5 px-1.5 font-normal whitespace-nowrap sticky top-11 bg-[#0a0a1a]/90">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedKeys.map((key) => {
                  const diff = isDiff(key);
                  return (
                    <tr key={key} className="border-t border-white/5">
                      <td className="py-1.5 pr-2 text-white/40 font-mono text-[11px]">{key}</td>
                      {flatConfigs.map(({ name, flat }) => (
                        <td
                          key={name}
                          className={`py-1.5 px-1.5 text-right text-[11px] ${
                            diff ? 'text-indigo-300' : 'text-white/25'
                          }`}
                        >
                          {formatValue(flat.get(key))}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
