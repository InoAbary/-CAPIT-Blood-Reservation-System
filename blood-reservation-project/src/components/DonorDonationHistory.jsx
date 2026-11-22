import { useEffect, useRef, useState } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';
import '../styles/DonorDonationHistory.css';

const day = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' });
const time = new Intl.DateTimeFormat('en-PH', { timeStyle: 'short', timeZone: 'Asia/Manila' });

export default function DonorDonationHistory() {
  const [items, setItems] = useState([]);
  const [before, setBefore] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestRef = useRef(null);
  const dialog = useRef(null);

  async function load(cursor) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const query = cursor ? '?before=' + encodeURIComponent(cursor) : '';
      const response = await fetch('/api/donor/badges/history' + query, {
        credentials: 'include', signal: controller.signal, cache: 'no-store',
      });
      if (!response.ok) throw new Error('Could not load your donation history.');
      const result = await response.json();
      if (controller.signal.aborted) return;
      setItems(current => cursor ? [...current, ...result.items] : result.items);
      setBefore(result.before);
    } catch (err) {
      if (!controller.signal.aborted) setError(err.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => requestRef.current?.abort();
  }, []);

  useEffect(() => {
    if (selected && !dialog.current.open) dialog.current.showModal();
  }, [selected]);

  return (
    <section className="donor-donation-history" aria-label="Past donations">
      {error && <p role="alert">{error} <button type="button" onClick={() => load(before)}>Retry</button></p>}
      {!items.length && !error && <p>{loading ? 'Loading donations…' : 'No donations recorded yet.'}</p>}
      {!!items.length && <div className="donor-donation-history-scroll">
        <table>
          <thead><tr><th scope="col">Date</th><th scope="col">Donation type</th><th scope="col">Facility</th><th scope="col">Details</th></tr></thead>
          <tbody>
            {items.map(item => <tr key={item.id}>
              <td>{day.format(new Date(item.dateTime))}</td>
              <td>{item.donationType}</td><td>{item.facility || 'Facility unavailable'}</td>
              <td><button type="button" onClick={() => setSelected(item)}
                aria-label={`View donation on ${day.format(new Date(item.dateTime))}`}>
                <EyeIcon aria-hidden="true" />
              </button></td>
            </tr>)}
          </tbody>
        </table>
      </div>}
      {before && !error && <button type="button" disabled={loading} onClick={() => load(before)}>
        {loading ? 'Loading…' : 'Show more'}
      </button>}
      <dialog ref={dialog} onClose={() => setSelected(null)} aria-labelledby="donation-details-title">
        {selected && <>
          <header><h2 id="donation-details-title">Donation details</h2>
            <button type="button" onClick={() => dialog.current.close()}>Close</button>
          </header>
          <dl>
            <div><dt>Date</dt><dd>{day.format(new Date(selected.dateTime))}</dd></div>
            <div><dt>Time</dt><dd>{time.format(new Date(selected.dateTime))}</dd></div>
            <div><dt>Donation type</dt><dd>{selected.donationType}</dd></div>
            <div><dt>Facility</dt><dd>{selected.facility || 'Facility unavailable'}</dd></div>
            {selected.address && <div><dt>Address</dt><dd>{selected.address}</dd></div>}
          </dl>
        </>}
      </dialog>
    </section>
  );
}
