import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useFormGate } from '../hooks/useFormGate';
import '../styles/BranchAdmin.css';
import '../styles/CancelModal.css';
import DonorSidebar from '../components/DonorSidebar';
import ChangeLocationModal from '../components/ChangeLocationModal';
import { PinIcon } from '../components/Icons';
import { readLocatorPreferences, saveLocatorPreferences } from '../utils/locatorPreferences';
import '../styles/Dashboard.css';
import '../styles/UI.css';
import '../styles/BookAppointment.css';
import { BellIcon, EyeIcon } from '@heroicons/react/24/outline';

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

function distanceKmBetween(lat1, lon1, lat2, lon2) {
  const coordinates = [lat1, lon1, lat2, lon2].map(Number);
  if (!coordinates.every(Number.isFinite)) return null;
  const [aLat, aLon, bLat, bLon] = coordinates;
  const toRadians = (value) => (value * Math.PI) / 180;
  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLon - aLon);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLon / 2) ** 2;
  return Number((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

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
  const [detailAppointment, setDetailAppointment] = useState(null);
  const detailsDialog = useRef(null);

  useEffect(() => {
    const dialog = detailsDialog.current;
    if (detailAppointment && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [detailAppointment]);

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
  const [venueSearch, setVenueSearch] = useState('');
  const [venuePickerOpen, setVenuePickerOpen] = useState(false);
  const venuePickerRef = useRef(null);
  const [locationOrigin, setLocationOrigin] = useState(() => {
    const saved = readLocatorPreferences().currentOrigin;
    return saved && Number.isFinite(Number(saved.lat)) && Number.isFinite(Number(saved.lon))
      ? { ...saved, lat: Number(saved.lat), lon: Number(saved.lon) }
      : null;
  });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

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
    const [apptResult, venueResult, facilityResult] = await Promise.all([
      request('/api/appointments'),
      request('/api/appointments/venues'),
      request('/api/facilities').catch(() => ({ facilities: [] })),
    ]);
    setAppointments(apptResult.appointments || []);
    const coordinatesById = new Map((facilityResult.facilities || []).map((facility) => [String(facility._id), facility]));
    setVenues((venueResult.venues || []).map((venueItem) => {
      const directoryFacility = coordinatesById.get(String(venueItem._id));
      return {
        ...venueItem,
        lat: venueItem.lat ?? directoryFacility?.lat,
        lon: venueItem.lon ?? directoryFacility?.lon,
      };
    }));
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

  const venuesWithDistance = useMemo(() => venues.map((facility) => {
    const distance = locationOrigin
      ? distanceKmBetween(locationOrigin.lat, locationOrigin.lon, facility.lat, facility.lon)
      : null;
    return {
      ...facility,
      distanceKm: distance,
      travelMinutes: distance === null ? null : Math.max(5, Math.round(distance * 2.8)),
    };
  }).sort((a, b) => {
    if (a.distanceKm === null) return b.distanceKm === null ? 0 : 1;
    if (b.distanceKm === null) return -1;
    return a.distanceKm - b.distanceKm;
  }), [venues, locationOrigin]);

  const selectedVenue = venuesWithDistance.find((facility) => String(facility._id) === String(venue));
  const hasVenueDistance = venuesWithDistance.some((facility) => facility.distanceKm !== null);
  const matchingVenues = venuesWithDistance.filter((facility) => {
    const query = venueSearch.trim().toLowerCase();
    return !query || `${facility.facilityName || ''} ${facility.address || ''}`.toLowerCase().includes(query);
  });

  useEffect(() => {
    if (!venuePickerOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!venuePickerRef.current?.contains(event.target)) setVenuePickerOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [venuePickerOpen]);

  const selectVenue = (selected) => {
    setVenue(selected._id);
    setTime('');
    setVenueSearch('');
    setVenuePickerOpen(false);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location services are not supported by this browser.');
      return;
    }
    setLocationError('');
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      const lat = position?.coords?.latitude;
      const lon = position?.coords?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        setLocationError('Your device did not return a valid location. Please try again.');
        setIsLocating(false);
        return;
      }
      const nextOrigin = {
        name: 'Current location',
        lat,
        lon,
      };
      setLocationOrigin(nextOrigin);
      saveLocatorPreferences({ currentOrigin: nextOrigin });
      setIsLocating(false);
      setShowLocationModal(false);
    }, (geoError) => {
      setLocationError(geoError.code === geoError.PERMISSION_DENIED
        ? 'Location access was denied. You can search for a place instead.'
        : 'Could not get your location. Please try again or search for a place.');
      setIsLocating(false);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };

  const handleSelectLocation = (nextOrigin) => {
    const normalized = { ...nextOrigin, lat: Number(nextOrigin.lat), lon: Number(nextOrigin.lon) };
    setLocationOrigin(normalized);
    saveLocatorPreferences({ currentOrigin: normalized });
    setLocationError('');
    setShowLocationModal(false);
  };

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
          <span className={`status-badge status-${a.status}`}>
            {STATUS_LABEL[a.status] || a.status}
          </span>
        </td>
        <td>
          <div className="flex items-center gap-2">
          <button
            type="button"
            className="appointment-view-button"
            onClick={() => setDetailAppointment(a)}
          >
            <EyeIcon className="size-4 shrink-0" aria-hidden="true" />
          </button>
          </div>
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
        <div className="appointment-location-toolbar">
          <span className="appointment-location-hint" title={locationOrigin?.name || undefined}>
            {locationOrigin
              ? hasVenueDistance
                ? `Sorted nearest from ${locationOrigin.name || 'current location'}`
                : 'Venue distances are unavailable.'
              : 'Set a location to see distance and estimated travel time.'}
          </span>
          <button type="button" className="appointment-location-button" onClick={() => setShowLocationModal(true)}>
            <PinIcon size={14} />
            {locationOrigin ? 'Change location' : 'Set location'}
          </button>
        </div>

        <label>
          Preferred Date
          <input
            type="date"
            value={date}
            min={today}
            disabled
          />
        </label>

        <div className="appointment-venue-field">
          <span>Donation Venue</span>
          <div className="appointment-venue-picker" ref={venuePickerRef}>
            <input
              type="search"
              role="combobox"
              value={venuePickerOpen ? venueSearch : selectedVenue?.facilityName || ''}
              onFocus={() => {
                setVenueSearch('');
                setVenuePickerOpen(true);
              }}
              onChange={(event) => {
                setVenueSearch(event.target.value);
                setVenuePickerOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setVenuePickerOpen(false);
                  setVenueSearch('');
                }
                if (event.key === 'Enter' && venuePickerOpen && matchingVenues[0]) {
                  event.preventDefault();
                  selectVenue(matchingVenues[0]);
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setVenuePickerOpen(true);
                  window.setTimeout(() => document.getElementById('appointment-venue-option-0')?.focus(), 0);
                }
              }}
              placeholder="Search or select a venue…"
              aria-label="Search donation venues"
              aria-autocomplete="list"
              aria-expanded={venuePickerOpen}
              aria-controls="appointment-venue-options"
              aria-required="true"
              autoComplete="off"
            />
            {venuePickerOpen && (
              <div id="appointment-venue-options" className="appointment-venue-options" role="listbox">
                {matchingVenues.length > 0 ? matchingVenues.map((facility, index) => (
                  <button
                    id={`appointment-venue-option-${index}`}
                    key={facility._id}
                    type="button"
                    className={`appointment-venue-option ${String(facility._id) === String(venue) ? 'selected' : ''}`}
                    role="option"
                    aria-selected={String(facility._id) === String(venue)}
                    onClick={() => selectVenue(facility)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        setVenuePickerOpen(false);
                        venuePickerRef.current?.querySelector('[role="combobox"]')?.focus();
                      }
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        document.getElementById(`appointment-venue-option-${index + 1}`)?.focus();
                      }
                      if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        if (index === 0) venuePickerRef.current?.querySelector('[role="combobox"]')?.focus();
                        else document.getElementById(`appointment-venue-option-${index - 1}`)?.focus();
                      }
                    }}
                  >
                    <strong>{facility.facilityName}</strong>
                    <span className="appointment-venue-distance">
                      {facility.distanceKm !== null
                        ? `${facility.distanceKm} km away · ~${facility.travelMinutes} min`
                        : locationOrigin ? 'Distance unavailable for this venue' : 'Set a location to see distance and minutes'}
                    </span>
                    <span className="appointment-venue-address">{facility.address}</span>
                  </button>
                )) : (
                  <p className="appointment-venue-empty">No matching venues found.</p>
                )}
              </div>
            )}
          </div>
        </div>

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


        <button type="submit" className="appointment-submit-button" disabled={
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

      {showLocationModal && (
        <ChangeLocationModal
          currentOrigin={locationOrigin || { name: 'City of Manila', lat: 14.5888, lon: 120.9744 }}
          onSelectCity={handleSelectLocation}
          onUseMyLocation={handleUseMyLocation}
          isLocating={isLocating}
          locationError={locationError}
          tag="Travel Estimate Origin"
          title="Set your location"
          description="Use your current location or search for a place to estimate venue distances and travel times."
          onClose={() => setShowLocationModal(false)}
        />
      )}

      <dialog
        ref={detailsDialog}
        className="appointment-details-modal donor-appointment-dialog"
        aria-labelledby="donor-appointment-details-title"
        onClose={() => setDetailAppointment(null)}
      >
        {detailAppointment && (
          <div className="appointment-details-content">
            <div className="appointment-details-header">
              <h3 id="donor-appointment-details-title">Appointment details</h3>
              <button
                type="button"
                className="appointment-details-close"
                aria-label="Close appointment details"
                onClick={() => detailsDialog.current?.close()}
              >
                ×
              </button>
            </div>

            <dl className="donor-details-grid">
            <div>
              <dt>Date</dt>
              <dd>
                {new Date(detailAppointment.date).toLocaleDateString('en-PH', {
                  dateStyle: 'medium',
                  timeZone: 'Asia/Manila',
                })}
              </dd>
            </div>

            <div>
              <dt>Time</dt>
              <dd>
                {new Date(detailAppointment.date).toLocaleTimeString('en-PH', {
                  timeStyle: 'short',
                  timeZone: 'Asia/Manila',
                })}
              </dd>
            </div>
              <div>
                <dt>Venue</dt>
                <dd>{detailAppointment.venue?.facilityName || 'Venue unavailable'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{STATUS_LABEL[detailAppointment.status] || detailAppointment.status}</dd>
              </div>
              {staffLabel(detailAppointment) && (
                <div>
                  <dt>Assigned staff</dt>
                  <dd>{staffLabel(detailAppointment)}</dd>
                </div>
              )}
            </dl>

            {detailAppointment.note && (
              <section className="appointment-details-section">
                <h4>Note</h4>
                <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {detailAppointment.note}
                </p>
              </section>
            )}

            {showUpcoming && ['pending', 'approved'].includes(detailAppointment.status) && (
              <footer className="appointment-details-section">
                <button
                  type="button"
                  className="appointment-cancel-button"
                  onClick={() => {
                    const appointmentId = detailAppointment._id;
                    detailsDialog.current?.close();
                    setCancelReason('');
                    setCancelError('');
                    setCancelId(appointmentId);
                  }}
                >
                  Cancel appointment
                </button>
              </footer>
            )}
          </div>
        )}
      </dialog>

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
