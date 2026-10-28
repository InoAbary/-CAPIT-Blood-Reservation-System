import React, {useState, useEffect} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {useAuth} from '../context/AuthContext'
import '../styles/Dashboard.css';

function DonorDashboard() {
  const navigate = useNavigate();
  const { donor, logoutDonor } = useAuth();
  const navItems = [
    { label: 'Overview', path: '/DonorDashboard', icon: '📊' },
    { label: 'Blood Bank Map', path: '/BloodBankMap', icon: '🗺️' },
    { label: 'Donor Application Form', path: '/BloodDonorForm', icon: '💝' },
    { label: 'Profile Settings', path: '/donor/profile', icon: '⚙️' },
  ];

  const [badges, setBadges] = useState([])

  useEffect(() => {
    if (donor?.email) {
        fetch(`/api/badgr/donor-badges?email=${encodeURIComponent(donor.email)}`)
            .then(res => res.json())
            .then(data => setBadges(data.result || []))
            .catch(console.error);
    }
  }, [donor?.email]);

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
          <div className="badges-section">
              <h3>My Badges</h3>
              <div className="badges-grid">
                  {badges.map(badge => (
                      <div key={badge.entityId} className="badge-card">
                          <img src={badge.image} alt={badge.badgeclassName} />
                          <h4>{badge.badgeclassName}</h4>
                          <p>{new Date(badge.issuedOn).toLocaleDateString()}</p>
                      </div>
                  ))}
              </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default DonorDashboard;