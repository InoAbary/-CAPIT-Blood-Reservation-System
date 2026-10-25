import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import '../../styles/AdminDashboard.css';
import { api, getErrorMessage } from '../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const navigation = [
  { to: '/admin', label: 'Overview', icon: '📊', end: true },
  { to: '/admin/user-directory', label: 'User Directory', icon: '👥' },
  { to: '/admin/provision-supervisor', label: 'Create Account', icon: '🛡️' },
  { to: '/admin/audit-log', label: 'Audit Log', icon: '🕒', end: true },
  { to: '/BloodBankMap', label: 'Blood Bank Map', icon: '🕒', end: true },
];

const pageDetails = {
  '/admin': ['Admin Dashboard', 'Manage supervisor accounts and review the CAPIT network at a glance.'],
  '/admin/user-directory': ['User Directory', 'View registered accounts, roles, and institution assignments.'],
  '/admin/provision-supervisor': ['Create Account', 'Create administrator and supervisor accounts.'],
  '/admin/audit-log': ['Audit Log', 'Review recorded administrative actions.'],
};

function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { staff, loading: authLoading, logoutStaff } = useAuth();
  const [title, description] = pageDetails[pathname] || pageDetails['/admin'];
  const [backendStatus, setBackendStatus] = React.useState('Checking backend…');
  const currentUser = staff;
  const [displayUser, setDisplayUser] = React.useState(currentUser);

  React.useEffect(() => {
    setDisplayUser(currentUser);
    const syncAdminUser = () => {
      try {
        const latest = JSON.parse(localStorage.getItem('adminUser') || 'null');
        if (latest) setDisplayUser((existing) => ({ ...existing, ...latest }));
      } catch { /* keep the current user label */ }
    };
    window.addEventListener('admin-user-updated', syncAdminUser);
    return () => window.removeEventListener('admin-user-updated', syncAdminUser);
  }, [currentUser]);

  React.useEffect(() => {
    if (authLoading) return undefined;
    if (!currentUser) {
      localStorage.removeItem('adminUser');
      navigate('/Login/Staff', { replace: true });
      return;
    }
    if (!['System Admin', 'admin'].includes(currentUser.role)) {
      navigate('/StaffDashboard', { replace: true });
      return;
    }
    let isCurrent = true;
    
  }, [authLoading, currentUser, navigate]);

  const handleLogout = async () => {
    await logoutStaff();
    localStorage.removeItem('adminUser');
    navigate('/Login/Staff', { replace: true });
  };

  if (authLoading) return <main style={{ padding: 24 }}>Checking staff session…</main>;
  if (!currentUser || !['System Admin', 'admin'].includes(currentUser.role)) return null;

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">+</div>
          <div>
            <div className="brand-title">Sandugo</div>
            <div className="brand-subtitle">System Administrator</div>
          </div>
        </div>

        <div className="nav-section-title">WORKSPACE</div>
        <nav className="nav-menu" aria-label="Workspace">
          {navigation.map(({ to, label, icon, badge, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="icon" aria-hidden="true">{icon}</span>
              {label}
              {badge && <span className="nav-badge">{badge}</span>}
            </NavLink>
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
            <div className="breadcrumb">WORKSPACE / ADMIN</div>
            <h1 className="page-title">{title}</h1>
            <p className="page-description">{description}</p>
            <p role="status" style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0' }}>
              {backendStatus}
            </p>
          </div>
          <div className="user-profile">
            <div className="avatar">{(displayUser?.name || 'A').slice(0, 1).toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{displayUser?.name}</span>
              <span className="user-role">
                {displayUser?.isPrimaryAdmin ? 'Primary admin' : displayUser?.canManageAccounts ? 'Account manager' : displayUser?.role}
              </span>
            </div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
