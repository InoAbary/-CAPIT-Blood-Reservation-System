import React, { useCallback, useEffect, useState } from 'react';
import '../../styles/BranchAdmin.css';
import '../../styles/BloodRequestStatus.css';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

async function readResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error('The backend returned an HTML page instead of request data. Restart the backend server and try again.');
    }
    throw new Error('The backend returned an unreadable response. Please try again.');
  }
}

export default function HospitalRequests() {
  const [requests, setRequests] = useState([]);
  const [facilityId, setFacilityId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/branch-admin/my-requests', { credentials: 'include' });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || 'Could not load your requests.');
      const key = `hospital-request-statuses:${data.facilityId || 'current'}`;
      const previous = JSON.parse(localStorage.getItem(key) || '{}');
      const nextStatuses = {};
      const changes = [];
      for (const item of data.requests || []) {
        const logistics = item.fulfillmentDetails || {};
        const snapshot = { status: item.requestStatus, method: item.confirmedFulfillmentMethod || '', progress: item.fulfillmentStatus || '', events: item.fulfillmentEvents?.length || 0, logistics: [logistics.pickupLocation, logistics.staffContactName].join('|') };
        nextStatuses[item.id] = snapshot;
        const old = typeof previous[item.id] === 'string' ? { status: previous[item.id], method: '', progress: '', events: 0 } : previous[item.id];
        if (old && old.status !== snapshot.status && ['Approved', 'Awaiting Hospital Confirmation', 'Rejected', 'Partially Fulfilled', 'Fulfilled', 'Cancelled'].includes(snapshot.status)) {
          const detail = snapshot.status === 'Awaiting Hospital Confirmation'
            ? ` offered ${item.confirmedFulfillmentMethod}; your response is needed`
            : ` is now ${snapshot.status.toLowerCase()}`;
          changes.push({ id: item.id, text: `Request ${item.id.slice(-8).toUpperCase()}${detail} (${item.requestedFacilityName}).` });
        } else if (old && old.progress !== snapshot.progress && snapshot.progress) {
          changes.push({ id: item.id, text: `Request ${item.id.slice(-8).toUpperCase()} update: ${snapshot.progress}${item.fulfillmentEvents?.at(-1)?.note ? ` — ${item.fulfillmentEvents.at(-1).note}` : ''}.` });
        } else if (old && old.logistics !== snapshot.logistics && snapshot.logistics) {
          changes.push({ id: item.id, text: `Branch staff updated coordination details for request ${item.id.slice(-8).toUpperCase()}.` });
        }
      }
      localStorage.setItem(key, JSON.stringify(nextStatuses));
      setFacilityId(data.facilityId || '');
      setRequests(data.requests || []);
      if (changes.length) setNotifications((current) => [...changes, ...current].slice(0, 5));
      setError('');
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, []);

  async function cancelRequest(id) {
    setError('');
    try {
      const response = await fetch(`/api/branch-admin/my-requests/${encodeURIComponent(id)}/cancel`, { method: 'PATCH', credentials: 'include' });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || 'Could not cancel this request.');
      await load();
    } catch (cancelError) { setError(cancelError.message); }
  }

  async function respondToMethod(id, accepted) {
    setError('');
    try {
      const response = await fetch(`/api/branch-admin/my-requests/${encodeURIComponent(id)}/method-response`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted }),
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || 'Could not record your response.');
      await load();
    } catch (responseError) { setError(responseError.message); }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const pending = requests.filter((item) => item.requestStatus === 'Pending').length;
  return (
    <section id="branch-panel-my-requests" className="branch-dashboard branch-tab-panel" role="tabpanel" aria-labelledby="branch-tab-my-requests" tabIndex="0">
      <section className="content-card">
        <span className="branch-eyebrow">HOSPITAL REQUESTS</span>
        <h2 className="card-title">My blood requests</h2>
        <p className="card-subtitle">Track requests submitted by {requests[0]?.hospital || 'your hospital'} and see decisions from the selected branch.</p>
        {facilityId && <span className="subtext">Updates automatically every 15 seconds.</span>}
      </section>
      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {notifications.length > 0 && (
        <section className="content-card" aria-live="polite" aria-label="New request notifications">
          <div className="branch-eyebrow">NEW UPDATES</div>
          {notifications.map((item, index) => <p className="form-message" role="status" key={`${item.id}-${index}`}>{item.text}</p>)}
          <button className="btn-action" type="button" onClick={() => setNotifications([])}>Clear notifications</button>
        </section>
      )}
      <div className="metrics-grid branch-metrics">
        <article className="metric-card"><div className="metric-header"><span className="metric-label">Total requests</span><span className="metric-icon blue">▤</span></div><div className="metric-value">{requests.length}</div></article>
        <article className="metric-card"><div className="metric-header"><span className="metric-label">Pending</span><span className="metric-icon orange">◷</span></div><div className="metric-value">{pending}</div></article>
      </div>
      <section className="content-card">
        <div className="card-header-flex branch-users-header"><div><h2 className="card-title">Request progress</h2><p className="card-subtitle">Status and review details for each request.</p></div><button className="btn-action" type="button" onClick={load}>Refresh</button></div>
        {loading ? <p>Loading your requests…</p> : requests.length ? (
          <div className="hospital-request-cards">
            {requests.map((item) => {
              const latest = item.fulfillmentEvents?.at(-1);
              return <article className="hospital-request-card" key={item.id}>
                <div className="hospital-request-card-head">
                  <div><span className="branch-eyebrow">REQUEST {item.id.slice(-8).toUpperCase()}</span><h3>{item.bloodType} · {item.units} unit{item.units === 1 ? '' : 's'} of {item.component}</h3><p className="card-subtitle">{item.firstName} {item.lastName} · {item.requestedFacilityName}</p></div>
                    <span
                      className="blood-request-status"
                      data-status={item.requestStatus}
                    >
                      {item.requestStatus}
                    </span>
                </div>
                <div className="hospital-request-summary">
                  <div><span>Requested method</span><strong>{item.fulfillmentMethod || 'Not specified'}</strong></div>
                  {item.confirmedFulfillmentMethod && <div><span>Agreed method</span><strong>{item.confirmedFulfillmentMethod}</strong></div>}
                  <div><span>Submitted</span><strong>{formatDate(item.createdAt)}</strong></div>
                  {['Approved', 'Partially Fulfilled', 'Fulfilled'].includes(item.requestStatus) && <div><span>Units provided</span><strong>{item.fulfilledUnits || 0} of {item.units}</strong></div>}
                </div>
                {item.requestStatus === 'Awaiting Hospital Confirmation' && <div className="hospital-request-action">
                  <p>The branch can’t provide {item.fulfillmentMethod?.toLowerCase()} and offers {item.confirmedFulfillmentMethod?.toLowerCase()}. {item.fulfillmentMethodNote}</p>
                  <div className="branch-user-actions"><button className="btn-action" type="button" onClick={() => respondToMethod(item.id, true)}>Accept {item.confirmedFulfillmentMethod}</button><button className="btn-action branch-delete-button" type="button" onClick={() => respondToMethod(item.id, false)}>Decline offer</button></div>
                </div>}
                {item.requestStatus === 'Pending' && <div className="hospital-request-action"><span>Waiting for the branch to review your request.</span><button className="btn-action" type="button" onClick={() => cancelRequest(item.id)}>Cancel request</button></div>}
                {item.requestStatus === 'Rejected' && item.decisionReason && <p className="hospital-request-reason"><strong>Decline reason:</strong> {item.decisionReason}</p>}
                {item.fulfillmentStatus && <div className="hospital-request-progress"><span className="branch-eyebrow">CURRENT PROGRESS</span><strong>{item.fulfillmentStatus}</strong><span>{latest ? formatDate(latest.updatedAt) : ''}{latest?.note ? ` · ${latest.note}` : ''}</span></div>}
                {item.confirmedFulfillmentMethod === 'Pickup' && (item.fulfillmentDetails?.pickupLocation || item.fulfillmentDetails?.staffContactName) && <div className="hospital-pickup-details"><span className="branch-eyebrow">PICKUP DETAILS</span>{item.fulfillmentDetails.pickupLocation && <span><strong>Where:</strong> {item.fulfillmentDetails.pickupLocation}</span>}{item.fulfillmentDetails.staffContactName && <span><strong>Who to find:</strong> {item.fulfillmentDetails.staffContactName}</span>}</div>}
                {item.fulfillmentEvents?.length > 1 && <details className="hospital-request-history"><summary>View update history ({item.fulfillmentEvents.length})</summary><ol>{item.fulfillmentEvents.map((event, index) => <li key={`${item.id}-event-${index}`}><strong>{event.status}</strong><span>{formatDate(event.updatedAt)}</span>{event.note && <p>{event.note}</p>}</li>)}</ol></details>}
                {item.reviewedAt && <div className="subtext">Reviewed {formatDate(item.reviewedAt)}{item.reviewerName ? ` by ${item.reviewerName}` : ''}</div>}
              </article>;
            })}
          </div>
        ) : <p className="empty-table">No blood requests have been submitted yet.</p>}
      </section>
    </section>
  );
}
