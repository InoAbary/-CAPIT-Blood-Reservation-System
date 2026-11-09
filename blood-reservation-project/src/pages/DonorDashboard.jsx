import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';
import DonorNotificationSettings from '../components/DonorNotificationSettings';

/* ── Role-specific nav configurations ── */
const NAV_ITEMS = {
  donor: [
    { label: 'Overview', path: '/DonorDashboard', icon: '📊' },
    { label: 'Donor Application Form', path: '/BloodDonorForm', icon: '💝' },
    { label: 'Book Appointment', path: '/BookAppointment', icon: '📅' },
    { label: 'Profile Settings', path: '/donor/profile', icon: '⚙️' },
  ],
  recipient: [
    { label: 'Overview', path: '/DonorDashboard', icon: '📊' },
    { label: 'Blood Bank Map', path: '/BloodBankMap', icon: '🗺️' },
    { label: 'Profile Settings', path: '/donor/profile', icon: '⚙️' },
  ],
};

const ROLE_KEY = 'donorHubRole';

function DonorDashboard() {
  const navigate = useNavigate();
  const { donor, logoutDonor } = useAuth();

  /* ── Role from localStorage, or null → show popup ── */
  const [role, setRole] = useState(() => {
    const saved = localStorage.getItem(ROLE_KEY);
    return saved === 'donor' || saved === 'recipient' ? saved : null;
  });

  const [badges, setBadges] = useState([]);

  useEffect(() => {
    if (donor?.email && role === 'donor') {
      fetch(`/api/badgr/donor-badges?email=${encodeURIComponent(donor.email)}`)
        .then((res) => res.json())
        .then((data) => setBadges(data.result || []))
        .catch(console.error);
    }
  }, [donor?.email, role]);

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

  const navItems = role ? NAV_ITEMS[role] : [];

  return (
    <div className="dashboard-container top-menu-layout">
      <header className="dashboard-menu">
        <div className="dashboard-logo">
          <h2>
            {role === 'recipient' ? 'Recipient Hub' : 'Donor Hub'}
            <span className="welcome-inline">
              {donor?.firstName ? ` · Welcome, ${donor.firstName}` : ' · Welcome!'}
            </span>
          </h2>
        </div>

        <nav className="nav-links">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} className="nav-link" title={item.label}>
              <span className="nav-icon">{item.icon}</span>
            </Link>
          ))}
          {role && (
            <button className="quick-action-btn" onClick={changeRole}>
              Change role
            </button>
          )}
        </nav>

        <div className="menu-footer">
          
          <button className="quick-action-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="content-placeholder">
          <h1>{role === 'recipient' ? 'Recipient Dashboard' : 'Donor Dashboard'}</h1>
          <p>Select a menu item to view details.</p>

          {role === 'donor' ? (
            <>
              <div className="cards-grid">
                <div className="info-card">
                  <h3>Total Donations</h3>
                  <p className="stat">24</p>
                </div>
                <div className="info-card">
                  <h3>Lives Impacted</h3>
                  <p className="stat">87</p>
                </div>
                <div className="info-card">
                  <h3>Next Pickup</h3>
                  <p className="stat">May 15</p>
                </div>
              </div>
              <DonorNotificationSettings />
              <div className="badges-section">
                <h3>My Badges</h3>
                <div className="badges-grid">
                  {badges.map((badge) => (
                    <div key={badge.entityId} className="badge-card">
                      <img src={badge.image} alt={badge.badgeclassName} />
                      <h4>{badge.badgeclassName}</h4>
                      <p>{new Date(badge.issuedOn).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
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