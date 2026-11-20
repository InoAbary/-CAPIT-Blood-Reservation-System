import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DonorSidebar from '../components/DonorSidebar';
import { useDonationCooldown } from '../hooks/useDonationCooldown';
import { BellIcon } from '@heroicons/react/24/outline';
import {
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  MapIcon,
} from '@heroicons/react/24/outline';

import '../styles/Dashboard.css';
import '../styles/UI.css';


import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';
import DonorNotificationSettings from '../components/DonorNotificationSettings';
import DonorBadges from '../components/DonorBadges';




const ROLE_KEY = 'donorHubRole';

function DonorDashboard() {
  const navigate = useNavigate();
  const { donor, logoutDonor } = useAuth();

  const { status, nextEligibleDate, lastDonationDate } = useDonationCooldown();

  const dateFormat = new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeZone: 'Asia/Manila',
  });

  const eligibilityLabel = {
    loading: 'Checking…',
    eligible: 'Eligible to book',
    blocked: nextEligibleDate
      ? `Next eligible ${dateFormat.format(new Date(nextEligibleDate))}`
      : 'Waiting period active',
    error: 'Status unavailable',
  }[status];

  /* ── Role from localStorage, or null → show popup ── */
  const [role, setRole] = useState(() => {
    const saved = localStorage.getItem(ROLE_KEY);
    return saved === 'donor' || saved === 'recipient' ? saved : null;
  });

  const [badgeStats, setBadgeStats] = useState(null);
  const [badgeError, setBadgeError] = useState('');
  const [upcomingAppointment, setUpcomingAppointment] = useState(null);
  
  useEffect(() => {
    setBadgeStats(null);
    setBadgeError('');
  
    if (!donor?._id || role !== 'donor') return;
  
    const controller = new AbortController();
  
    async function loadBadges() {
      try {
        const response = await fetch('/api/donor/badges', {
          credentials: 'include',
          signal: controller.signal,
        });
  
        const data = await response.json();
  
        if (!response.ok) {
          throw new Error(data.message || 'Could not load badges.');
        }
  
        if (!controller.signal.aborted) setBadgeStats(data);
      } catch (error) {
        if (!controller.signal.aborted) {
          setBadgeError(error.message);
        }
      }
    }
  
    loadBadges();
  
    return () => controller.abort();
  }, [donor?._id, role]);

  useEffect(() => {
    setUpcomingAppointment(null);
    if (!donor?._id || role !== 'donor') return;
  
    const controller = new AbortController();
  
    async function loadUpcomingAppointment() {
      try {
        const response = await fetch('/api/appointments', {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!response.ok) return;
  
        const { appointments = [] } = await response.json();
        const now = Date.now();
        const next = appointments
          .filter(item =>
            ['pending', 'approved'].includes(item.status) &&
            Date.parse(item.date) >= now
          )
          .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))[0];
  
        if (!controller.signal.aborted) {
          setUpcomingAppointment(next ?? null);
        }
      } catch {
      }
    }
  
    void loadUpcomingAppointment();
    return () => controller.abort();
  }, [donor?._id, role]);

  const pickRole = (picked) => {
    localStorage.setItem(ROLE_KEY, picked);
    setRole(picked);
  };

  const changeRole = () => {
    // Re-open the popup so the user can switch
    setRole(null);
  };

  const handleLogout = async () => {
    localStorage.removeItem(ROLE_KEY);
    await logoutDonor();
    navigate('/Login', { replace: true });
  };


  return (
    <div className={`dashboard-container${role === 'recipient' ? '' : ' donor-theme ui-dashboard'}`}>
      <DonorSidebar
        role={role}
        firstName={donor?.firstName}
        onChangeRole={changeRole}
        onLogout={handleLogout}
      />
      <main className="dashboard-content">
        <div className="content-placeholder">
        <header className="ui-page-header ui-page-header--card">
          <div className="ui-page-header-copy">
            <h1>{role === 'recipient' ? 'Recipient Dashboard' : 'Donor Overview'}</h1>
          </div>

          {role === 'donor' && (
            <button
              type="button"
              disabled
              aria-label="Notifications unavailable"
              title="Notifications coming soon"
              className="grid size-10 shrink-0 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-[#063b82]"
            >
              <BellIcon className="size-5" aria-hidden="true" />
            </button>
          )}
        </header>

          {role === 'donor' ? (
            <>
             <div className="cards-grid">
              <div className="info-card">
                <h3>Total Donations</h3>
                <p className="stat">{badgeStats?.totalDonations ?? '—'}</p>
                {lastDonationDate && (
                  <p className="mt-2 text-sm text-slate-600">
                    Last donation {dateFormat.format(new Date(lastDonationDate))}
                  </p>
                )}
              </div>

              <div className="info-card">
                <h3>Donation Eligibility</h3>
                <p className="text-lg font-bold text-[#102440]" aria-live="polite">
                  {eligibilityLabel}
                </p>
                {status === 'eligible' && (
                  <p className="mt-2 text-sm text-slate-600">
                    Prescreening and staff confirmation still apply.
                  </p>
                )}
              </div>
            </div>

            {upcomingAppointment && (
              <section className="info-card upcoming-appointment-card">
                <h3>Upcoming Appointment</h3>
                <p className="font-semibold text-[#102440]">
                  {new Date(upcomingAppointment.date).toLocaleString('en-PH', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: 'Asia/Manila',
                  })}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {upcomingAppointment.venue?.facilityName || 'Venue unavailable'}
                  {' · '}
                  {upcomingAppointment.status === 'approved' ? 'Approved' : 'Awaiting staff review'}
                </p>
                <Link
                  className="mt-3 inline-block text-sm font-semibold text-blue-800 underline"
                  to={`/BookAppointment?appointment=${encodeURIComponent(upcomingAppointment._id)}`}
                >
                  View appointment
                </Link>
              </section>
            )}
               
              <DonorNotificationSettings />
              {badgeError && <p role="alert">{badgeError}</p>}
              {badgeStats ? (
                <DonorBadges
                  totalDonations={badgeStats.totalDonations}
                  donatedToday={badgeStats.donatedToday}
                  donorName={`${donor?.firstName || ''} ${donor?.lastName || ''}`.trim()}
                />
              ) : !badgeError ? (
                <p>Loading your badges…</p>
              ) : null}
            </>
          ) : role === 'recipient' ? (
            <div className="cards-grid">
              <div className="info-card">
                <h3>Active Requests</h3>
                <p className="stat">0</p>
              </div>
              <div className="info-card">
                <h3>Completed Requests</h3>
                <p className="stat">0</p>
              </div>
              <div className="info-card">
                <h3>Matching Donors</h3>
                <p className="stat">0</p>
              </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* ── Role selection popup ── */}
      {!role && (
        <div className="role-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="role-popup-title">
          <div className="role-popup">
            <h3 id="role-popup-title">How will you use Donor Hub today?</h3>
            <p>Pick a role to see the right tools. You can change this anytime.</p>

            <div className="role-popup-options">
              <button
                type="button"
                className="role-option"
                onClick={() => pickRole('donor')}
              >
                <span className="role-option-icon">💝</span>
                <span className="role-option-label">Donor</span>
                <span className="role-option-desc">Donate blood, book appointments, track badges</span>
              </button>

              <button
                type="button"
                className="role-option"
                onClick={() => pickRole('recipient')}
              >
                <span className="role-option-icon">🩸</span>
                <span className="role-option-label">Recipient</span>
                <span className="role-option-desc">Request blood, find donors, manage requests</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DonorDashboard;