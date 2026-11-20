import { Link, useNavigate } from 'react-router-dom';
import DonorSidebar from '../components/DonorSidebar';
import { useAuth } from '../context/AuthContext';
import DonorNotificationSettings from '../components/DonorNotificationSettings';
import DonorProfileForm from '../components/DonorProfileForm';
import '../styles/Dashboard.css';
import '../styles/UI.css';
import { BellIcon } from '@heroicons/react/24/outline';

export default function DonorProfile() {
  const { donor, logoutDonor } = useAuth();
  const navigate = useNavigate();
  const role = localStorage.getItem('donorHubRole') === 'recipient'
    ? 'recipient'
    : 'donor';

  function handleChangeRole() {
    localStorage.removeItem('donorHubRole');
    navigate('/DonorDashboard');
  }

  async function handleLogout() {
    localStorage.removeItem('donorHubRole');
    await logoutDonor();
    navigate('/Login', { replace: true });
  }

  return (
    <div className={`dashboard-container${role === 'donor' ? ' donor-theme ui-dashboard' : ''}`}>
      <DonorSidebar
        role={role}
        firstName={donor?.firstName}
        onChangeRole={handleChangeRole}
        onLogout={handleLogout}
      />
      <main className="dashboard-content">
        <div className="content-placeholder donor-profile-page">
        <header className="ui-page-header ui-page-header--card">
          <div className="ui-page-header-copy">
            <h1>Profile Settings</h1>
          </div>

          <button
            type="button"
            disabled
            aria-label="Notifications unavailable"
            title="Notifications coming soon"
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-[#063b82] disabled:cursor-default"
          >
            <BellIcon className="size-5" aria-hidden="true" />
          </button>
        </header>
          <section className="donor-profile-card" aria-labelledby="mobile-number-heading">
            <h2 id="mobile-number-heading">Mobile number</h2>
            <p>{donor?.mobileNumber || 'No mobile number saved.'}</p>
            <p>To update your mobile number, confirm the change through your registered email.</p>
            <Link className="donor-profile-change-number" to="/donor/change-number">Change mobile number</Link>
          </section>
          <DonorProfileForm />
          <div id="notification-preferences" className="scroll-mt-6">
            <DonorNotificationSettings />
          </div>
        </div>
      </main>
    </div>
  );
}
