import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebarBadges } from '../hooks/useSidebarBadges';
import {
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  UsersIcon,
  MapIcon,
  ArrowsRightLeftIcon,
  Cog6ToothIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const NAV_ITEMS = {
  donor: [
    { label: 'Overview', path: '/DonorDashboard', icon: Squares2X2Icon },
    { label: 'Blood Drives', path: '/BloodDrives', icon: MapIcon },
    { label: 'Donor Application Form', path: '/BloodDonorForm', icon: ClipboardDocumentListIcon },
    { label: 'Book Appointment', path: '/BookAppointment', icon: CalendarDaysIcon, badgeKey: 'appointments' },
    { label: 'Donation History', path: '/donor/donation-history', icon: ClockIcon },
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
  const { donor } = useAuth();
  const { pathname } = useLocation();
  const counts = useSidebarBadges(donor?._id || donor?.id, role === 'donor' ? 'donor' : null,
    pathname === '/BookAppointment' ? 'appointments' : null);

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
        {navItems.map(({ path, label, icon: Icon, badgeKey }) => (
          <NavLink
            key={path}
            to={path}
            end
            className={counts?.[badgeKey] > 0 ? "nav-link donor-nav-link--badged" : "nav-link"}
            aria-label={counts?.[badgeKey] ? `${label}, ${counts[badgeKey]} unread updates` : label}
            title={label}
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="nav-label">{label}</span>
            {counts?.[badgeKey] > 0 && (
              <span aria-hidden="true" className="donor-nav-badge">
                {counts[badgeKey] > 99 ? '99+' : counts[badgeKey]}
              </span>
            )}
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
