
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Dashboard.css';

const STATUS_STYLES = {
  pending:   { bg: '#fef3c7', fg: '#92400e', label: 'Pending' },
  approved:  { bg: '#dcfce7', fg: '#166534', label: 'Approved' },
  completed: { bg: '#dbeafe', fg: '#1e40af', label: 'Completed' },
};

export default function StaffDonorForms() {
  const [state, setState] = useState({ loading: true, error: null, forms: [] });
  const [openForm, setOpenForm] = useState(null); // form id whose detail panel is open

  useEffect(() => {
    let cancelled = false;
    fetch('/api/bloodForm/donor-forms-today', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: null, forms: data.forms ?? [] });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: err.message, forms: [] });
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="dashboard-container">
      

      <main className="dashboard-content">
        <div className="content-placeholder">
          <h1>Donor Forms — Today</h1>
          <p>Screening forms submitted today by donors with an appointment at your facility.</p>

          {state.loading && <p>Loading…</p>}

          {state.error && (
            <div className="info-card" role="alert">
              <h3>Could not load forms</h3>
              <p>{state.error}</p>
            </div>
          )}

          {!state.loading && !state.error && state.forms.length === 0 && (
            <div className="info-card">
              <h3>No forms today</h3>
              <p>No donor screening forms have been submitted at this facility yet.</p>
            </div>
          )}

          {!state.loading && !state.error && state.forms.length > 0 && (
            <>
              <div className="info-card" style={{ marginBottom: '1.5rem' }}>
                <h3>Total forms</h3>
                <p className="stat">{state.forms.length}</p>
              </div>

              <div className="forms-table-wrap">
                <table className="forms-table">
                  <thead>
                    <tr>
                      <th>Submitted</th>
                      <th>Donor</th>
                      <th>Blood type</th>
                      <th>Appointment</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {state.forms.map((f) => {
                      const donor = f.donor;
                      const appt = f.appointment;
                      const status = appt?.status;
                      const badge = status ? STATUS_STYLES[status] : null;
                      return (
                        <tr key={f._id}>
                          <td>{new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td>
                            {donor
                              ? `${donor.lastName}, ${donor.firstName}${donor.donorID ? ` (${donor.donorID})` : ''}`
                              : <em>Unknown donor</em>}
                          </td>
                          <td>{donor?.bloodType ?? '—'}</td>
                          <td>
                            {appt
                              ? new Date(appt.date).toLocaleDateString()
                              : <em>No appointment</em>}
                          </td>
                          <td>
                            {badge
                              ? <span className="status-pill" style={{ background: badge.bg, color: badge.fg }}>{badge.label}</span>
                              : '—'}
                          </td>
                          <td>
                            <button
                              className="quick-action-btn secondary"
                              style={{ width: 'auto', padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
                              onClick={() => setOpenForm(openForm === f._id ? null : f._id)}
                            >
                              {openForm === f._id ? 'Hide' : 'View answers'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Inline detail panel — expand the row instead of a separate route */}
              {openForm && (() => {
                const form = state.forms.find((f) => f._id === openForm);
                if (!form) return null;
                return (
                  <div className="info-card" style={{ marginTop: '1.5rem' }}>
                    <h3>Answers — {form.donor ? `${form.donor.firstName} ${form.donor.lastName}` : 'Unknown donor'}</h3>
                    <ul className="answers-list">
                      {form.answers.map((a) => (
                        <li key={a.qId}>
                          <strong>Q{a.qId}:</strong>{' '}
                          {a.date
                            ? new Date(a.date).toLocaleDateString()
                            : a.result === true ? 'Yes'
                            : a.result === false ? 'No'
                            : '—'}
                          {a.remarks && <span className="answer-remarks"> — {a.remarks}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </main>
    </div>
  );
}