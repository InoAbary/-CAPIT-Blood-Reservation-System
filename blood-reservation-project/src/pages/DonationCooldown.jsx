// DonationCooldown.jsx
import { Link, useLocation } from 'react-router-dom';
import '../styles/Dashboard.css';

export default function DonationCooldown() {
  const { state } = useLocation();
  const last = state?.lastDonationDate ? new Date(state.lastDonationDate) : null;
  const next = state?.nextEligibleDate ? new Date(state.nextEligibleDate) : null;

  return (
    <div className="dashboard-container">
      <header className="dashboard-menu">
        <div className="dashboard-logo">
          <h2>Donor Hub</h2>
        </div>
        <nav className="nav-links">
          <Link className="nav-link" to="/DonorDashboard">
            <span className="nav-icon">📊</span>
            <span className="nav-label">Back to dashboard</span>
          </Link>
        </nav>
      </header>

      <main className="dashboard-content">
        <div className="content-placeholder">
          <h1>Not eligible to donate yet</h1>
          <p>
            Philippine Red Cross guidelines require a <strong>3-month interval</strong> between whole-blood donations.
          </p>

          <div className="info-card" style={{ maxWidth: 1560 }}>
            {last && (
              <>
                <h3>Your last donation</h3>
                <p className="stat" style={{ fontSize: '1.2rem' }}>
                  {last.toLocaleDateString([], { dateStyle: 'long' })}
                </p>
              </>
            )}
            {next && (
              <>
                <h3 style={{ marginTop: '1rem' }}>You can donate again on</h3>
                <p className="stat" style={{ fontSize: '1.2rem' }}>
                  {next.toLocaleDateString([], { dateStyle: 'long' })}
                </p>
              </>
            )}
            {!last && !next && (
              <p>Your most recent donation is still within the 3-month cooldown period.</p>
            )}
            <p style={{ marginTop: '1rem', color: '#64748b' }}>
              If you believe this is an error, contact the facility where you last donated.
            </p>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <Link className="quick-action-btn" to="/DonorDashboard" style={{ display: 'inline-flex', width: 'auto', padding: '0.75rem 1.5rem' }}>
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}