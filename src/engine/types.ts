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

export interface Dataset {
  id: string;
  name: string;
  table: DataTable;
}

export type ChartType = 'line' | 'area' | 'bar' | 'scatter';

export interface SeriesConfig {
  datasetId: string;
  columnKey: string;
  label: string;
  color: string;
  visible: boolean;
}

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  xKey: string;
  series: SeriesConfig[];
}
