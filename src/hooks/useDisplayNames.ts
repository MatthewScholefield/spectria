import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { computeDisplayNames } from '../utils/format';

export function useDisplayNames() {
  const datasets = useStore((s) => s.datasets);
  return useMemo(() => computeDisplayNames(datasets), [datasets]);
}
