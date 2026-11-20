import { NavLink } from 'react-router-dom';
import {
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  UsersIcon,
  MapIcon,
  ArrowsRightLeftIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

const NAV_ITEMS = {
  donor: [
    { label: 'Overview', path: '/DonorDashboard', icon: Squares2X2Icon },
    { label: 'Donor Application Form', path: '/BloodDonorForm', icon: ClipboardDocumentListIcon },
    { label: 'Book Appointment', path: '/BookAppointment', icon: CalendarDaysIcon },
    { label: 'Profile Settings', path: '/donor/profile', icon: Cog6ToothIcon },
  ],
  recipient: [
    { label: 'Overview', path: '/DonorDashboard', icon: Squares2X2Icon },
    { label: 'Blood Bank Map', path: '/BloodBankMap', icon: MapIcon },
    { label: 'Profile Settings', path: '/donor/profile', icon: Cog6ToothIcon },
  ],
};

export default function DonorSidebar({
  role = 'donor',
  firstName,
  onChangeRole,
  onLogout,
}) {
  const navItems = NAV_ITEMS[role] ?? [];

  return (
    <header className="dashboard-menu">
      <div className="dashboard-logo">
        <h2>Sandugo</h2>
        <h2>{role === 'recipient' ? 'Recipient Hub' : 'Donor Hub'}</h2>
        <p className="welcome-inline">
          {firstName ? `Welcome, ${firstName}` : 'Welcome!'}
        </p>
      </div>

      <nav className="nav-links" aria-label="Hub navigation">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end
            className="nav-link"
            aria-label={label}
            title={label}
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="menu-footer">
        {role && onChangeRole && (
          <button
          type="button"
          className="quick-action-btn flex items-center justify-center gap-2"
          onClick={onChangeRole}
        >
          <ArrowsRightLeftIcon className="size-5 shrink-0" aria-hidden="true" />
          <span>Change role</span>
        </button>
        )}
        <button type="button" className="quick-action-btn" onClick={onLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}