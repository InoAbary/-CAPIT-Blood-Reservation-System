import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useFormGate } from '../hooks/useFormGate';
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

const STATUS_LABEL = {
  pending: 'Awaiting staff review',
  approved: 'Approved',
  denied: 'Denied',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

// 30-minute interval time options: "00:00", "00:30", … "23:30"
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

// Display as "8:00 AM", "12:30 PM", etc.
function formatTimeLabel(value) {
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function staffLabel(a) {
    const s = a.assocStaff;
    if (!s) return null;
    if (typeof s === 'string') return s; // if API just returns a name/id string
    
    const name = `${s.firstName || ''} ${s.lastName || ''}`.trim();
    return name || s.email || s.name || null;
  }


function BookAppointment() {
  const [appointments, setAppointments] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [cancelId, setCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState ('');
  const [cancelling, setCancelling] = useState(false);
  const cancelDialog = useRef(null);

  useEffect(() => {
    if(cancelId && cancelDialog.current && !cancelDialog.current.open){
      cancelDialog.current.showModal();
    }
  }, [cancelId]);

  const [date, setDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');

  const { donor, loading: authLoading } = useAuth();

  const { status: formStatus, error: formError } = useFormGate();

  
  const loadAll = useCallback(async () => {
    const [apptResult, venueResult] = await Promise.all([
      request('/api/appointments'),
      request('/api/appointments/venues'),
    ]);
    setAppointments(apptResult.appointments || []);
    setVenues(venueResult.venues || []);
  }, []);

  useEffect(() => {
    if (authLoading || !donor) return;
    let current = true;
    setLoading(true);
    loadAll()
      .catch((err) => current && setError(err.message))
      .finally(() => current && setLoading(false));
      
    return () => {
      current = false;
    };
  }, [loadAll, authLoading, donor]);


  const today = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  

  // Minimum time today: next 30-min slot after now (or first slot tomorrow if past 23:30)
  const minTimeToday = useMemo(() => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const next = Math.ceil((minutes + 1) / 30) * 30; // strictly after now
    if (next >= 24 * 60) return ''; // no valid time left today
    const h = String(Math.floor(next / 60)).padStart(2, '0');
    const m = next % 60 === 0 ? '00' : '30';
    return `${h}:${m}`;
  }, []);

  const availableTimes = useMemo(() => {
    if (date !== today) return TIME_OPTIONS;
    if (!minTimeToday) return [];
    return TIME_OPTIONS.filter((t) => t >= minTimeToday);
  }, [date, today, minTimeToday]);

  // Reset time if the current selection is no longer valid (e.g. switched back to today)
  useEffect(() => {
    if (time && !availableTimes.includes(time)) setTime('');
  }, [availableTimes, time]);

  const upcoming = useMemo(
    () => appointments.filter((a) => new Date(a.date) >= new Date(new Date().toDateString())),
    [appointments]
  );
  const past = useMemo(
    () => appointments.filter((a) => new Date(a.date) < new Date(new Date().toDateString())),
    [appointments]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!date || !time || !venue) {
      setError('Please choose a date, start time, and venue.');
      return;
    }

    // Combine into a single local datetime
    const combined = new Date(`${date}T${time}:00`);
    if (Number.isNaN(combined.getTime()) || combined.getTime() <= Date.now()) {
      setError('Please choose a future date and time.');
      return;
    }

    setSubmitting(true);
    try {
      await request('/api/appointments/send-appointment', {
        method: 'POST',
        body: JSON.stringify({ date: combined.toISOString(), venue }),
      });
      setNotice('Appointment request sent. Staff will review it shortly.');
      setTime('');
      setVenue('');
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (event) => {
    event.preventDefault();
    if (cancelling) return;
  
    const note = cancelReason.trim();
  
    if (!note || note.length > 1000) {
      setCancelError('Enter a cancellation reason of 1–1000 characters.');
      return;
    }
  
    setCancelling(true);
    setCancelError('');
    setError('');
    setNotice('');
  
    try {
      const result = await request(`/api/appointments/${cancelId}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ note }),
      });
  
      setAppointments(current => current.map(appointment =>
        appointment._id === cancelId ? result.appointment : appointment
      ));
  
      setCancelId(null);
      setCancelReason('');
      setNotice('Appointment cancelled.');
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const renderRow = (a) => {
    const staff = staffLabel(a);
    return (
      <tr key={a._id}>
        <td>
          <span className="appt-date">
            {new Date(a.date).toLocaleDateString([], { dateStyle: 'medium' })}
          </span>
          <span className="appt-time">
            {new Date(a.date).toLocaleTimeString([], { timeStyle: 'short' })}
          </span>
        </td>
        <td>{a.venue?.facilityName || 'Venue unavailable'}</td>
        <td>
          {staff ? (
            <span className="appt-staff">
              <span className="appt-staff-name">{staff}</span>
            </span>
          ) : a.status === 'pending' ? (
            <span className="muted">Awaiting assignment</span>
          ) : (
            <span className="muted">—</span>
          )}
        </td>
        <td>
          <span className={`status-badge status-${a.status}`}>
            {STATUS_LABEL[a.status] || a.status}
          </span>
          {a.note && <span className="appt-note">Note: {a.note}</span>}
        </td>
        <td>
          {['pending', 'approved'].includes(a.status) ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setCancelId(a._id);
                setCancelReason('');
                setCancelError('');
              }}
            >
              Cancel
            </button>
          ) : (
            <span className="muted">—</span>
          )}
        </td>
      </tr>
    );
  };

  if (authLoading) return <p>Loading...</p>;
  if (!donor) return <p>Please log in as a donor to book an appointment.</p>

  if (formStatus === 'loading') {
    return <p>Checking form eligibility...</p>
  }

  if (formStatus === 'error') {
    return (
      <div className="dashboard-container top-menu-layout">

        <main className="dashboard-content">
          <div className="content-card">
            <p className="form-message error-message" role="alert">
              {formError || 'Could not verify your form status. Please try again later.'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (formStatus === 'needsForm') {
    // Redirect to the blood donor form; remember where to send them back.
    return (
      <Navigate
        to="/BloodDonorForm"
        replace
        state={{ returnTo: location.pathname, reason: 'appointment' }}
      />
    );
  }

  return (

    
    
      <div className="dashboard-container top-menu-layout">

        <header className="dashboard-menu">
            <div className="dashboard-logo"><h2>Donor Hub</h2></div>
            <nav className="nav-links" aria-label="Donor navigation">
            <Link className="nav-link" to="/DonorDashboard">Back to dashboard</Link>
            <Link className="nav-link" to="/donor/profile" aria-current="page">Profile Settings</Link>
            </nav>
        </header>

        {cancelId && (
            <dialog
            ref={cancelDialog}
            className="cancel-modal"
            
            aria-labelledby="cancel-appointment-title"
            onCancel={(event) => {
              event.preventDefault();
              if (!cancelling) setCancelId(null);
            }}
          >
            <form onSubmit={handleCancel}>
              <h3 id="cancel-appointment-title">Cancel appointment?</h3>

              <label htmlFor="cancel-appointment-reason"> Reason for cancellation (Required): </label>

              <textarea id="cancel-appointment-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} required maxLength={1000} rows={4} autoFocus disabled={cancelling} style={{ width: '100%', boxSizing: 'border-box' }}/>

              {cancelError && <p role="alert">{cancelError}</p>}

              <div className="cancel-modal__actions">
                <button
                  type="button"
                  className="cancel-modal__back"
                  disabled={cancelling}
                  onClick={() => setCancelId(null)}
                >
                  Keep Appointment
                </button>

                <button
                  type="submit"
                  className="cancel-modal__confirm"
                  disabled={cancelling || !cancelReason.trim()}
                >
                  {cancelling ? 'Cancelling…' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </dialog>
        )}

      
      <main className="dashboard-content">
      <div className="appointment-container content-card">
      <h2 className="card-title">Book a Blood Donation Appointment</h2>
      <p className="card-subtitle">
        Pick a venue, date, and start time. Your request will be pending until staff confirm it.
      </p>

      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {notice && <p className="form-message" role="status">{notice}</p>}

      <form className="appointment-form" onSubmit={handleSubmit}>
        <label>
          Date
          <input
            type="date"
            value={date}
            min={today}
            disabled
          />
        </label>

        <label>
          Start time
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            disabled={!date || availableTimes.length === 0}
          >
            <option value="">
              {!date
                ? 'Select a date first…'
                : availableTimes.length === 0
                ? 'No slots left today'
                : 'Select a time…'}
            </option>
            {availableTimes.map((t) => (
              <option key={t} value={t}>
                {formatTimeLabel(t)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Venue
          <select value={venue} onChange={(e) => setVenue(e.target.value)} required>
            <option value="">Select a venue…</option>
            {venues.map((v) => (
              <option key={v._id} value={v._id}>
                {v.facilityName} — {v.address}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="btn-action" disabled={submitting}>
          {submitting ? 'Sending…' : 'Request appointment'}
        </button>
      </form>

      <section className="appointment-section">
        <h3>Upcoming</h3>
        {loading ? (
          <p>Loading…</p>
        ) : upcoming.length === 0 ? (
          <p className="muted">No upcoming appointments.</p>
        ) : (
          <div className="appt-table-wrap">
            <table className="appt-table">
              <thead>
                <tr>
                  <th>Date &amp; time</th>
                  <th>Venue</th>
                  <th>Staff</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>{upcoming.map(renderRow)}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="appointment-section">
        <h3>History</h3>
        {loading ? (
          <p>Loading…</p>
        ) : past.length === 0 ? (
          <p className="muted">No past appointments.</p>
        ) : (
          <div className="appt-table-wrap">
            <table className="appt-table">
              <thead>
                <tr>
                  <th>Date &amp; time</th>
                  <th>Venue</th>
                  <th>Staff</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>{past.map(renderRow)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
    </main>
  </div>
  );
}

export default BookAppointment;