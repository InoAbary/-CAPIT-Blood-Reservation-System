import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BloodBankMap from './BloodBankMap';
import BloodRequestForm from './Bloodrequestform';
import BranchRequests from './branch-admin/BranchRequests';
import BranchUtilization from './branch-admin/BranchUtilization';
import HospitalRequests from './branch-admin/HospitalRequests';
import Inventory from './Inventory';
import StaffAppointments from './StaffAppointments'
import StaffDonations from './StaffDonations'
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
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'The request could not be completed.');
  }
  return result;
}

// Tabs a staff user can see. No create-user / users tabs.
const STAFF_TABS = [
  { key: 'dashboard', label: 'Overview', icon: '📊' },
  { key: 'blood-locator', label: 'Blood Locator', icon: '📍' },
  { key: 'utilization', label: 'Utilization Reports', icon: '📈' },
  { key: 'reservation', label: 'Request Form', icon: '💝', facilityTypes: ['hospital'] },
  { key: 'my-requests', label: 'My Requests', icon: '📋', facilityTypes: ['hospital'] },
  { key: 'branch-requests', label: 'Incoming Requests', icon: '📥', facilityTypes: ['bsf', 'prc_chapter'] },
  { key: 'inventory', label: 'Inventory', icon: '🩸', facilityTypes: ['bsf', 'prc_chapter'] },
  { key: 'appointments', label: 'Appointments', icon: '📅', facilityTypes: ['bsf', 'prc_chapter'] },
  { key: 'donations', label: 'Log Donations', icon: '📅', facilityTypes: ['bsf', 'prc_chapter'] },
  { key: 'profile', label: 'Profile Settings', icon: '⚙️' },
];

function StaffDashboard() {
  const navigate = useNavigate();
  const { staff, logoutStaff } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchDashboard = useCallback(() => request('/api/staff/dashboard'), []);

  useEffect(() => {
    let isCurrent = true;
    fetchDashboard()
      .then((result) => {
        if (isCurrent) setDashboard(result);
      })
      .catch((requestError) => {
        if (isCurrent) setError(requestError.message);
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [fetchDashboard]);

  const facility = dashboard?.facility;
  const summary = dashboard?.summary;
  const facilityType = facility?.facilityType;

  // Only expose tabs valid for the staff member's facility type.
  const visibleTabs = useMemo(
    () => STAFF_TABS.filter(
      (tab) => !tab.facilityTypes || tab.facilityTypes.includes(facilityType),
    ),
    [facilityType],
  );

  const handleLogout = async () => {
    await logoutStaff();
    navigate('/Login', { replace: true });
  };

  if (loading) {
    return <section className="content-card"><p>Loading your staff dashboard…</p></section>;
  }

  const facilityTypeName = {
    hospital: 'Hospital',
    bsf: 'Blood Service Facility (BSF)',
    prc_chapter: 'PRC Chapter',
  }[facilityType] || facilityType || 'Facility type unavailable';

  return (
    <div className="dashboard-container">
      <aside className="dashboard-menu">
        <div className="dashboard-logo">
          <h2>Staff Hub</h2>
          <p className="welcome-text">
            Welcome back{staff?.firstName ? `, ${staff.firstName}` : ''}!
          </p>
        </div>

        <nav className="nav-links" role="tablist" aria-label="Staff workspace tabs">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`staff-tab-${tab.key}`}
              aria-selected={activeTab === tab.key}
              aria-controls={`staff-panel-${tab.key}`}
              className={`nav-link${activeTab === tab.key ? ' nav-link--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span className="nav-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        
        <div className="menu-footer">
          <button className="quick-action-btn" type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="dashboard-content">
        <section className="branch-dashboard">
          {error && <p className="form-message error-message" role="alert">{error}</p>}
          {notice && <p className="form-message" role="status">{notice}</p>}

          {activeTab === 'dashboard' && (
            <section
              id="staff-panel-dashboard"
              className="branch-tab-panel"
              role="tabpanel"
              aria-labelledby="staff-tab-dashboard"
              tabIndex={0}
            >
              <section className="content-card branch-facility-card">
                <div>
                  <span className="branch-eyebrow">YOUR FACILITY</span>
                  <h2 className="card-title">{facility?.name || 'Facility unavailable'}</h2>
                  <p className="card-subtitle">{facility?.address || 'No address is on file.'}</p>
                </div>
                <div className="branch-facility-type">
                  <span className="branch-type-icon" aria-hidden="true">
                    {facilityType === 'hospital' ? '🏥' : facilityType === 'bsf' ? '🩸' : '✚'}
                  </span>
                  <div>
                    <strong>{facility?.typeLabel || facilityTypeName}</strong>
                    <span>{facility?.code ? `Facility ID: ${facility.code}` : 'Facility ID unavailable'}</span>
                  </div>
                </div>
              </section>

              <div className="metrics-grid branch-metrics">
                {['bsf', 'prc_chapter'].includes(facilityType) && (
                  <article className="metric-card">
                    <div className="metric-header">
                      <span className="metric-label">Pending blood requests</span>
                      <span className="metric-icon orange">◷</span>
                    </div>
                    <div className="metric-value">{summary?.pendingBloodRequests ?? 0}</div>
                    <div className="metric-subtext">{summary?.totalBloodRequests ?? 0} total requests for this branch</div>
                    <button className="btn-action" type="button" onClick={() => setActiveTab('branch-requests')}>
                      Review requests
                    </button>
                  </article>
                )}

                {facilityType === 'hospital' && (
                  <article className="metric-card">
                    <div className="metric-header">
                      <span className="metric-label">My open requests</span>
                      <span className="metric-icon orange">◷</span>
                    </div>
                    <div className="metric-value">{summary?.openRequests ?? 0}</div>
                    <div className="metric-subtext">{summary?.totalRequests ?? 0} total requests submitted</div>
                    <button className="btn-action" type="button" onClick={() => setActiveTab('my-requests')}>
                      Review my requests
                    </button>
                  </article>
                )}

                <article className="metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Released units</span>
                    <span className="metric-icon blue">🩸</span>
                  </div>
                  <div className="metric-value">{summary?.releasedUnits ?? 0}</div>
                  <div className="metric-subtext">Units released for utilization review</div>
                </article>

                <article className="metric-card">
                  <div className="metric-header">
                    <span className="metric-label">Utilization reports</span>
                    <span className="metric-icon green">✓</span>
                  </div>
                  <div className="metric-value">{summary?.reportedUnits ?? 0}</div>
                  <div className="metric-subtext">Reports filed for released units</div>
                </article>
              </div>
            </section>
          )}

          {activeTab === 'utilization' && (
            <BranchUtilization basePath="/api/staff" facilityType={facilityType} />
          )}

          {activeTab === 'blood-locator' && (
            <section
              id="staff-panel-blood-locator"
              className="branch-tab-panel"
              role="tabpanel"
              aria-labelledby="staff-tab-blood-locator"
              tabIndex={0}
            >
              <BloodBankMap />
            </section>
          )}

          {activeTab === 'inventory' && ['bsf', 'prc_chapter'].includes(facilityType) && (
            <section
              id="staff-panel-inventory"
              className="branch-tab-panel"
              role="tabpanel"
              aria-labelledby="staff-tab-inventory"
              tabIndex={0}
            >
              <Inventory fixedFacilityId={facility?.id} />
            </section>
          )}

          {activeTab === 'reservation' && facilityType === 'hospital' && (
            <section
              id="staff-panel-reservation"
              className="branch-tab-panel"
              role="tabpanel"
              aria-labelledby="staff-tab-reservation"
              tabIndex={0}
            >
              <BloodRequestForm embedded />
            </section>
          )}

          {activeTab === 'branch-requests' && ['bsf', 'prc_chapter'].includes(facilityType) && <BranchRequests />}

          {activeTab === 'my-requests' && facilityType === 'hospital' && <HospitalRequests />}

          {activeTab === 'appointments' && (
            <section
              id="staff-panel-appointments"
              className="branch-tab-panel"
              role="tabpanel"
              aria-labelledby="staff-tab-appointments"
              tabIndex={0}
            >
              <StaffAppointments />
            </section>
          )}

          {activeTab === 'donations' && ['bsf', 'prc_chapter'].includes(facilityType) && <StaffDonations />}

          {activeTab === 'profile' && (
            <section
              id="staff-panel-profile"
              className="content-card branch-tab-panel"
              role="tabpanel"
              aria-labelledby="staff-tab-profile"
              tabIndex={0}
            >
              <h2 className="card-title">Profile Settings</h2>
              <p className="card-subtitle">Update your personal details and account preferences.</p>
              {/* Reuse your existing profile component here, e.g. <StaffProfile /> */}
            </section>
          )}
        </section>
      </main>
    </div>
  );
}

export default StaffDashboard;