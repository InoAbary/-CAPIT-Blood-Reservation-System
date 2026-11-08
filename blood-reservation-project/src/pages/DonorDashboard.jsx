import React, {useState, useEffect} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {useAuth} from '../context/AuthContext'
import '../styles/Dashboard.css';
import DonorNotificationSettings from '../components/DonorNotificationSettings';
import DonorBadges from '../components/DonorBadges';

function DonorDashboard() {
  const navigate = useNavigate();
  const { donor, logoutDonor } = useAuth();
  const navItems = [
    { label: 'Overview', path: '/DonorDashboard', icon: '📊' },
    { label: 'Blood Bank Map', path: '/BloodBankMap', icon: '🗺️' },
    { label: 'Donor Application Form', path: '/BloodDonorForm', icon: '💝' },
    { label: 'Book Appointment', path: '/BookAppointment', icon: '⚙️' },
    { label: 'Profile Settings', path: '/donor/profile', icon: '⚙️' },
    
  ];

  const [badgeStats, setBadgeStats] = useState(null);
  const [badgeError, setBadgeError] = useState('');
  
  useEffect(() => {
    if (!donor?._id) return;
  
    const controller = new AbortController();
  
    fetch('/api/donor/badges', {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async response => {
        const data = await response.json();
  
        if (!response.ok) {
          throw new Error(data.message || 'Could not load badges.');
        }
  
        return data;
      })
      .then(setBadgeStats)
      .catch(error => {
        if (error.name !== 'AbortError') {
          setBadgeError(error.message);
        }
      });
  
    return () => controller.abort();
  }, [donor?._id]);

  const handleLogout = async () => {
    await logoutDonor();
    navigate('/Login', { replace: true });
  };

  return (
    <div className="dashboard-container top-menu-layout">
      <header className="dashboard-menu">
        <div className="dashboard-logo">
          <h2>Donor Hub</h2>
          <p className="welcome-text">
            Welcome back{donor?.firstName ? `, ${donor.firstName}` : '!'}
          </p>
        </div>

        <nav className="nav-links">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} className="nav-link">
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        

        <div className="menu-footer">
          <button className="quick-action-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="content-placeholder">
          <h1>Donor Dashboard</h1>
          <p>Select a menu item to view details.</p>
          <div className="cards-grid">
            <div className="info-card">
              <h3>Total Donations</h3>
              <p className="stat">
              {badgeStats?.totalDonations ?? '—'}
            </p>
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
          {badgeError && (
            <p role="alert">{badgeError}</p>
          )}

          {badgeStats ? (
            <DonorBadges
              totalDonations={badgeStats.totalDonations}
              donatedToday={badgeStats.donatedToday}
            />
          ) : !badgeError ? (
            <p>Loading your badges…</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default DonorDashboard;
