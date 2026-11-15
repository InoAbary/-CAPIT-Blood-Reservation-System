// hooks/useDonationCooldown.js
import { useEffect, useState } from 'react';

/**
 * status: 'loading' | 'eligible' | 'blocked' | 'error'
 */
export function useDonationCooldown() {
  const [state, setState] = useState({
    status: 'loading',
    nextEligibleDate: null,
    lastDonationDate: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/appointments/donation-eligibility', { credentials: 'include' })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || `Request failed (${r.status})`);
        return body;
      })
      .then((data) => {
        if (cancelled) return;
        if (data.eligible) {
          setState({ status: 'eligible', nextEligibleDate: null, lastDonationDate: data.lastDonationDate, error: null });
        } else {
          setState({
            status: 'blocked',
            nextEligibleDate: data.nextEligibleDate,
            lastDonationDate: data.lastDonationDate,
            error: null,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', nextEligibleDate: null, lastDonationDate: null, error: err.message });
      });
    return () => { cancelled = true; };
  }, []);

  return state;
}