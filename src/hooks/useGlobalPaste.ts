import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export function useGlobalPaste() {
  const datasets = useStore((s) => s.datasets);
  const addData = useStore((s) => s.addData);
  const setShowDataModal = useStore((s) => s.setShowDataModal);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text');
      if (!text?.trim()) return;

      // If no data loaded yet, parse directly
      if (datasets.length === 0) {
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
  }, [datasets.length, addData, setShowDataModal]);
}
