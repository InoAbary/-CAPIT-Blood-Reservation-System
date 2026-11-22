import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../styles/BranchAdmin.css';
import '../styles/CancelModal.css';
import { Trans } from 'react-i18next';

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

const APPOINTMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'attended', label: 'Attended' },
  { value: 'completed', label: 'Completed' },
  { value: 'no_show', label: 'No-show' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'denied', label: 'Denied' },
];

const STATUS_LABEL = { no_show: 'No-show', attended: 'Attended', completed: 'Completed' };

const DECISION_LABELS = {
  approve: { title: 'Approve appointment?', confirm: 'Confirm Approval', notice: 'Appointment approved.' },
  deny: { title: 'Deny appointment?', confirm: 'Confirm Denial', notice: 'Appointment denied.' },
  attend: { title: 'Confirm attendance?', confirm: 'Confirm attendance', notice: 'Attendance recorded.' },
};

const manilaDay = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function canMarkAttended(appointment) {
  const scheduledTime = Date.parse(appointment.date);
  return ['approved', 'no_show'].includes(appointment.status) &&
    Number.isFinite(scheduledTime) &&
    manilaDay.format(scheduledTime) === manilaDay.format(Date.now());
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function StaffAppointments() {
  const [status, setStatus] = useState('pending');
  const [sortOrder, setSortOrder] = useState('oldest');
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
  const [detailTarget, setDetailTarget] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const detailDialog = useRef(null);

  useEffect(() => {
    if (decisionTarget && decisionDialog.current &&
        !decisionDialog.current.open) {
      decisionDialog.current.showModal();
    }
  }, [decisionTarget]);

  useEffect(() => {
    if (
      detailTarget &&
      detailDialog.current &&
      !detailDialog.current.open
    ) {
      detailDialog.current.showModal();
    }
  }, [detailTarget]);

  const openDetails = async (appointment) => {
    setDetailTarget(appointment);
    setDetailData(null);
    setDetailError('');
    setDetailLoading(true);
  
    try {
      const result = await request(
        `/api/appointments/staff-appointments/${appointment._id}/details`
      );
  
      setDetailData(result);
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

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
  
      window.dispatchEvent(new Event('pending-counts-changed'));
      setDecisionTarget(null);
      setDecisionNote('');
      setNotice(DECISION_LABELS[decisionAction].notice);
  
      await load();
    } catch (err) {
      setDecisionError(err.message);
    } finally {
      setSavingDecision(false);
    }
  };

  const sortedAppointments = sortOrder === 'oldest'
  ? appointments
  : [...appointments].reverse();

  return (
    <section className="content-card">
      <h2 className="card-title">Appointments</h2>
      <p className="card-subtitle">Review donor appointment requests for your facility.</p>

      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {notice && <p className="form-message" role="status">{notice}</p>}

      <div className="staff-appointment-filters">
  <div className="form-group">
    <label htmlFor="staff-appointment-status">Status</label>
    <select
      id="staff-appointment-status"
      className="form-control"
      value={status}
      onChange={event => setStatus(event.target.value)}
    >
      {APPOINTMENT_STATUS_OPTIONS.map(({ value, label }) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
  </div>

  <div className="form-group">
      <label htmlFor="staff-appointment-order">Date order</label>
      <select
        id="staff-appointment-order"
        className="form-control"
        value={sortOrder}
        onChange={event => setSortOrder(event.target.value)}
      >
        <option value="oldest">Oldest first</option>
        <option value="newest">Newest first</option>
      </select>
    </div>
  </div>

      {loading ? (
        <p>Loading appointments…</p>
      ) : appointments.length === 0 ? (
        <p className="muted">Nothing to show here.</p>
      ) : (
        <div className="appt-table-wrap">
         <table className="appt-table staff-appt-table">
            <thead>
              <tr>
                <th>Donor</th>
                <th>Blood type</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
            {sortedAppointments.map((a) => (
                <tr key={a._id}>
                  <td>
                    <strong>
                      {a.donor
                        ? `${a.donor.firstName || ''} ${a.donor.lastName || ''}`.trim() || a.donor.email
                        : 'Unknown donor'}
                    </strong>
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
                    
                  </td>
                  <td>
                    <span className="appt-time">
                      {new Date(a.date).toLocaleTimeString([], { timeStyle: 'short' })}
                    </span>
                  </td>
                  <td>
                  <span className={`status-badge status-${a.status}`}>
                  {STATUS_LABEL[a.status] || a.status}
                </span>
                  </td>
                  <td>
                    <div className="appt-actions">
                      <button
                        type="button"
                        className="appt-view-btn"
                        onClick={() => openDetails(a)}
                        aria-label={`View details for ${
                          a.donor?.firstName || 'donor'
                        }`}
                        title="View donor and prescreening details"
                      >
                        <EyeIcon />
                      </button>
                      {canMarkAttended(a) && (
                          <button
                            type="button"
                            className="btn-action"
                            disabled={savingDecision}
                            onClick={() => {
                              setDecisionAction('attend');
                              setDecisionTarget(a);
                              setDecisionError('');
                            }}
                          >
                            Mark attended
                          </button>
                        )}
                      {a.status === 'pending' && ( <>
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
                      </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailTarget && (
        <dialog
          ref={detailDialog}
          className="appointment-details-modal"
          onCancel={(event) => {
            event.preventDefault();
            setDetailTarget(null);
            setDetailData(null);
          }}
        >
          <div className="appointment-details-content">

            <div className="appointment-details-header">
              <div>
                <h3>Donor & Prescreening Details</h3>
                <p>
                  Review the donor information and submitted prescreening form.
                </p>
              </div>

              <button
                type="button"
                className="appointment-details-close"
                onClick={() => {
                  setDetailTarget(null);
                  setDetailData(null);
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {detailLoading ? (
              <p>Loading details…</p>
            ) : detailError ? (
              <p className="form-message error-message">
                {detailError}
              </p>
            ) : detailData ? (
              <>
                <section className="appointment-details-section">
                  <h4>Donor Information</h4>

                  <div className="donor-details-grid">
                    <div>
                      <span>Full name</span>
                      <strong>
                        {[
                          detailData.appointment.donor?.firstName,
                          detailData.appointment.donor?.middleName,
                          detailData.appointment.donor?.lastName,
                        ]
                          .filter(Boolean)
                          .join(' ') || '—'}
                      </strong>
                    </div>

                    <div>
                      <span>Donor ID</span>
                      <strong>
                        {detailData.appointment.donor?.donorID || '—'}
                      </strong>
                    </div>

                    <div>
                      <span>Blood type</span>
                      <strong>
                        {detailData.appointment.donor?.bloodType || '—'}
                      </strong>
                    </div>

                    <div>
                      <span>Age</span>
                      <strong>
                        {detailData.appointment.donor?.age ?? '—'}
                      </strong>
                    </div>

                    <div>
                      <span>Sex</span>
                      <strong>
                        {detailData.appointment.donor?.sex || '—'}
                      </strong>
                    </div>

                    <div>
                      <span>Mobile</span>
                      <strong>
                        {detailData.appointment.donor?.mobileNumber || '—'}
                      </strong>
                    </div>

                    <div>
                      <span>Email</span>
                      <strong>
                        {detailData.appointment.donor?.email || '—'}
                      </strong>
                    </div>

                    <div>
                      <span>Appointment</span>
                      <strong>
                        {new Date(
                          detailData.appointment.date
                        ).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </section>

                {detailData.appointment.note?.trim() && (
                  <section className="appointment-details-section">
                    <h4>Appointment note</h4>
                    <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                      {detailData.appointment.note}
                    </p>
                  </section>
                )}
                <section className="appointment-details-section">
                  <div className="prescreen-heading">
                    <div>
                      <h4>Prescreening Form</h4>

                      {detailData.form?.createdAt && (
                        <p>
                          Submitted{' '}
                          {new Date(
                            detailData.form.createdAt
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {!detailData.form ? (
                    <p className="muted">
                      No prescreening form was found for this appointment.
                    </p>
                  ) : (
                    <div className="staff-prescreen-list">
                      {detailData.form.answers.map((answer) => (
                        <div
                          key={answer.qId}
                          className="staff-prescreen-row"
                        >
                          <div className="staff-prescreen-question">
                            <span className="staff-prescreen-question-number">
                              {answer.qId}
                            </span>

                            <span className="staff-prescreen-question-text">
                              <Trans
                                i18nKey={`questionnaire.q${answer.qId}`}
                                components={{ bold: <strong /> }}
                              />
                            </span>
                          </div>

                          <div
                            className={`staff-prescreen-answer ${
                              answer.result === true
                                ? 'answer-yes'
                                : answer.result === false
                                ? 'answer-no'
                                : 'answer-date'
                            }`}
                          >
                            <strong>
                              {answer.date
                                ? new Date(answer.date).toLocaleDateString()
                                : answer.result === true
                                ? 'Yes'
                                : answer.result === false
                                ? 'No'
                                : '—'}
                            </strong>

                            {answer.remarks && (
                              <small>
                                Remarks: {answer.remarks}
                              </small>
                            )}
                          </div>
                          
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : null}

          </div>
        </dialog>
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
          {DECISION_LABELS[decisionAction].title}
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

          {decisionAction === 'attend' ? (
            <p>Confirm that this donor arrived for their appointment.</p>
          ) : decisionAction === 'approve' ? (
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
              {savingDecision ? 'Saving…' : DECISION_LABELS[decisionAction].confirm}
            </button>
          </div>
        </form>
      </dialog>
    )}
    </section>
  );
}

export default StaffAppointments;