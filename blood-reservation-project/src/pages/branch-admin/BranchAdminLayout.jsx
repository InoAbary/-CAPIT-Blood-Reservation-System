import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/AdminDashboard.css';
import '../../styles/BranchAdmin.css';

const workspaceTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'create-user', label: 'Create user', icon: '＋' },
  { id: 'users', label: 'User view', icon: '👥' },
  { id: 'blood-locator', label: 'Blood locator', icon: '📍' },
];

export default function BranchAdminLayout() {
  const { staff, loading, logoutStaff } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [facilityType, setFacilityType] = useState(null);
  const utilizationTab = facilityType === 'hospital'
    ? { id: 'utilization', label: 'Utilization form', icon: '🩸' }
    : ['bsf', 'prc_chapter'].includes(facilityType)
      ? { id: 'utilization', label: 'Utilization dashboard', icon: '📈' }
      : null;
  const reservationTab = facilityType === 'hospital'
    ? { id: 'reservation', label: 'Blood reservation', icon: '📝' }
    : ['bsf', 'prc_chapter'].includes(facilityType)
      ? { id: 'branch-requests', label: 'Requests for branch', icon: '📥' }
      : null;
  const hospitalRequestsTab = facilityType === 'hospital'
    ? { id: 'my-requests', label: 'My requests', icon: '🔔' }
    : null;
  const inventoryTab = ['bsf', 'prc_chapter'].includes(facilityType)
    ? { id: 'inventory', label: 'Inventory', icon: '🩸' }
    : null;
  const appointmentsTab = ['bsf', 'prc_chapter'].includes(facilityType)
    ? { id: 'appointments', label: 'Appointments', icon: '🩸' }
    : null;
  const donationsTab = ['bsf', 'prc_chapter'].includes(facilityType)
    ? { id: 'donations', label: 'Log Donations', icon: '🩸' }
    : null;
    
  const tabs = [
    ...workspaceTabs,
    ...(reservationTab ? [reservationTab] : []),
    ...(inventoryTab ? [inventoryTab] : []),
    ...(hospitalRequestsTab ? [hospitalRequestsTab] : []),
    ...(utilizationTab ? [utilizationTab] : []),
    ...(appointmentsTab ? [appointmentsTab] : []),
    ...(donationsTab ? [donationsTab] : []),
  ];

  useEffect(() => {
    if (facilityType && !tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab('dashboard');
    }
  }, [facilityType, activeTab]);

  if (loading) return <main style={{ padding: 24 }}>Checking staff session…</main>;
  if (!staff || staff.role !== 'branch-admin') return null;

  async function handleLogout() {
    await logoutStaff();
    navigate('/Login/Staff', { replace: true });
  }

  const name = `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email;

  function handleTabKeyDown(event, currentIndex) {
    let nextIndex = currentIndex;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.id);
    document.getElementById(`branch-tab-${nextTab.id}`)?.focus();
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">+</div>
          <div>
            <div className="brand-title">Sandugo</div>
            <div className="brand-subtitle">Branch Admin</div>
          </div>
        </div>
        <div className="nav-section-title">WORKSPACE</div>
        <nav className="nav-menu branch-workspace-nav" role="tablist" aria-label="Branch workspace">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              id={`branch-tab-${tab.id}`}
              className={`nav-item branch-workspace-tab${activeTab === tab.id ? ' active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`branch-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              <span className="icon" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="logout-button" type="button" onClick={handleLogout}>
            <span aria-hidden="true">↪</span>
            Log out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="header">
          <div>
            <div className="breadcrumb">WORKSPACE / BRANCH ADMIN</div>
            <h1 className="page-title">Branch workspace</h1>
            <p className="page-description">View branch activity, create staff accounts, and manage users.</p>
          </div>
          <div className="user-profile">
            <div className="avatar">{name.slice(0, 1).toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{name}</span>
              <span className="user-role">Branch Admin</span>
            </div>
          </div>
        </header>
        <Outlet context={{ activeTab, setActiveTab, setFacilityType, facilityType }} />
      </main>
    </div>
  );
}
