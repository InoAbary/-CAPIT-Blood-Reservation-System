import React, { useCallback, useEffect, useState } from 'react';
import '../styles/BranchAdmin.css';

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
  const [denyTarget, setDenyTarget] = useState(null);
  const [denyNote, setDenyNote] = useState('');

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

  const decide = async (id, action, note) => {
    setError('');
    setNotice('');
    try {
      await request(`/api/appointments/staff-appointments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, note }),
      });
      setNotice(action === 'approve' ? 'Appointment approved.' : 'Appointment denied.');
      setDenyTarget(null);
      setDenyNote('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitDeny = async () => {
    if (!denyTarget) return;
    await decide(denyTarget._id, 'deny', denyNote.trim() || undefined);
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
        <ul className="appointment-list">
          {appointments.map((a) => (
            <li key={a._id} className="appointment-item">
              <div>
                <strong>
                  {a.donor
                    ? `${a.donor.firstName || ''} ${a.donor.lastName || ''}`.trim() || a.donor.email
                    : 'Unknown donor'}
                </strong>
                <span className="appointment-venue">
                  {new Date(a.date).toLocaleString()}
                </span>
                {a.donor?.bloodType && (
                  <span className="appointment-venue">Blood type: {a.donor.bloodType}</span>
                )}
                {a.note && <span className="appointment-note">Note: {a.note}</span>}
              </div>
              <div className="appointment-right">
                <span className={`status-badge status-${a.status}`}>{a.status}</span>
                {a.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      className="btn-action"
                      onClick={() => decide(a._id, 'approve')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setDenyTarget(a);
                        setDenyNote('');
                      }}
                    >
                      Deny
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {denyTarget && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Deny appointment?</h3>
            <p>
              {denyTarget.donor
                ? `${denyTarget.donor.firstName || ''} ${denyTarget.donor.lastName || ''}`.trim()
                : 'This donor'}{' '}
              on {new Date(denyTarget.date).toLocaleString()}
            </p>
            <label>
              Reason (optional)
              <textarea
                rows={3}
                value={denyNote}
                onChange={(e) => setDenyNote(e.target.value)}
                placeholder="e.g. Fully booked that day"
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setDenyTarget(null)}>
                Cancel
              </button>
              <button type="button" className="btn-action" onClick={submitDeny}>
                Confirm deny
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default StaffAppointments;