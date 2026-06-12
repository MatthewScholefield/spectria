import { useStore } from '../store/useStore';
import { useStreamSource } from '../hooks/useStreamSource';

function SourceConnection({ sourceId }: { sourceId: string }) {
  const source = useStore((s) => s.sources.find((src) => src.id === sourceId) ?? null);
  useStreamSource(source);
  return null;
}

export function StreamManager() {
  const sourceIds = useStore((s) => s.sources.map((src) => src.id));
  return (
    <>
      {sourceIds.map((id) => (
        <SourceConnection key={id} sourceId={id} />
      ))}
    </>
  );
}
