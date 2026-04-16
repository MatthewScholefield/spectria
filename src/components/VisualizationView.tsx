import { useStore } from '../store/useStore';
import { ChartCard } from './ChartCard';

export function VisualizationView() {
  const charts = useStore((s) => s.charts);
  const gridColumns = useStore((s) => s.gridColumns);

  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }[gridColumns];

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className={`grid ${gridClass} gap-5 auto-rows-min`}>
        {charts.map((chart, i) => (
          <ChartCard key={chart.id} chart={chart} index={i} />
        ))}
      </div>
    </div>
  );
}
