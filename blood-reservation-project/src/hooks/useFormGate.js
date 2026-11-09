import { useEffect, useState } from 'react';

/**
 * Checks whether the current donor has a recent blood-donor form submission.
 * Returns { status: 'loading' | 'ok' | 'needsForm' | 'error', info, error }.
 */
export function useFormGate() {
  const [status, setStatus] = useState('loading');
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/bloodForm/form-recent', {
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));

        if (cancelled) return;

        if (!res.ok) {
          setError(data.error || 'Failed to check form status.');
          setStatus('error');
          return;
        }

        setInfo(data);
        setStatus(data.hasRecentForm ? 'ok' : 'needsForm');
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { status, info, error };
}