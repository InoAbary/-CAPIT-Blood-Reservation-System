import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
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

function BookAppointment() {
  const [appointments, setAppointments] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');

  const { donor, loading: authLoading } = useAuth();

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

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

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
      setDate('');
      setTime('');
      setVenue('');
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    setError('');
    setNotice('');
    try {
      await request(`/api/appointments/${id}/cancel`, { method: 'PATCH' });
      setNotice('Appointment cancelled.');
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const renderAppointment = (a) => (
    <li key={a._id} className="appointment-item">
      <div>
        <strong>
          {new Date(a.date).toLocaleString([], {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </strong>
        <span className="appointment-venue">
          {a.venue?.facilityName || 'Venue unavailable'}
        </span>
        {a.note && <span className="appointment-note">Note: {a.note}</span>}
      </div>
      <div className="appointment-right">
        <span className={`status-badge status-${a.status}`}>
          {STATUS_LABEL[a.status] || a.status}
        </span>
        {['pending', 'approved'].includes(a.status) && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleCancel(a._id)}
          >
            Cancel
          </button>
        )}
      </div>
    </li>
  );

  if (authLoading) return <p>Loading…</p>;
  if (!donor) return <p>Please log in as a donor to book an appointment.</p>;

  return (
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
            onChange={(e) => setDate(e.target.value)}
            required
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
          <ul className="appointment-list">{upcoming.map(renderAppointment)}</ul>
        )}
      </section>

      <section className="appointment-section">
        <h3>History</h3>
        {loading ? (
          <p>Loading…</p>
        ) : past.length === 0 ? (
          <p className="muted">No past appointments.</p>
        ) : (
          <ul className="appointment-list">{past.map(renderAppointment)}</ul>
        )}
      </section>
    </div>
  );
}

export default BookAppointment;