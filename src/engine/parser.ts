import Papa from 'papaparse';
import type { DataTable, Column, ColumnType } from './types';

function detectDelimiter(text: string): string {
  const firstLine = text.split('\n')[0] ?? '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;

  if (tabCount > commaCount && tabCount > semiCount) return '\t';
  if (semiCount > commaCount) return ';';
  return ',';
}

function tryParseJSON(text: string): DataTable | null {
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data) || data.length === 0) return null;
    if (typeof data[0] !== 'object' || data[0] === null) return null;

    const keys = Object.keys(data[0]);
    const columns: Column[] = keys.map((key) => {
      const values = data.map((row: Record<string, unknown>) => {
        const v = row[key];
        if (v === undefined || v === null) return null;
        return typeof v === 'number' ? v : String(v);
      });
      return { key, header: key, type: inferType(values), values };
    });

    return { columns, rowCount: data.length, indexColumnKey: null };
  } catch {
    return null;
  }
}

function inferType(values: (string | number | null)[]): ColumnType {
  const nonNull = values.filter((v) => v !== null && v !== '') as (string | number)[];

  if (nonNull.length === 0) return 'text';

  const numericCount = nonNull.filter((v) => {
    if (typeof v === 'number') return !isNaN(v) && isFinite(v);
    const n = Number(v);
    return !isNaN(n) && isFinite(n);
  }).length;

  if (numericCount / nonNull.length > 0.8) return 'numeric';

  const unique = new Set(nonNull.map(String));
  if (unique.size <= Math.max(20, nonNull.length * 0.3)) return 'categorical';

  const dateCount = nonNull.filter((v) => !isNaN(Date.parse(String(v)))).length;
  if (dateCount / nonNull.length > 0.8) return 'datetime';

  return 'text';
}

function parseDelimited(text: string): DataTable | null {
  const delimiter = detectDelimiter(text);
  const result = Papa.parse(text, {
    delimiter,
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (result.errors.length > 0 && result.data.length === 0) return null;
  if (result.data.length === 0) return null;

  const fields = result.meta.fields;
  if (!fields || fields.length === 0) return null;

  const columns: Column[] = fields.map((field) => {
    const values = result.data.map((row: Record<string, unknown>) => {
      const v = (row as Record<string, string | number | null>)[field];
      if (v === undefined || v === null) return null;
      return v;
    });
    return { key: field, header: field, type: inferType(values), values };
  });

  return { columns, rowCount: result.data.length, indexColumnKey: null };
}

export function parseRawData(text: string): DataTable | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Try JSON first (if it starts with [ or {)
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const jsonResult = tryParseJSON(trimmed);
    if (jsonResult) return jsonResult;
  }

  // Try delimited (CSV, TSV, etc.)
  return parseDelimited(trimmed);
}
