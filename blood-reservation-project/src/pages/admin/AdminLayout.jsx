import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import '../../styles/AdminDashboard.css';
import { api } from '../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const navigation = [
  { to: '/admin', label: 'Overview', icon: '📊', end: true },
  { to: '/admin/donors', label: 'Donors', icon: '🩸', end: true },
  { to: '/admin/user-directory', label: 'User Directory', icon: '👥' },
  { to: '/admin/provision-supervisor', label: 'Create Account', icon: '🛡️' },
  { to: '/admin/audit-log', label: 'Audit Log', icon: '🕒', end: true },
  { to: '/admin/map', label: 'Blood Bank Map', icon: '🗺️', end: true },
  { to: '/admin/change-owner', label: 'System Admins', icon: '🔐', end: true },
];

const pageDetails = {
  '/admin': ['Admin Dashboard', 'Manage administrator accounts and review system activity at a glance.'],
  '/admin/donors': ['Donor Directory', 'View and search all donor records.'],
  '/admin/donors/add': ['Add Donor', 'Create a donor record for someone who has not registered.'],
  '/admin/user-directory': ['User Directory', 'View registered accounts, roles, and institution assignments.'],
  '/admin/provision-supervisor': ['Create Account', 'Create administrator and supervisor accounts.'],
  '/admin/audit-log': ['Audit Log', 'Review recorded administrative actions.'],
  '/admin/map': ['Blood Bank Map', 'View and manage blood service facilities.'],
  '/admin/change-owner': ['System Admins & Ownership', 'Create System Admin accounts, assign access, or transfer Primary admin ownership.'],
};

function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { staff, loading: authLoading, logoutStaff } = useAuth();
  const [title, description] = pageDetails[pathname] || (/^\/admin\/donors\/[^/]+\/edit$/.test(pathname) ? ['Edit Donor', 'Update donor profile and contact information.'] : pageDetails['/admin']);
  const currentUser = staff;
  const [adminProfile, setAdminProfile] = React.useState(null);
  const adminId = currentUser?.id || currentUser?._id;

  React.useEffect(() => {
    if (!adminId) return undefined;
    let active = true;
    api('/api/admin/current')
      .then((result) => { if (active) setAdminProfile(result.admin); })
      .catch(() => { if (active) setAdminProfile(currentUser); });
    return () => { active = false; };
  }, [adminId]);

  React.useEffect(() => {
    const syncAdminPermissions = (event) => {
      if (event.detail) setAdminProfile((current) => ({ ...(current || {}), ...event.detail }));
    };
    window.addEventListener('admin-user-updated', syncAdminPermissions);
    return () => window.removeEventListener('admin-user-updated', syncAdminPermissions);
  }, []);

  const displayUser = adminProfile || currentUser;
  const displayName = [displayUser?.firstName, displayUser?.lastName].filter(Boolean).join(' ') || displayUser?.name || displayUser?.email || 'Administrator';

  const handleLogout = async () => {
    await logoutStaff();
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
          </div>
          <div className="user-profile">
            <div className="avatar">{displayName.slice(0, 1).toUpperCase()}</div>
            <div className="user-info">
              <span className="user-name">{displayName}</span>
              <span className="user-role">
                {displayUser?.isPrimaryAdmin ? 'Primary admin' : displayUser?.canManageAccounts ? 'Account manager' : displayUser?.role}
              </span>
            </div>
          </div>
        </header>
        <Outlet context={{ admin: displayUser }} />
      </main>
    </div>
  );
}

export default AdminLayout;
