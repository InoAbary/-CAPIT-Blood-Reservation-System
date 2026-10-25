import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import '../AdminDashboard.css';
import { api, getErrorMessage } from '../lib/api.js';

const navigation = [
  { to: '/admin', label: 'Overview', icon: '📊', end: true },
  { to: '/admin/user-directory', label: 'User Directory', icon: '👥' },
  { to: '/admin/provision-supervisor', label: 'Create Account', icon: '🛡️' },
  { to: '/admin/audit-log', label: 'Audit Log', icon: '🕒', end: true },
];

const pageDetails = {
  '/admin': ['Admin Dashboard', 'Manage supervisor accounts and review the CAPIT network at a glance.'],
  '/admin/user-directory': ['User Directory', 'View registered accounts, roles, and institution assignments.'],
  '/admin/provision-supervisor': ['Create Account', 'Create administrator and supervisor accounts.'],
  '/admin/audit-log': ['Audit Log', 'Review recorded administrative actions.'],
};

function AdminLayout({ user, onLogout }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [title, description] = pageDetails[pathname] || pageDetails['/admin'];
  const [backendStatus, setBackendStatus] = React.useState('Checking backend…');
  const savedUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('adminUser') || 'null');
    } catch {
      return null;
    }
  }, []);
  const currentUser = user || savedUser;

  React.useEffect(() => {
    if (!currentUser?.accessToken) {
      localStorage.removeItem('adminUser');
      navigate('/Login/Staff', { replace: true });
      return;
    }
    let isCurrent = true;
    api('/api/health')
      .then((health) => {
        if (!isCurrent) return;
        setBackendStatus(health.database === 'connected'
          ? `Backend connected · MongoDB${health.demoData ? ' · Demo records' : ''}`
          : 'Backend connected · Demo data (MongoDB offline)');
      })
      .catch((error) => {
        if (isCurrent) setBackendStatus(`Backend unavailable · ${getErrorMessage(error)}`);
      });
    return () => {
      isCurrent = false;
    };
  }, [currentUser, navigate]);

  const handleLogout = onLogout || (() => {
    localStorage.removeItem('adminUser');
    navigate('/Login/Staff');
  });

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
            <div className="avatar">{(currentUser.name || 'A').slice(0, 1).toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{currentUser.name}</span>
              <span className="user-role">{currentUser.role}</span>
            </div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
