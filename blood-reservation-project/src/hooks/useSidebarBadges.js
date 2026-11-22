import { useEffect, useState } from 'react';

export function useSidebarBadges(accountId, workspace, activeTab) {
  const [snapshot, setSnapshot] = useState(null);
  const scope = accountId && workspace ? `${accountId}:${workspace}` : null;

  useEffect(() => {
    if (!scope) return;
    let controller;
    const url = `/api/sidebar/${workspace}`;
    async function refresh() {
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      try {
        const response = await fetch(url, { credentials: 'include', cache: 'no-store', signal });
        if (!response.ok) return;
        const { counts, unreadCounts, observedAt } = await response.json();
        if (signal.aborted) return;
        setSnapshot({ scope, counts });
        const unread = unreadCounts[activeTab] || 0;
        if (unread > 0 && document.visibilityState === 'visible') {
          const seen = await fetch(url + '/seen', {
            method: 'POST', credentials: 'include', signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tab: activeTab, observedAt }),
          });
          if (seen.ok && !signal.aborted) {
            setSnapshot({ scope, counts: { ...counts, [activeTab]: counts[activeTab] - unread } });
          }
        }
      } catch {
        // Keep the last valid counts when a refresh fails.
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') refresh();
    }
    refreshWhenVisible();
    const interval = window.setInterval(refreshWhenVisible, 30000);
    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener('pending-counts-changed', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      controller?.abort();
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('pending-counts-changed', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [scope, workspace, activeTab]);

  return snapshot?.scope === scope ? snapshot.counts : null;
}
