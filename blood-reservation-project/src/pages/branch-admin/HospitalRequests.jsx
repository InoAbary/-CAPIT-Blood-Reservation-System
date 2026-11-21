import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';
import '../../styles/BranchAdmin.css';
import '../../styles/BloodRequestStatus.css';
import '../../styles/HospitalRequests.css';

const ENDPOINT = '/api/branch-admin/my-requests';
const URGENCY_LABELS = { stat: 'STAT / Emergency', routine: 'Routine' };
const TRANSFUSION_LABELS = { yes: 'Yes', no: 'None', unknown: 'Not known' };
const CLOSED_STATUSES = new Set(['Rejected', 'Cancelled']);
const COMPLETED_HANDOFFS = new Set(['Picked Up', 'Delivered']);
const NOTIFIABLE_STATUSES = new Set([
  'Approved', 'Awaiting Hospital Confirmation', 'Rejected',
  'Partially Fulfilled', 'Fulfilled', 'Cancelled',
]);

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeZone: 'Asia/Manila',
});
const timeFormatter = new Intl.DateTimeFormat('en-PH', {
  timeStyle: 'short',
  timeZone: 'Asia/Manila',
});

function formatTimestamp(value, formatter) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? formatter.format(date) : '—';
}

function requestReference(request) {
  return request.requestID || String(request.id).slice(-8).toUpperCase();
}

function isInHistory(request) {
  return CLOSED_STATUSES.has(request.requestStatus) ||
    (request.requestStatus === 'Fulfilled' &&
      (!request.fulfillmentStatus || COMPLETED_HANDOFFS.has(request.fulfillmentStatus)));
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

function requestUpdates(items, facilityId) {
  const key = `hospital-request-statuses:${facilityId || 'current'}`;
  let previous = {};
  try {
    previous = JSON.parse(localStorage.getItem(key) || '{}') || {};
  } catch {
    // Request tracking still works if saved notification data is unavailable.
  }

  const snapshots = {};
  const updates = [];
  for (const item of items) {
    const { pickupLocation, staffContactName } = item.fulfillmentDetails || {};
    const snapshot = {
      status: item.requestStatus,
      method: item.confirmedFulfillmentMethod || '',
      progress: item.fulfillmentStatus || '',
      events: item.fulfillmentEvents?.length || 0,
      logistics: [pickupLocation, staffContactName].join('|'),
    };
    snapshots[item.id] = snapshot;

    const prior = previous[item.id];
    if (!prior) continue;
    const old = typeof prior === 'string' ? { status: prior } : prior;
    const reference = requestReference(item);

    if (old.status !== snapshot.status && NOTIFIABLE_STATUSES.has(snapshot.status)) {
      const detail = snapshot.status === 'Awaiting Hospital Confirmation'
        ? ` offered ${item.confirmedFulfillmentMethod}; your response is needed`
        : ` is now ${snapshot.status.toLowerCase()}`;
      updates.push({ id: item.id, text: `Request ${reference}${detail} (${item.requestedFacilityName}).` });
    } else if (old.progress !== snapshot.progress && snapshot.progress) {
      const note = item.fulfillmentEvents?.at(-1)?.note;
      updates.push({ id: item.id, text: `Request ${reference} update: ${snapshot.progress}${note ? ` — ${note}` : ''}.` });
    } else if ((old.logistics ?? '|') !== snapshot.logistics) {
      updates.push({ id: item.id, text: `Branch staff updated pickup details for request ${reference}.` });
    }
  }

  try {
    localStorage.setItem(key, JSON.stringify(snapshots));
  } catch {
    // The current request list can still be displayed.
  }

  return updates;
}

function StatusBadge({ value }) {
  return <span className="blood-request-status" data-status={value}>{value || '—'}</span>;
}

function HistoryList({ title, events }) {
  return (
    <div className="hospital-my-request-history-list">
      <h4>{title}</h4>
      {events.length ? (
        <ol>
          {events.map((event, index) => (
            <li key={event.id || event._id || index}>
              <strong>{event.status}</strong>
              <dl>
                <div><dt>Date</dt><dd>{formatTimestamp(event.updatedAt, dateFormatter)}</dd></div>
                <div><dt>Time</dt><dd>{formatTimestamp(event.updatedAt, timeFormatter)}</dd></div>
                {event.releasedCount != null && <div><dt>Units released</dt><dd>{event.releasedCount}</dd></div>}
                {event.fulfilledUnits != null && <div><dt>Total released</dt><dd>{event.fulfilledUnits}</dd></div>}
              </dl>
              {event.note && <p>{event.note}</p>}
            </li>
          ))}
        </ol>
      ) : <p>No updates recorded.</p>}
    </div>
  );
}

function RequestHistory({ item }) {
  const releaseEvents = item.releaseHistory ?? [];
  const statusEvents = [
    ...(item.createdAt ? [{
      status: item.requestStatus === 'Allocated' ? 'Allocated' : 'Submitted',
      updatedAt: item.createdAt,
    }] : []),
    ...releaseEvents,
  ];
  // Older requests may have a recorded completion date without a release operation.
  if (item.requestStatus === 'Fulfilled' && item.fulfilledAt && !releaseEvents.some(event => event.status === 'Fulfilled')) {
    statusEvents.push({ status: 'Fulfilled', updatedAt: item.fulfilledAt });
  }

  return (
    <section className="hospital-my-request-histories" aria-label="Update history">
      <HistoryList title="Request status" events={statusEvents} />
      <HistoryList title="Pickup / delivery" events={item.fulfillmentEvents ?? []} />
    </section>
  );
}

function RequestDetails({ item, busy, onUpdate }) {
  const latest = item.fulfillmentEvents?.at(-1);
  const method = item.confirmedFulfillmentMethod || item.fulfillmentMethod;
  const { pickupLocation, staffContactName } = item.fulfillmentDetails || {};

  return (
    <>
      <section className="hospital-my-request-detail-section">
        <h4>Blood request</h4>
        <dl className="hospital-my-request-detail-grid hospital-my-request-blood-grid">
          <div><dt>Blood type</dt><dd>{item.bloodType || '—'}</dd></div>
          <div><dt>Blood component</dt><dd>{item.component || '—'}</dd></div>
          <div><dt>Units requested</dt><dd>{item.units ?? '—'}</dd></div>
          <div><dt>Units released</dt><dd>{item.fulfilledUnits ?? '—'}</dd></div>
        </dl>
        {item.requestStatus === 'Rejected' && item.decisionReason && (
          <p className="hospital-request-reason"><strong>Decline reason</strong> {item.decisionReason}</p>
        )}
      </section>

      <section className="hospital-my-request-detail-section">
        <h4>Pickup or delivery</h4>
        <dl className="hospital-my-request-detail-grid">
          <div><dt>Current progress</dt><dd>{item.fulfillmentStatus || '—'}</dd></div>
          {item.confirmedFulfillmentMethod && (
            <div>
              <dt>{item.requestStatus === 'Awaiting Hospital Confirmation' ? 'Offered method' : 'Agreed method'}</dt>
              <dd>{item.confirmedFulfillmentMethod}</dd>
            </div>
          )}
          {(!item.confirmedFulfillmentMethod || (item.fulfillmentMethod && item.fulfillmentMethod !== item.confirmedFulfillmentMethod)) && (
            <div><dt>Requested method</dt><dd>{item.fulfillmentMethod || 'Not specified'}</dd></div>
          )}
          {method === 'Pickup' && pickupLocation && <div><dt>Pickup location</dt><dd>{pickupLocation}</dd></div>}
          {method === 'Pickup' && staffContactName && <div><dt>Staff contact</dt><dd>{staffContactName}</dd></div>}
          {latest?.note && <div className="hospital-my-request-wide"><dt>Latest note</dt><dd>{latest.note}</dd></div>}
        </dl>
      </section>

      <details className="hospital-my-request-detail-section hospital-my-request-disclosure">
        <summary>Submission details</summary>
        <div className="hospital-my-request-disclosure-body">
          <dl className="hospital-my-request-facts">
            <div><dt>Patient</dt><dd>{[item.firstName, item.middleName, item.lastName].filter(Boolean).join(' ') || '—'}</dd></div>
            <div><dt>Receiving branch</dt><dd>{item.requestedFacilityName || '—'}</dd></div>
            <div><dt>Requested by</dt><dd>{item.requesterName || '—'}</dd></div>
            <div><dt>Submitted date</dt><dd>{formatTimestamp(item.createdAt, dateFormatter)}</dd></div>
            <div><dt>Submitted time</dt><dd>{formatTimestamp(item.createdAt, timeFormatter)}</dd></div>
          </dl>

          {(item.reviewedAt || item.reviewerName) && (
            <section className="hospital-my-request-review hospital-my-request-section-divider">
              <h4>Review</h4>
              <dl className="hospital-my-request-facts">
                {item.reviewerName && <div><dt>Reviewed by</dt><dd>{item.reviewerName}</dd></div>}
                {item.reviewedAt && (
                  <>
                    <div><dt>Reviewed date</dt><dd>{formatTimestamp(item.reviewedAt, dateFormatter)}</dd></div>
                    <div><dt>Reviewed time</dt><dd>{formatTimestamp(item.reviewedAt, timeFormatter)}</dd></div>
                  </>
                )}
              </dl>
            </section>
          )}
        </div>
      </details>

      <details className="hospital-my-request-detail-section hospital-my-request-disclosure">
        <summary>Clinical details</summary>
        <div className="hospital-my-request-disclosure-body">
          <dl className="hospital-my-request-facts hospital-my-request-clinical-facts">
            <div><dt>Reason for transfusion</dt><dd>{item.diagnosis?.trim() || '—'}</dd></div>
            <div>
              <dt>Urgency</dt>
              <dd className={item.urgency === 'stat' ? 'branch-urgency urgent' : undefined}>
                {URGENCY_LABELS[item.urgency] ?? (item.urgency || '—')}
              </dd>
            </div>
            <div><dt>Hemoglobin (g/dL)</dt><dd>{item.hemoglobin ?? '—'}</dd></div>
            <div><dt>Platelets (×10³/µL)</dt><dd>{item.platelets ?? '—'}</dd></div>
            <div><dt>Age</dt><dd>{item.age ?? '—'}</dd></div>
            <div><dt>Sex</dt><dd>{item.sex || '—'}</dd></div>
            {item.wardRoom && <div><dt>Ward / room</dt><dd>{item.wardRoom}</dd></div>}
            <div><dt>Previous transfusions</dt><dd>{TRANSFUSION_LABELS[item.priorTransfusion] ?? (item.priorTransfusion || '—')}</dd></div>
            {item.priorTransfusionDate && (
              <div><dt>Date of previous transfusion</dt><dd>{formatTimestamp(item.priorTransfusionDate, dateFormatter)}</dd></div>
            )}
            {item.priorTransfusionNotes?.trim() && (
              <div><dt>Previous transfusion reactions or notes</dt><dd>{item.priorTransfusionNotes}</dd></div>
            )}
          </dl>
        </div>
      </details>

      {item.requestStatus === 'Awaiting Hospital Confirmation' && (
        <div className="hospital-request-action">
          <p>The branch offered {item.confirmedFulfillmentMethod || 'another method'}. {item.fulfillmentMethodNote}</p>
          <div className="branch-user-actions">
            <button className="btn-action" type="button" disabled={busy} onClick={() => onUpdate('method-response', { accepted: true })}>
              Accept {item.confirmedFulfillmentMethod}
            </button>
            <button className="btn-action branch-delete-button" type="button" disabled={busy} onClick={() => onUpdate('method-response', { accepted: false })}>
              Decline offer
            </button>
          </div>
        </div>
      )}
      {['Pending', 'Allocated'].includes(item.requestStatus) && (
        <div className="hospital-request-action">
          <p>
            {item.requestStatus === 'Pending'
              ? 'Waiting for the branch to review your request.'
              : 'You can cancel before the branch starts releasing blood bags.'}
          </p>
          <button
            className="btn-action"
            type="button"
            disabled={busy}
            onClick={() => onUpdate('cancel')}
          >
            Cancel request
          </button>
        </div>
      )}
    </>
  );
}

function ComponentRow({ item, onOpen }) {
  return (
    <tr>
      <td><strong>{requestReference(item)}</strong></td>
      <td>{item.requestedFacilityName || '—'}</td>
      <td>{item.bloodType || '—'}</td>
      <td>{item.component || '—'}</td>
      <td>{item.units ?? '—'}</td>
      <td><StatusBadge value={item.requestStatus} /></td>
      <td>{item.fulfillmentStatus || '—'}</td>
      <td>
        <button type="button" className="hospital-my-request-eye"
          aria-label={`View details for ${requestReference(item)}`} aria-haspopup="dialog"
          title="View request details" onClick={() => onOpen(item)}>
          <EyeIcon aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

export default function HospitalRequests() {
  const [requests, setRequests] = useState([]);
  const [hospitalName, setHospitalName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [view, setView] = useState('ongoing');
  const [selectedId, setSelectedId] = useState(null);
  const [detailView, setDetailView] = useState('details');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);
  const detailsRef = useRef(null);
  const loadRef = useRef(null);

  const selected = requests.find(item => item.id === selectedId);

  const load = useCallback(async () => {
    loadRef.current?.abort();
    const controller = new AbortController();
    loadRef.current = controller;
    try {
      const response = await fetch(ENDPOINT, { credentials: 'include', signal: controller.signal });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || 'Could not load your requests.');
      if (controller.signal.aborted) return;

      const items = data.requests || [];
      const updates = requestUpdates(items, data.facilityId);
      setRequests(items);
      setHospitalName(data.facilityName || items[0]?.hospital || '');
      if (updates.length) setNotifications(current => [...updates, ...current].slice(0, 5));
      setError('');
    } catch (loadError) {
      if (!controller.signal.aborted) setError(loadError.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => {
      window.clearInterval(timer);
      loadRef.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    const dialog = detailsRef.current;
    if (selectedId && dialog && !dialog.open) dialog.showModal();
  }, [selectedId]);

  function showDetails(item) {
    setActionError(null);
    setDetailView('details');
    setSelectedId(item.id);
  }

  async function updateRequest(action, body) {
    if (!selected || saving) return;
    const id = selected.id;
    setSaving(true);
    setActionError(null);
    try {
      const response = await fetch(`${ENDPOINT}/${encodeURIComponent(id)}/${action}`, {
        method: 'PATCH',
        credentials: 'include',
        ...(body ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        } : {}),
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || 'Could not update this request.');
      await load();
    } catch (updateError) {
      setActionError({ id, message: updateError.message });
    } finally {
      setSaving(false);
    }
  }

  const ongoing = requests.filter(item => !isInHistory(item));
  const history = requests.filter(isInHistory);
  const visible = view === 'ongoing' ? ongoing : history;
  const pending = requests.filter(item => item.requestStatus === 'Pending').length;

  return (
    <section id="branch-panel-my-requests" className="branch-dashboard branch-tab-panel hospital-my-requests" role="tabpanel" aria-labelledby="branch-tab-my-requests" tabIndex="0">
      <section className="content-card">
        <div className="hospital-my-requests-toolbar">
          <div>
            <h2 className="card-title">My blood requests</h2>
            {hospitalName && <p className="card-subtitle">{hospitalName}</p>}
          </div>
          <button className="btn-action" type="button" onClick={load}>Refresh</button>
        </div>

        {error && <p className="form-message error-message" role="alert">{error}</p>}
        {notifications.length > 0 && (
          <details className="hospital-my-request-updates">
            <summary>New updates ({notifications.length})</summary>
            <ul>{notifications.map((item, index) => <li key={`${item.id}-${index}`}>{item.text}</li>)}</ul>
            <button className="btn-action" type="button" onClick={() => setNotifications([])}>Clear notifications</button>
          </details>
        )}

        <div className="metrics-grid branch-metrics hospital-my-request-metrics">
          <article className="metric-card">
            <div className="metric-header"><span className="metric-label">Total requests</span></div>
            <div className="metric-value">{loading ? '—' : requests.length}</div>
          </article>
          <article className="metric-card">
            <div className="metric-header"><span className="metric-label">Pending review</span></div>
            <div className="metric-value">{loading ? '—' : pending}</div>
          </article>
        </div>

        <div className="segmented-tabs hospital-my-request-tabs" role="group" aria-label="Request view">
          <button type="button" className={`segmented-btn${view === 'ongoing' ? ' segmented-btn--active' : ''}`} aria-pressed={view === 'ongoing'} onClick={() => setView('ongoing')}>
            Ongoing ({ongoing.length})
          </button>
          <button type="button" className={`segmented-btn${view === 'history' ? ' segmented-btn--active' : ''}`} aria-pressed={view === 'history'} onClick={() => setView('history')}>
            History ({history.length})
          </button>
        </div>

        {loading ? <p role="status">Loading your requests…</p> : visible.length ? (
          <div className="table-scroll hospital-my-request-table-wrap">
            <table className="custom-table hospital-my-request-table" aria-label={view === 'ongoing' ? 'Ongoing requests' : 'Request history'}>
              <thead>
                <tr>
                  <th scope="col">Request ID</th>
                  <th scope="col">Receiving branch</th>
                  <th scope="col">Blood<br />Type</th>
                  <th scope="col">Component</th>
                  <th scope="col">Units</th>
                  <th scope="col">Request<br />Status</th>
                  <th scope="col">Pickup /<br />Delivery</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(item => <ComponentRow key={item.id} item={item} onOpen={showDetails} />)}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-table">{view === 'ongoing' ? 'No ongoing requests.' : 'No requests in history yet.'}</p>
        )}
      </section>

      <dialog className="hospital-my-request-dialog" ref={detailsRef} aria-labelledby="hospital-request-detail-title" onClose={() => setSelectedId(null)}>
        <header className="hospital-my-request-dialog-header">
          <div>
            <h3 id="hospital-request-detail-title">{selected ? `Request ${requestReference(selected)}` : 'Request details'}</h3>
            {selected && <StatusBadge value={selected.requestStatus} />}
          </div>
          <form method="dialog">
            <button type="submit" className="hospital-my-request-detail-button">Close</button>
          </form>
        </header>
        {selected && (
          <div className="segmented-tabs hospital-my-request-detail-nav" role="group" aria-label="Request details view">
            <button type="button" className={`segmented-btn${detailView === 'details' ? ' segmented-btn--active' : ''}`}
              aria-pressed={detailView === 'details'} onClick={() => setDetailView('details')}>
              Details
            </button>
            <button type="button" className={`segmented-btn${detailView === 'history' ? ' segmented-btn--active' : ''}`}
              aria-pressed={detailView === 'history'} onClick={() => setDetailView('history')}>
              Update history
            </button>
          </div>
        )}
        <div className="hospital-my-request-dialog-body" key={detailView}>
          {selected && actionError?.id === selected.id && (
            <p className="form-message error-message" role="alert">{actionError.message}</p>
          )}
          {!selected && <p>Request details are unavailable.</p>}
          {selected && detailView === 'details' && (
            <RequestDetails item={selected} busy={saving} onUpdate={updateRequest} />
          )}
          {selected && detailView === 'history' && <RequestHistory item={selected} />}
        </div>
      </dialog>
    </section>
  );
}
