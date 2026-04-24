import type { DataTable, ChartConfig, SeriesConfig } from './types';

const PRIMARY_PALETTE = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

const SECONDARY_PALETTE = [
  '#818cf8', '#fb7185', '#34d399', '#fbbf24',
  '#60a5fa', '#a78bfa', '#f472b6', '#2dd4bf',
];

function detectIndexColumn(table: DataTable): string | null {
  if (table.columns.length === 0) return null;

  const first = table.columns[0];

  // Check if first column is monotonically increasing numeric
  if (first.type === 'numeric') {
    const nums = first.values.filter((v) => v !== null) as number[];
    if (nums.length > 1) {
      let monotonic = true;
      for (let i = 1; i < nums.length; i++) {
        if (nums[i] < nums[i - 1]) {
          monotonic = false;
          break;
        }
      }
      if (monotonic) return first.key;
    }
  }

  // Check for datetime column
  const dtCol = table.columns.find((c) => c.type === 'datetime');
  if (dtCol) return dtCol.key;

  return null;
}

function getValueColumns(table: DataTable, indexKey: string | null) {
  return table.columns.filter((c) => {
    if (c.key === indexKey) return false;
    return c.type === 'numeric' || c.type === 'categorical';
  });
}

function getSeriesColor(colIndex: number, datasetIndex: number): string {
  const palette = datasetIndex % 2 === 0 ? PRIMARY_PALETTE : SECONDARY_PALETTE;
  return palette[colIndex % palette.length];
}

export function generateCharts(
  table: DataTable,
  datasetId: string,
  datasetName: string,
  datasetIndex: number
): ChartConfig[] {
  const indexKey = detectIndexColumn(table);
  const valueCols = getValueColumns(table, indexKey);

  if (valueCols.length === 0) return [];

  return valueCols.map((col, i) => {
    const series: SeriesConfig = {
      datasetId,
      columnKey: col.key,
      label: `${datasetName} · ${col.header}`,
      color: getSeriesColor(i, datasetIndex),
      visible: true,
    };

    return {
      id: `chart-${col.key}`,
      title: col.header,
      type: 'line' as const,
      xKey: indexKey ?? '__rowIndex__',
      series: [series],
      yAxisMin: 'auto' as const,
      yAxisMax: 'auto' as const,
      xAxisMin: 'auto' as const,
      xAxisMax: 'auto' as const,
      yScale: 'linear' as const,
      xScale: 'linear' as const,
    };
  });
}

export function mergeDatasetIntoCharts(
  existingCharts: ChartConfig[],
  table: DataTable,
  datasetId: string,
  datasetName: string,
  datasetIndex: number
): ChartConfig[] {
  const indexKey = detectIndexColumn(table);
  const valueCols = getValueColumns(table, indexKey);

  const updatedCharts = existingCharts.map((chart) => ({ ...chart, series: [...chart.series] }));

  for (const col of valueCols) {
    const colIndex = valueCols.indexOf(col);
    const existingChart = updatedCharts.find(
      (c) => c.id === `chart-${col.key}`
    );

    const newSeries: SeriesConfig = {
      datasetId,
      columnKey: col.key,
      label: `${datasetName} · ${col.header}`,
      color: getSeriesColor(colIndex, datasetIndex),
      visible: true,
    };

    if (existingChart) {
      existingChart.series = [...existingChart.series, newSeries];
    } else {
      updatedCharts.push({
        id: `chart-${col.key}`,
        title: col.header,
        type: 'line',
        xKey: indexKey ?? '__rowIndex__',
        series: [newSeries],
        yAxisMin: 'auto',
        yAxisMax: 'auto',
        xAxisMin: 'auto',
        xAxisMax: 'auto',
        yScale: 'linear',
        xScale: 'linear',
      });
    }
  }

  return updatedCharts;
}
