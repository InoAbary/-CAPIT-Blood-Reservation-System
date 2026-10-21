import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {useAuth} from '../context/AuthContext'
import '../styles/Dashboard.css';

function DonorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const navItems = [
    { label: 'Overview', path: '/DonorDashboard', icon: '📊' },
    { label: 'Blood Bank Map', path: '/BloodBankMap', icon: '🗺️' },
    { label: 'Donor Application Form', path: '/BloodDonorForm', icon: '💝' },
    { label: 'Profile Settings', path: '/donor/profile', icon: '⚙️' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/Login', { replace: true });
  };

  return (
    <div className="dashboard-container top-menu-layout">
      <header className="dashboard-menu">
        <div className="dashboard-logo">
          <h2>Donor Hub</h2>
          <p className="welcome-text">
            Welcome back{user?.firstName ? `, ${user.firstName}` : '!'}
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
          <button
            className="quick-action-btn"
            onClick={() => navigate('/donor/new-donation')}
          >
            + New Donation
          </button>
        </div>

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
        </div>
      </main>
    </div>
  );
}

export default DonorDashboard;