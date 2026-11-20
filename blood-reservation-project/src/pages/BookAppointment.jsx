import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useFormGate } from '../hooks/useFormGate';
import '../styles/BranchAdmin.css';
import '../styles/CancelModal.css';
import DonorSidebar from '../components/DonorSidebar';
import '../styles/Dashboard.css';
import '../styles/UI.css';
import { BellIcon } from '@heroicons/react/24/outline';

import { useDonationCooldown } from '../hooks/useDonationCooldown';

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
const TIME_OPTIONS = Array.from({ length: 19 }, (_, i) => {
  const h = String(Math.floor((i + 16) / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

// TODO: change to actual time later
const LAST_APPOINTMENT_TIME = '15:00';

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
  const location = useLocation();
  const linkedAppointmentId = new URLSearchParams(location.search).get('appointment');
  const navigate = useNavigate();
  const appointmentDraft = location.state?.appointmentDraft;
  const [appointments, setAppointments] = useState([]);
  const [appointmentTab, setAppointmentTab] = useState('upcoming');
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

  const cooldown = useDonationCooldown()

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
  
  const [time, setTime] = useState(appointmentDraft?.time || '');
  const [venue, setVenue] = useState(appointmentDraft?.venue || '');

  const { donor, loading: authLoading, logoutDonor } = useAuth();

  function handleChangeRole() {
    localStorage.removeItem('donorHubRole');
    navigate('/DonorDashboard');
  }
  
  async function handleLogout() {
    localStorage.removeItem('donorHubRole');
    await logoutDonor();
    navigate('/Login', { replace: true });
  }

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
    if (!venue || !minTimeToday) return [];
  
    return TIME_OPTIONS.filter(
      (t) => t >= minTimeToday && t <= LAST_APPOINTMENT_TIME
    );
  }, [venue, minTimeToday]);

  // Reset time if the current selection is no longer valid (e.g. switched back to today)
  useEffect(() => {
    if (time && !availableTimes.includes(time)) setTime('');
  }, [availableTimes, time]);

    const { upcoming, past } = useMemo(() => {
    const manilaDay = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const today = manilaDay.format(new Date());
    const upcoming = [];
    const past = [];
  
    for (const appointment of appointments) {
      const isOpen = ['pending', 'approved'].includes(appointment.status);
      const scheduledTime = Date.parse(appointment.date);
      const isTodayOrLater =
        Number.isFinite(scheduledTime) && manilaDay.format(scheduledTime) >= today;

      if (isOpen && isTodayOrLater) {
        upcoming.push(appointment);
      } else {
        past.push(appointment);
      }
    }
  
    return { upcoming, past };
  }, [appointments]);

  const showUpcoming = appointmentTab === 'upcoming';
  const visibleAppointments = showUpcoming ? upcoming : past;

  useEffect(() => {
    if (!linkedAppointmentId) return;

    if (past.some(a => String(a._id) === linkedAppointmentId)) {
      setAppointmentTab('history');
    } else if (upcoming.some(a => String(a._id) === linkedAppointmentId)) {
      setAppointmentTab('upcoming');
    }
  }, [linkedAppointmentId, location.key, upcoming, past]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!date || !time || !venue) {
      setError('Please choose a start time and venue.');
      return;
    }

    // Combine into a single local datetime
    const combined = new Date(`${date}T${time}:00`);
    if (Number.isNaN(combined.getTime()) || combined.getTime() <= Date.now()) {
      setError('Please choose a future date and time.');
      return;
    }
    if (formStatus === 'loading') {
      setError('Please wait while we check your prescreening status.');
      return;
    }
    
    if (formStatus === 'error') {
      setError(
        formError ||
        'Could not verify your prescreening status. Please try again later.'
      );
      return;
    }

    if (formStatus === 'needsForm') {
      navigate('/BloodDonorForm', {
        state: {
          returnTo: location.pathname,
          reason: 'appointment',
          appointmentDraft: {
            time,
            venue,
          },
        },
      });
    
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
        </td>
        <td>
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

  if (cooldown.status === 'loading') return <p>Checking donation eligibility…</p>;

  if (cooldown.status === 'blocked') {
    return (
      <Navigate
        to="/DonationCooldown"
        replace
        state={{
          returnTo: location.pathname,
          lastDonationDate: cooldown.lastDonationDate,
          nextEligibleDate: cooldown.nextEligibleDate,
        }}
      />
    );
  }

  if (cooldown.status === 'error') {
    return (
      <div className="dashboard-container">
        <main className="dashboard-content">
          <div className="content-card">
            <p className="form-message error-message" role="alert">
              {cooldown.error || 'Could not verify donation eligibility. Please try again later.'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (

    
    
      <div className="dashboard-container donor-theme ui-dashboard">

        <DonorSidebar
          role="donor"
          firstName={donor?.firstName}
          onChangeRole={handleChangeRole}
          onLogout={handleLogout}
        />

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

      
      <header className="ui-page-header ui-page-header--card">
        <div className="ui-page-header-copy">
          <h1>Book Appointment</h1>
          <p>Choose a venue and preferred start time. Staff will review your request.</p>
        </div>

        <button
          type="button"
          disabled
          aria-label="Notifications unavailable"
          title="Notifications coming soon"
          className="grid size-10 shrink-0 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-[#063b82]"
        >
          <BellIcon className="size-5" aria-hidden="true" />
        </button>
      </header>

      <div className="appointment-container content-card">

      {error && <p className="form-message error-message" role="alert">{error}</p>}

      {formStatus === 'error' && (
        <p className="form-message error-message" role="alert">
          {formError || 'Could not verify your prescreening status. Please try again.'}
        </p>
      )}

      {notice && <p className="form-message" role="status">{notice}</p>}

      <form className="appointment-form" onSubmit={handleSubmit}>
        <label>
          Preferred Date
          <input
            type="date"
            value={date}
            min={today}
            disabled
          />
        </label>

        <label>
          Donation Venue
          <select
            value={venue}
            onChange={(e) => {
              setVenue(e.target.value);
              setTime('');
            }}
            required
          >
            <option value="">Select a venue…</option>

            {venues.map((v) => (
              <option key={v._id} value={v._id}>
                {v.facilityName} — {v.address}
              </option>
            ))}
          </select>
        </label>

        <label>
          Preferred Start Time
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            disabled={!venue || availableTimes.length === 0}
            aria-describedby={venue ? 'appointment-hours' : undefined}
          >
            <option value="">
              {!venue
                ? 'Select a venue first…'
                : availableTimes.length === 0
                ? 'No appointment times remaining today'
                : 'Select a time…'}
            </option>

            {availableTimes.map((t) => (
              <option key={t} value={t}>
                {formatTimeLabel(t)}
              </option>
            ))}
          </select>
        </label>


        <button type="submit" className="btn-action" disabled={
            submitting ||
            formStatus === 'loading' ||
            formStatus === 'error'
          }
        >
          {submitting
            ? 'Sending…'
            : formStatus === 'needsForm'
            ? 'Continue to prescreening'
            : 'Request appointment'}
        </button>

        {venue && (
          <dl className="appointment-hours" id="appointment-hours">
            <div>
              <dt>Donation hours</dt>
              <dd>8:00 AM–5:00 PM</dd>
            </div>
            <div>
              <dt>Last appointment starts</dt>
              <dd>{formatTimeLabel(LAST_APPOINTMENT_TIME)}</dd>
            </div>
          </dl>
        )}

      </form>

        <section className="appointment-section" aria-label="Appointments">
        <div className="segmented-tabs" role="group" aria-label="Appointment view">
          <button
            type="button"
            className={`segmented-btn${showUpcoming ? ' segmented-btn--active' : ''}`}
            aria-pressed={showUpcoming}
            onClick={() => setAppointmentTab('upcoming')}
          >
            Upcoming
          </button>

          <button
            type="button"
            className={`segmented-btn${!showUpcoming ? ' segmented-btn--active' : ''}`}
            aria-pressed={!showUpcoming}
            onClick={() => setAppointmentTab('history')}
          >
            History
          </button>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : visibleAppointments.length === 0 ? (
          <p className="muted">
            {showUpcoming ? 'No upcoming appointments.' : 'No appointment history yet.'}
          </p>
        ) : (
          <div className="appt-table-wrap">
            <table className="appt-table" aria-label={showUpcoming ? 'Upcoming appointments' : 'Appointment history'}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Venue</th>
                  <th>Staff</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>{visibleAppointments.map(renderRow)}</tbody>
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