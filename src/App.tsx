import { useStore } from './store/useStore';
import { useGlobalPaste } from './hooks/useGlobalPaste';
import { AnimatedBackground } from './components/AnimatedBackground';
import { EmptyState } from './components/EmptyState';
import { VisualizationView } from './components/VisualizationView';
import { Toolbar } from './components/Toolbar';
import { DataInputModal } from './components/DataInputModal';

export default function App() {
  const datasets = useStore((s) => s.datasets);
  const hasData = datasets.length > 0;

  useGlobalPaste();

  return (
    <div className="relative w-full h-full">
      <AnimatedBackground dimmed={hasData} />

      {hasData ? (
        <div className="relative z-10 flex flex-col h-full">
          <Toolbar />
          <VisualizationView />
        </div>
      ) : (
        <EmptyState />
      )}

      <DataInputModal />
    </div>
  );
}
