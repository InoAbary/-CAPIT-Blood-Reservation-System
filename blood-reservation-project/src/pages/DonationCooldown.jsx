// DonationCooldown.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DonorSidebar from '../components/DonorSidebar';
import '../styles/Dashboard.css';
import '../styles/UI.css';

const ROLE_KEY = 'donorHubRole';

export default function DonationCooldown() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { donor, logoutDonor } = useAuth();

  const last = state?.lastDonationDate ? new Date(state.lastDonationDate) : null;
  const next = state?.nextEligibleDate ? new Date(state.nextEligibleDate) : null;

  const dateFormat = new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeZone: 'Asia/Manila',
  });

  const role = (() => {
    const saved = localStorage.getItem(ROLE_KEY);
    return saved === 'donor' || saved === 'recipient' ? saved : null;
  })();

  const handleLogout = async () => {
    localStorage.removeItem(ROLE_KEY);
    await logoutDonor();
    navigate('/Login', { replace: true });
  };

  const changeRole = () => {
    // Match dashboard behavior: clear role so the popup re-opens there.
    localStorage.removeItem(ROLE_KEY);
    navigate('/DonorDashboard');
  };

  return (
    <div className="dashboard-container donor-theme ui-dashboard">
      <DonorSidebar
        role={role}
        firstName={donor?.firstName}
        onChangeRole={changeRole}
        onLogout={handleLogout}
      />

      <main className="dashboard-content">
        <div className="content-placeholder">
          <header className="ui-page-header ui-page-header--card">
            <div className="ui-page-header-copy">
              <h1>Not eligible to donate yet</h1>
              <p>
                Philippine Red Cross guidelines require a{' '}
                <strong>3-month interval</strong> between whole-blood donations.
              </p>
            </div>
          </header>

          <div className="cards-grid">
            {last && (
              <div className="info-card">
                <h3>Your last donation</h3>
                <p className="stat">{dateFormat.format(last)}</p>
              </div>
            )}

            {next && (
              <div className="info-card">
                <h3>You can donate again on</h3>
                <p className="stat">{dateFormat.format(next)}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Prescreening and staff confirmation still apply.
                </p>
              </div>
            )}
          </div>

          {!last && !next && (
            <section className="info-card">
              <p>
                Your most recent donation is still within the 3-month cooldown
                period.
              </p>
            </section>
          )}

          <section className="info-card">
            <h3>Need help?</h3>
            <p className="mt-1 text-sm text-slate-600">
              If you believe this is an error, contact the facility where you
              last donated.
            </p>
           
          </section>
        </div>
      </main>
    </div>
  );
}