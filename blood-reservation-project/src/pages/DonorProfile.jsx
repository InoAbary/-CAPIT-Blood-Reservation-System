import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DonorNotificationSettings from '../components/DonorNotificationSettings';
import DonorProfileForm from '../components/DonorProfileForm';
import '../styles/Dashboard.css';

export default function DonorProfile() {
  const { donor } = useAuth();
  return (
    <div className="dashboard-container top-menu-layout">
      <header className="dashboard-menu">
        <div className="dashboard-logo"><h2>Donor Hub</h2></div>
        <nav className="nav-links" aria-label="Donor navigation">
          <Link className="nav-link" to="/DonorDashboard">Back to dashboard</Link>
          <Link className="nav-link" to="/donor/profile" aria-current="page">Profile Settings</Link>
        </nav>
      </header>
      <main className="dashboard-content">
        <div className="content-placeholder donor-profile-page">
          <h1>Profile Settings</h1>
          <p>{donor?.firstName} {donor?.lastName} · Manage your information and notification preferences.</p>
          <section className="donor-profile-card" aria-labelledby="mobile-number-heading">
            <h2 id="mobile-number-heading">Mobile number</h2>
            <p>{donor?.mobileNumber || 'No mobile number saved.'}</p>
            <p>To update your mobile number, confirm the change through your registered email.</p>
            <Link className="donor-profile-change-number" to="/donor/change-number">Change mobile number</Link>
          </section>
          <DonorProfileForm />
          <DonorNotificationSettings />
        </div>
      </main>
    </div>
  );
}
