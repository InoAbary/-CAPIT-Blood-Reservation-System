import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../styles/BranchAdmin.css';
import '../styles/CancelModal.css';

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || result.message || 'The request could not be completed.');
  }
  return result;
}

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'denied', label: 'Denied' },
  { key: 'all', label: 'All' },
];

function StaffAppointments() {
  const [status, setStatus] = useState('pending');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionAction, setDecisionAction] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [decisionError, setDecisionError] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);
  const decisionDialog = useRef(null);

  useEffect(() => {
    if (decisionTarget && decisionDialog.current &&
        !decisionDialog.current.open) {
      decisionDialog.current.showModal();
    }
  }, [decisionTarget]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await request(`/api/appointments/staff-appointments?status=${status}`);
      setAppointments(result.appointments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const submitDecision = async (event) => {
    event.preventDefault();
  
    if (!decisionTarget || savingDecision) return;
  
    const note = denialReason === 'Other'
      ? decisionNote.trim()
      : denialReason;

    if (
      decisionAction === 'deny' &&
      (!note || note.length > 1000)
    ) {
      setDecisionError(
        denialReason === 'Other'
          ? 'Please provide an explanation.'
          : 'Please select a reason.'
      );
      return;
    }
  
    setSavingDecision(true);
    setDecisionError('');
    setError('');
    setNotice('');
  
    try {
      await request(
        `/api/appointments/staff-appointments/${decisionTarget._id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            action: decisionAction,
            ...(decisionAction === 'deny' ? { note } : {}),
          }),
        }
      );
  
      setDecisionTarget(null);
      setDecisionNote('');
      setNotice(
        decisionAction === 'approve'
          ? 'Appointment approved.'
          : 'Appointment denied.'
      );
  
      await load();
    } catch (err) {
      setDecisionError(err.message);
    } finally {
      setSavingDecision(false);
    }
  };

  return (
    <section className="content-card">
      <h2 className="card-title">Appointments</h2>
      <p className="card-subtitle">Review donor appointment requests for your facility.</p>

      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {notice && <p className="form-message" role="status">{notice}</p>}

      <div className="segmented-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`segmented-btn${status === tab.key ? ' segmented-btn--active' : ''}`}
            onClick={() => setStatus(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading appointments…</p>
      ) : appointments.length === 0 ? (
        <p className="muted">Nothing to show here.</p>
      ) : (
        <div className="appt-table-wrap">
          <table className="appt-table">
            <thead>
              <tr>
                <th>Donor</th>
                <th>Blood type</th>
                <th>Date &amp; time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a._id}>
                  <td>
                    <strong>
                      {a.donor
                        ? `${a.donor.firstName || ''} ${a.donor.lastName || ''}`.trim() || a.donor.email
                        : 'Unknown donor'}
                    </strong>
                    {a.note && <span className="appt-note">Note: {a.note}</span>}
                  </td>
                  <td>
                    {a.donor?.bloodType ? (
                      <span className="status-badge status-approved">{a.donor.bloodType}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className="appt-date">
                      {new Date(a.date).toLocaleDateString([], { dateStyle: 'medium' })}
                    </span>
                    <span className="appt-time">
                      {new Date(a.date).toLocaleTimeString([], { timeStyle: 'short' })}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${a.status}`}>{a.status}</span>
                  </td>
                  <td>
                    {a.status === 'pending' ? (
                    <div className="appt-actions">
                      <button
                        type="button"
                        className="btn-action"
                        disabled={savingDecision}
                        onClick={() => {
                          setDecisionAction('approve');
                          setDecisionTarget(a);
                          setDenialReason('');
                          setDecisionNote('');
                          setDecisionError('');
                        }}
                      >
                        Approve
                      </button>
                    
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={savingDecision}
                        onClick={() => {
                          setDecisionAction('deny');
                          setDecisionTarget(a);
                          setDenialReason('');
                          setDecisionNote('');
                          setDecisionError('');
                        }}
                      >
                        Deny
                      </button>
                    </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    {decisionTarget && (
      <dialog
        ref={decisionDialog}
        className="cancel-modal"
        aria-labelledby="appointment-decision-title"
        onCancel={(event) => {
          event.preventDefault();
          if (!savingDecision) setDecisionTarget(null);
        }}
      >
        <form onSubmit={submitDecision}>
          <h3 id="appointment-decision-title">
            {decisionAction === 'approve'
              ? 'Approve appointment?'
              : 'Deny appointment?'}
          </h3>

          <p>
            {decisionTarget.donor
              ? `${decisionTarget.donor.firstName || ''} ${
                  decisionTarget.donor.lastName || ''
                }`.trim()
              : 'This donor'}
            {' — '}
            {new Date(decisionTarget.date).toLocaleString()}
          </p>

          {decisionAction === 'approve' ? (
            <p>
              Confirm that your facility can accommodate this donor
              at the scheduled date and time.
            </p>
          ) : (
            <>
              <label htmlFor="appointment-denial-reason">
                Reason for not being able to accommodate
              </label>

              <select
                id="appointment-denial-reason"
                className="form-control"
                value={denialReason}
                onChange={(event) => {
                  setDenialReason(event.target.value);
                  setDecisionNote('');
                  setDecisionError('');
                }}
                required
                disabled={savingDecision}
              >
                <option value="" disabled>Select a reason</option>
                <option value="Fully booked">Fully booked</option>
                <option value="Staff unavailable">Staff unavailable</option>
                <option value="Equipment unavailable">Equipment unavailable</option>
                <option value="Facility temporarily closed">
                  Facility temporarily closed
                </option>
                <option value="Other">Other</option>
              </select>

              {denialReason === 'Other' && (
                <>
                  <label htmlFor="appointment-decision-reason">
                    Please explain
                  </label>

                  <textarea
                    id="appointment-decision-reason"
                    rows={4}
                    required
                    maxLength={1000}
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                    placeholder="Enter the reason for denying this appointment."
                    disabled={savingDecision}
                  />
                </>
              )}
            </>
          )}

          {decisionError && <p role="alert">{decisionError}</p>}

          <div className="cancel-modal__actions">
            <button
              type="button"
              className="cancel-modal__back"
              disabled={savingDecision}
              onClick={() => setDecisionTarget(null)}
              autoFocus
            >
              Go Back
            </button>

            <button
              type="submit"
              className="cancel-modal__confirm"
              disabled={
                savingDecision ||
                (
                  decisionAction === 'deny' &&
                  (
                    !denialReason ||
                    (denialReason === 'Other' && !decisionNote.trim())
                  )
                )
              }
            >
              {savingDecision
                ? 'Saving…'
                : decisionAction === 'approve'
                  ? 'Confirm Approval'
                  : 'Confirm Denial'}
            </button>
          </div>
        </form>
      </dialog>
    )}
    </section>
  );
}

export default StaffAppointments;