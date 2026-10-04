import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { RefreshIcon, CheckIcon } from './Icons';
import './Navbar.css';

export default function Navbar() {
  const [activeRole, setActiveRole] = useState('Hospital Rep'); // 'Hospital Rep', 'BSF MedTech', or 'Admin'
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const navigate = useNavigate();

  const handleSyncBBIS = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setToastMessage('BBIS Live Sync Complete: Central Blood Bank database up to date.');
      setTimeout(() => setToastMessage(null), 3500);
    }, 700);
  };

  const handleRoleToggle = (role) => {
    setActiveRole(role);
    setToastMessage(`Switched active portal perspective to: ${role}`);
    setTimeout(() => setToastMessage(null), 3000);
    if (role === 'Admin') {
      navigate('/admin');
    }
  };

  return (
    <>
      <header className="navbar-container">
        <div className="navbar-inner">
          {/* Brand Logo & Name */}
          <NavLink to="/BloodBankMap" className="navbar-brand-group">
            <div className="prc-redcross-box">
              <span className="prc-plus-symbol">+</span>
            </div>
            <span className="prc-brand-title">Sandugo</span>
          </NavLink>

          {/* Nav Tabs */}
          <nav className="navbar-links-group">
            <NavLink
              to="/BloodBankMap"
              className={({ isActive }) => `nav-tab-item ${isActive ? 'active' : ''}`}
            >
              Blood Locator
            </NavLink>

            <NavLink
              to="/Inventory"
              className={({ isActive }) => `nav-tab-item ${isActive ? 'active' : ''}`}
            >
              Inventory
            </NavLink>

            <NavLink
              to="/Utilization"
              className={({ isActive }) => `nav-tab-item ${isActive ? 'active' : ''}`}
            >
              Reports
            </NavLink>

            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-tab-item ${isActive ? 'active' : ''}`}
            >
              Admin
            </NavLink>

            <button
              type="button"
              className="nav-sync-btn"
              onClick={handleSyncBBIS}
              title="Synchronize with BBIS"
            >
              <RefreshIcon size={14} spinning={isSyncing} />
              <span>Sync BBIS</span>
            </button>
          </nav>

          {/* Right Role Controls */}
          <div className="navbar-role-group">
            <button
              type="button"
              className={`role-pill-btn ${activeRole === 'Hospital Rep' ? 'active' : ''}`}
              onClick={() => handleRoleToggle('Hospital Rep')}
            >
              {activeRole === 'Hospital Rep' && <span className="role-check-icon">✓</span>}
              <span>Hospital Rep</span>
            </button>

            <button
              type="button"
              className={`role-pill-btn ${activeRole === 'BSF MedTech' ? 'active' : ''}`}
              onClick={() => handleRoleToggle('BSF MedTech')}
            >
              {activeRole === 'BSF MedTech' && <span className="role-check-icon">✓</span>}
              <span>BSF MedTech</span>
            </button>

            <button
              type="button"
              className={`role-pill-btn ${activeRole === 'Admin' ? 'active' : ''}`}
              onClick={() => handleRoleToggle('Admin')}
            >
              {activeRole === 'Admin' && <span className="role-check-icon">✓</span>}
              <span>Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="bbis-toast">
          <CheckIcon size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
