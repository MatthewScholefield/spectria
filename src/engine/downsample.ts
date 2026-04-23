/**
 * LTTB (Largest Triangle Three Buckets) downsampling for chart rendering.
 * Preserves visual peaks/valleys better than simple stride-based sampling.
 */

type Row = Record<string, unknown>;

function lttb(
  data: Row[],
  threshold: number,
  xKey: string,
  yKeys: string[],
): Row[] {
  const dataLength = data.length;
  if (threshold >= dataLength || threshold < 3) return data;

  const sampled: Row[] = [];
  // Always keep first point
  sampled.push(data[0]);

  const bucketSize = (dataLength - 2) / (threshold - 2);

  let prevSelectedIndex = 0;

  // Pre-compute a numeric "score" for each row (max absolute value across yKeys)
  const scores = new Float64Array(dataLength);
  for (let i = 0; i < dataLength; i++) {
    const row = data[i];
    let maxVal = 0;
    for (const key of yKeys) {
      const v = row[key];
      if (typeof v === 'number' && isFinite(v)) {
        const abs = Math.abs(v);
        if (abs > maxVal) maxVal = abs;
      }
    }
    scores[i] = maxVal;
  }

  for (let bucket = 0; bucket < threshold - 2; bucket++) {
    // Average of next bucket (pre-look)
    const nextBucketStart = Math.floor((bucket + 1) * bucketSize) + 1;
    const nextBucketEnd = Math.min(Math.floor((bucket + 2) * bucketSize) + 1, dataLength);
    let avgX = 0;
    let avgScore = 0;
    const nextCount = nextBucketEnd - nextBucketStart;
    if (nextCount > 0) {
      for (let i = nextBucketStart; i < nextBucketEnd; i++) {
        const xv = data[i][xKey];
        avgX += typeof xv === 'number' ? xv : i;
        avgScore += scores[i];
      }
      avgX /= nextCount;
      avgScore /= nextCount;
    } else {
      avgX = typeof data[dataLength - 1][xKey] === 'number'
        ? (data[dataLength - 1][xKey] as number)
        : dataLength - 1;
      avgScore = scores[dataLength - 1];
    }

    const prevX = typeof data[prevSelectedIndex][xKey] === 'number'
      ? (data[prevSelectedIndex][xKey] as number)
      : prevSelectedIndex;
    const prevScore = scores[prevSelectedIndex];

    // Current bucket range
    const bucketStart = Math.floor(bucket * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor((bucket + 1) * bucketSize) + 1, dataLength);

    let maxArea = -1;
    let bestIndex = bucketStart;

    for (let i = bucketStart; i < bucketEnd; i++) {
      const curX = typeof data[i][xKey] === 'number'
        ? (data[i][xKey] as number)
        : i;
      const curScore = scores[i];

      // Triangle area (no need for absolute value since we compare magnitudes)
      const area = Math.abs(
        (prevX - avgX) * (curScore - prevScore)
        - (prevX - curX) * (avgScore - prevScore),
      );

      if (area > maxArea) {
        maxArea = area;
        bestIndex = i;
      }
    }

    sampled.push(data[bestIndex]);
    prevSelectedIndex = bestIndex;
  }

  // Always keep last point
  sampled.push(data[dataLength - 1]);
  return sampled;
}

export function downsampleData(
  data: Row[],
  threshold = 2000,
  yKeys?: string[],
): Row[] {
  if (data.length <= threshold) return data;

  // Find xKey — first non-numeric key, or fallback to index
  const firstRow = data[0];
  let xKey = '';
  for (const key of Object.keys(firstRow)) {
    if (typeof firstRow[key] !== 'number') {
      xKey = key;
      break;
    }
  }

  // If no yKeys provided, find all numeric keys (excluding xKey)
  if (!yKeys || yKeys.length === 0) {
    yKeys = Object.keys(firstRow).filter(
      (k) => k !== xKey && typeof firstRow[k] === 'number',
    );
  }

  if (yKeys.length === 0) return data;

  return lttb(data, threshold, xKey, yKeys);
}
