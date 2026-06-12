import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { ChartCard } from './ChartCard';
import { ChartToolbar } from './ChartToolbar';

export function VisualizationView() {
  const charts = useStore((s) => s.charts);
  const gridColumns = useStore((s) => s.gridColumns);

  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }[gridColumns];

  const chartCards = useMemo(
    () => charts.map((chart, i) => <ChartCard key={chart.id} chart={chart} index={i} />),
    [charts],
  );

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      <ChartToolbar />
      <div className="flex-1 p-6">
        <div className={`grid ${gridClass} gap-5 items-start`}>
          {chartCards}
        </div>
      </div>
    </div>
  );
}
