import { useEffect } from 'react';
import { useStore } from '../store/useStore';

const LOCAL_DATA_MODE = !!(import.meta.env.VITE_LOCAL_DATA_MODE || import.meta.env.VITE_LOCAL_DATA_URL);

export function useGlobalPaste() {
  const datasetCount = useStore((s) => s.datasets.length);
  const addData = useStore((s) => s.addData);
  const setShowDataModal = useStore((s) => s.setShowDataModal);

  useEffect(() => {
    if (LOCAL_DATA_MODE) return;

    const handler = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text');
      if (!text?.trim()) return;

      // If no data loaded yet, parse directly
      if (datasetCount === 0) {
        e.preventDefault();
        addData(text);
      } else {
        // If data exists, open the modal pre-filled
        // We can't pre-fill from clipboard easily, so just open the modal
        // The user can paste again in the textarea
      }
    };

    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [datasetCount, addData, setShowDataModal]);
}
