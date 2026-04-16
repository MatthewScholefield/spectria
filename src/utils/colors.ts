const PRIMARY_PALETTE = [
  '#6366f1', // Indigo
  '#f43f5e', // Rose
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

const SECONDARY_PALETTE = [
  '#818cf8', // Light Indigo
  '#fb7185', // Light Rose
  '#34d399', // Light Emerald
  '#fbbf24', // Light Amber
  '#60a5fa', // Light Blue
  '#a78bfa', // Light Violet
  '#f472b6', // Light Pink
  '#2dd4bf', // Light Teal
];

let colorIndex = 0;

export function getSeriesColor(offset: number = 0): string {
  const idx = (colorIndex + offset) % PRIMARY_PALETTE.length;
  return PRIMARY_PALETTE[idx];
}

export function advanceColorIndex() {
  colorIndex = (colorIndex + 1) % PRIMARY_PALETTE.length;
}

export function getDatasetPalette(datasetIndex: number): string[] {
  const palette = datasetIndex % 2 === 0 ? PRIMARY_PALETTE : SECONDARY_PALETTE;
  return palette;
}

export function resetColorIndex() {
  colorIndex = 0;
}

export const ALL_COLORS = [...PRIMARY_PALETTE, ...SECONDARY_PALETTE];
