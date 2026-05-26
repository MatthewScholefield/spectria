export type ColumnType = 'numeric' | 'categorical' | 'datetime' | 'text';

export interface Column {
  key: string;
  header: string;
  type: ColumnType;
  values: (string | number | null)[];
}

export interface DataTable {
  columns: Column[];
  rowCount: number;
  indexColumnKey: string | null;
}

export type SourceStatus = 'idle' | 'connecting' | 'live' | 'paused' | 'completed' | 'error';

export interface StreamSource {
  id: string;
  kind: 'stream';
  name: string;
  serverUrl: string;
  projectName: string;
  runId: string;
  baseline?: string;
  status: SourceStatus;
  runConfig?: Record<string, unknown>;
}

export type DataSource = StreamSource;

export type DatasetOrigin =
  | { kind: 'manual'; label: string }
  | { kind: 'run'; project: string; path: string[] };

export interface Dataset {
  id: string;
  origin: DatasetOrigin;
  customName?: string;
  table: DataTable;
  sourceId?: string;
}

export type ChartType = 'line' | 'area' | 'bar' | 'scatter';

export type RelativeMode = 'none' | 'residual' | 'percentResidual';

export type ChartValueUnit =
  | 'number'
  | 'percentage'
  | 'seconds'
  | 'milliseconds'
  | 'minutes'
  | 'hours'
  | 'bytes'
  | 'kilobytes'
  | 'megabytes'
  | 'gigabytes'
  | 'dollars'
  | 'count'
  | `custom:${string}`;

export interface SeriesConfig {
  datasetId: string;
  columnKey: string;
  customLabel?: string;
  color: string;
  visible: boolean;
}

export interface SeriesIdentity {
  datasetId: string;
  columnKey: string;
}

export type AxisBound = 'auto' | number;

export type AxisScale = 'linear' | 'log' | 'sqrt';

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  xKey: string;
  series: SeriesConfig[];
  relativeMode: RelativeMode;
  relativeBase: SeriesIdentity | null;
  yUnit: ChartValueUnit;
  yAxisMin: AxisBound;
  yAxisMax: AxisBound;
  xAxisMin: AxisBound;
  xAxisMax: AxisBound;
  yScale: AxisScale;
  xScale: AxisScale;
}
