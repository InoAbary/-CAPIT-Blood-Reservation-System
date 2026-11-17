import { useEffect, useState } from 'react';

export function usePendingCounts(staffId, enabled) {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    setCounts(null);

    if (!staffId || !enabled) return;

    let disposed = false;
    let controller = null;

    async function refresh() {
      controller?.abort();
      const current = new AbortController();
      controller = current;

      try {
        const response = await fetch('/api/staff/pending-counts', {
          credentials: 'include',
          cache: 'no-store',
          signal: current.signal,
        });

        if (!response.ok) {
          throw new Error('Could not load pending counts.');
        }

        const result = await response.json();

        if (!disposed && !current.signal.aborted) {
          setCounts(result);
        }
      } catch {
        if (!disposed && !current.signal.aborted) {
          setCounts(null);
        }
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') refresh();
    }

    refresh();

    const timer = window.setInterval(refreshWhenVisible, 30000);

    window.addEventListener('pending-counts-changed', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener('pending-counts-changed', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener(
        'visibilitychange',
        refreshWhenVisible
      );
    };
  }, [staffId, enabled]);

  return counts;
}