import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '../../styles/BranchAdmin.css';

async function request(path) {
  const response = await fetch(path, { credentials: 'include' });
  const data = await readResponse(response);
  if (!response.ok) throw new Error(data.error || data.message || 'Could not load branch requests.');
  return data;
}

async function readResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error('The backend returned an HTML page instead of an API response. Restart the backend server and try again.');
    }
    throw new Error('The backend returned an unreadable response. Please try again.');
  }
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

export default function BranchRequests() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('stat-first');
  const [selectedId, setSelectedId] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [showDeclineReason, setShowDeclineReason] = useState(false);
  const [savingDecision, setSavingDecision] = useState(false);
  const [approvalMethod, setApprovalMethod] = useState('');
  const [methodNote, setMethodNote] = useState('');
  const [nextProgress, setNextProgress] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [savingProgress, setSavingProgress] = useState(false);
  const [fulfillmentDetails, setFulfillmentDetails] = useState({ pickupLocation: '', staffContactName: '' });
  const [savingDetails, setSavingDetails] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      setData(await request('/api/branch-admin/requests'));
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const requests = data?.requests || [];
  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((item) => {
      const matchesSearch = !query || [
        item.id,
        item.hospitalName,
        item.requesterName,
        item.firstName,
        item.lastName,
        item.bloodType,
        item.component,
      ].filter(Boolean).join(' ').toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || item.requestStatus === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a,b)=>{
      const dateA = Date.parse(a.createdAt) || 0;
      const dateB = Date.parse(b.createdAt) || 0;

      if (sortBy === 'stat-first') {
        const priority =
          Number(b.urgency?.toLowerCase() === 'stat') -
          Number(a.urgency?.toLowerCase() === 'stat');

          if (priority) return priority;
      }

      return sortBy === 'oldest' ? dateA - dateB : dateB - dateA;
    });
  }, [requests, search, statusFilter, sortBy]);

  const selected = requests.find((item) => item.id === selectedId)
    || filteredRequests[0]
    || null;
  useEffect(() => {
    setApprovalMethod(selected?.fulfillmentMethod || 'Pickup');
    setMethodNote('');
  }, [selected?.id, selected?.fulfillmentMethod]);
  const pendingCount = requests.filter((item) => item.requestStatus === 'Pending').length;
  const urgentCount = requests.filter((item) => item.urgency?.toLowerCase() === 'stat' && item.requestStatus === 'Pending').length;
  const fulfilledCount = requests.filter((item) => item.requestStatus === 'Fulfilled').length;

  async function decide(decision) {
    if (decision === 'reject' && !decisionReason.trim()) {
      setError('Add a reason before declining this request.');
      return;
    }
    if (decision === 'approve' && approvalMethod !== selected.fulfillmentMethod && !methodNote.trim()) {
      setError('Explain why the requested pickup or delivery option cannot be provided.');
      return;
    }
    setSavingDecision(true);
    setError('');
    try {
      const response = await fetch(`/api/branch-admin/requests/${encodeURIComponent(selected.id)}/decision`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: decisionReason, fulfillmentMethod: approvalMethod, fulfillmentMethodNote: methodNote }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || 'Could not update this request.');
      setDecisionReason('');
      setShowDeclineReason(false);
      await loadRequests();
    } catch (decisionError) { setError(decisionError.message); }
    finally { setSavingDecision(false); }
  }

  const deliverySteps = ['Preparing', 'On the Way', 'Delivered'];
  const pickupSteps = ['Preparing', 'Ready for Pickup', 'Picked Up'];
  const progressSteps = selected?.confirmedFulfillmentMethod === 'Delivery' ? deliverySteps : pickupSteps;
  const currentProgressIndex = progressSteps.indexOf(selected?.fulfillmentStatus || 'Preparing');
  const availableProgress = progressSteps[currentProgressIndex + 1] || '';
  useEffect(() => {
    setNextProgress(availableProgress);
    setProgressNote('');
  }, [selected?.id, availableProgress]);

  useEffect(() => {
    setFulfillmentDetails({ pickupLocation: selected?.fulfillmentDetails?.pickupLocation || '', staffContactName: selected?.fulfillmentDetails?.staffContactName || '' });
  }, [selected?.id, selected?.fulfillmentDetails]);

  async function updateProgress() {
    if (!nextProgress) return;
    setSavingProgress(true);
    setError('');
    try {
      const response = await fetch(`/api/branch-admin/requests/${encodeURIComponent(selected.id)}/progress`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextProgress, note: progressNote }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || 'Could not update fulfillment progress.');
      await loadRequests();
    } catch (progressError) { setError(progressError.message); }
    finally { setSavingProgress(false); }
  }

  async function saveFulfillmentDetails() {
    setSavingDetails(true);
    setError('');
    try {
      const response = await fetch(`/api/branch-admin/requests/${encodeURIComponent(selected.id)}/fulfillment-details`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fulfillmentDetails),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.error || 'Could not save coordination details.');
      await loadRequests();
    } catch (detailsError) { setError(detailsError.message); }
    finally { setSavingDetails(false); }
  }

  if (loading) return <section className="content-card"><p>Loading requests for this branch…</p></section>;

  return (
    <section id="branch-panel-branch-requests" className="branch-dashboard branch-requests-panel" role="tabpanel" aria-labelledby="branch-tab-branch-requests" tabIndex="0">
      <section className="content-card">
        <span className="branch-eyebrow">{data?.facilityName || 'YOUR BRANCH'}</span>
        <h2 className="card-title">Incoming blood requests</h2>
        <p className="card-subtitle">Requests submitted by hospitals that selected this branch.</p>
      </section>

      {error && <p className="form-message error-message" role="alert">{error}</p>}

      <div className="metrics-grid branch-metrics">
        <article className="metric-card">
          <div className="metric-header"><span className="metric-label">Requests</span><span className="metric-icon blue">▤</span></div>
          <div className="metric-value">{requests.length}</div>
          <div className="metric-subtext">Addressed to this branch</div>
        </article>
        <article className="metric-card">
          <div className="metric-header"><span className="metric-label">Pending review</span><span className="metric-icon orange">◷</span></div>
          <div className="metric-value">{pendingCount}</div>
          <div className="metric-subtext">{urgentCount} urgent request{urgentCount === 1 ? '' : 's'}</div>
        </article>
        <article className="metric-card">
          <div className="metric-header"><span className="metric-label">Fulfilled</span><span className="metric-icon green">✓</span></div>
          <div className="metric-value">{fulfilledCount}</div>
          <div className="metric-subtext">Marked fulfilled</div>
        </article>
      </div>

      <section className="content-card">
        <div className="branch-request-toolbar">
          <div className="form-group">
            <label htmlFor="branch-request-search">Search requests</label>
            <input
              id="branch-request-search"
              className="form-control"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Hospital, patient, or blood type"
            />
          </div>
          <div className="form-group">
            <label htmlFor="branch-request-status">Filter by status</label>
            <select id="branch-request-status" className="form-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Awaiting Hospital Confirmation">Awaiting hospital confirmation</option>
              <option value="Approved">Approved</option>
              <option value="Partially Fulfilled">Partially fulfilled</option>
              <option value="Fulfilled">Fulfilled</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="branch-request-sort"> Sort by </label>
            <select 
            id="branch-request-sort" 
            className="form-control" 
            value={sortBy} 
            onChange={(event) => setSortBy(event.target.value)}>
              <option value="stat-first"> STAT first</option>
              <option value="newest"> Newest first</option>
              <option value="oldest"> Oldest first</option>
            </select>
          </div>
          <span className="branch-user-count">Showing {filteredRequests.length} of {requests.length}</span>
        </div>

        <div className="branch-request-list-layout">
          <div className="table-scroll">
            <table className="custom-table branch-request-table">
              <thead>
                <tr><th>Request</th><th>Hospital</th><th>Patient</th><th>Blood requested</th><th>Urgency</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filteredRequests.length ? filteredRequests.map((item) => (
                  <tr key={item.id} className={`${selected?.id === item.id ? 'branch-request-selected' : ''} branch-request-row`} onClick={() => setSelectedId(item.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(item.id); } }} tabIndex={0} aria-label={`View request ${item.id.slice(-8).toUpperCase()} from ${item.hospitalName}`}>
                    <td>
                      <span className="branch-request-select">{item.id.slice(-8).toUpperCase()}</span>
                      <div className="subtext">{formatDate(item.createdAt)}</div>
                    </td>
                    <td>{item.hospitalName}</td>
                    <td>{item.lastName}, {item.firstName}</td>
                    <td><strong>{item.bloodType} · {item.units} unit{item.units === 1 ? '' : 's'}</strong><div className="subtext">{item.component}</div></td>
                    <td><span className={`branch-urgency ${item.urgency?.toLowerCase() === 'stat' ? 'urgent' : ''}`}>{item.urgency?.toLowerCase() === 'stat' ? 'STAT' : 'Routine'}</span></td>
                    <td><span className="tag">{item.requestStatus}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" className="empty-table">{requests.length ? 'No requests match these filters.' : 'No hospitals have sent a request to this branch yet.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {selected && (
            <aside className="branch-request-details" aria-label="Selected request details">
              <div className="branch-eyebrow">REQUEST DETAILS</div>
              <h3>{selected.lastName}, {selected.firstName} {selected.middleName || ''}</h3>
              <p className="card-subtitle">{selected.hospitalName}{selected.wardRoom ? ` · ${selected.wardRoom}` : ''}</p>
              <dl>
                <dt>Age / sex</dt><dd>{selected.age ?? '—'} / {selected.sex || '—'}</dd>
                <dt>Diagnosis</dt><dd>{selected.diagnosis || '—'}</dd>
                <dt>Hemoglobin</dt><dd>{selected.hemoglobin || '—'}</dd>
                <dt>Platelets</dt><dd>{selected.platelets || '—'}</dd>
                <dt>Previous transfusion</dt><dd>{selected.priorTransfusion || '—'}</dd>
                {selected.priorTransfusionNotes && <><dt>Transfusion notes</dt><dd>{selected.priorTransfusionNotes}</dd></>}
                <dt>Requested by</dt><dd>{selected.requesterName || 'Hospital staff'}</dd>
                <dt>Submitted</dt><dd>{formatDate(selected.createdAt)}</dd>
                <dt>Requested method</dt><dd>{selected.fulfillmentMethod || 'Not specified'}</dd>
                {selected.confirmedFulfillmentMethod && <><dt>Branch method</dt><dd>{selected.confirmedFulfillmentMethod}</dd></>}
                {selected.requestStatus === 'Awaiting Hospital Confirmation' && <><dt>Method offer</dt><dd>Waiting for hospital to accept or decline</dd></>}
                {selected.confirmedFulfillmentMethod && selected.confirmedFulfillmentMethod !== selected.fulfillmentMethod && selected.fulfillmentMethodNote && <><dt>Method change note</dt><dd>{selected.fulfillmentMethodNote}</dd></>}
                {(selected.requestStatus === 'Approved' || selected.requestStatus === 'Partially Fulfilled' || selected.requestStatus === 'Fulfilled') && <><dt>Units provided</dt><dd>{selected.fulfilledUnits || 0} of {selected.units}</dd></>}
                {selected.fulfillmentStatus && <><dt>Fulfillment progress</dt><dd>{selected.fulfillmentStatus}</dd></>}
                {selected.reviewedAt && <><dt>Reviewed</dt><dd>{formatDate(selected.reviewedAt)}</dd></>}
                {selected.reviewedBy && <><dt>Reviewed by</dt><dd>{`${selected.reviewedBy.firstName || ''} ${selected.reviewedBy.lastName || ''}`.trim()}</dd></>}
                {selected.requestStatus === 'Rejected' && selected.decisionReason && <><dt>Decline reason</dt><dd>{selected.decisionReason}</dd></>}
              </dl>
              {selected.requestStatus === 'Pending' && (
                <div className="branch-request-decision">
                  <label htmlFor="branch-approval-method">Method branch can provide</label>
                  <select id="branch-approval-method" className="form-control" value={approvalMethod} onChange={(event) => setApprovalMethod(event.target.value)}>
                    <option value="Pickup">Hospital pickup</option>
                    <option value="Delivery">Delivery to hospital</option>
                  </select>
                  {approvalMethod !== selected.fulfillmentMethod && <>
                    <label htmlFor="branch-method-note">Why is the requested method unavailable?</label>
                    <textarea id="branch-method-note" className="form-control" maxLength={1000} rows={3} value={methodNote} onChange={(event) => setMethodNote(event.target.value)} placeholder="Explain the alternative arrangement" />
                  </>}
                  {!showDeclineReason ? <div className="branch-user-actions">
                    <button className="btn-action" type="button" disabled={savingDecision || (approvalMethod !== selected.fulfillmentMethod && !methodNote.trim())} onClick={() => decide('approve')}>{savingDecision ? 'Saving…' : approvalMethod === selected.fulfillmentMethod ? 'Accept request' : 'Offer alternative method'}</button>
                    <button className="btn-action branch-delete-button" type="button" disabled={savingDecision} onClick={() => setShowDeclineReason(true)}>Decline request</button>
                  </div> : <>
                    <label htmlFor="branch-request-reason">Reason for declining</label>
                    <textarea id="branch-request-reason" className="form-control" maxLength={1500} rows={3} value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} placeholder="Explain why this request cannot be accepted" autoFocus />
                    <div className="branch-user-actions">
                      <button className="btn-action branch-delete-button" type="button" disabled={savingDecision || !decisionReason.trim()} onClick={() => decide('reject')}>{savingDecision ? 'Saving…' : 'Confirm decline'}</button>
                      <button className="btn-action" type="button" disabled={savingDecision} onClick={() => { setShowDeclineReason(false); setDecisionReason(''); }}>Cancel</button>
                    </div>
                  </>}
                </div>
              )}
              {selected.requestStatus === 'Awaiting Hospital Confirmation' && <p className="form-message" role="status">Alternative offered. Waiting for the hospital to respond.</p>}
              {['Approved', 'Partially Fulfilled', 'Fulfilled'].includes(selected.requestStatus) && availableProgress && (
                <div className="branch-request-decision">
                  <strong>Update {selected.confirmedFulfillmentMethod?.toLowerCase()} progress</strong>
                  <label htmlFor="branch-progress-next">Next step</label>
                  <select id="branch-progress-next" className="form-control" value={nextProgress} onChange={(event) => setNextProgress(event.target.value)}><option value={availableProgress}>{availableProgress}</option></select>
                  <label htmlFor="branch-progress-note">Update note (optional)</label>
                  <textarea id="branch-progress-note" className="form-control" rows={2} maxLength={1000} value={progressNote} onChange={(event) => setProgressNote(event.target.value)} placeholder="Short update for the hospital (optional)" />
                  <button className="btn-action" type="button" disabled={savingProgress} onClick={updateProgress}>{savingProgress ? 'Saving…' : 'Post progress update'}</button>
                </div>
              )}
              {['Approved', 'Partially Fulfilled', 'Fulfilled'].includes(selected.requestStatus) && selected.confirmedFulfillmentMethod === 'Pickup' && (
                <div className="branch-request-decision">
                  <strong>Pickup details</strong>
                  <label htmlFor="branch-pickup-location">Where to pick up</label><input id="branch-pickup-location" className="form-control" maxLength={300} value={fulfillmentDetails.pickupLocation} onChange={(event) => setFulfillmentDetails((current) => ({ ...current, pickupLocation: event.target.value }))} placeholder="Address, entrance, or desk" />
                  <label htmlFor="branch-staff-contact">Who to find</label>
                  <input id="branch-staff-contact" className="form-control" maxLength={150} value={fulfillmentDetails.staffContactName} onChange={(event) => setFulfillmentDetails((current) => ({ ...current, staffContactName: event.target.value }))} placeholder="Branch staff member" />
                  <button className="btn-action" type="button" disabled={savingDetails} onClick={saveFulfillmentDetails}>{savingDetails ? 'Saving…' : 'Save coordination details'}</button>
                </div>
              )}
            </aside>
          )}
        </div>
      </section>
    </section>
  );
}
