import { Navigate, useNavigate } from 'react-router-dom';
import DonorDonationHistory from '../components/DonorDonationHistory';
import DonorSidebar from '../components/DonorSidebar';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';
import '../styles/UI.css';

export default function DonorDonationHistoryPage() {
  const { donor, logoutDonor } = useAuth();
  const navigate = useNavigate();

  if (localStorage.getItem('donorHubRole') === 'recipient') {
    return <Navigate to="/DonorDashboard" replace />;
  }

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
    <div className="dashboard-container donor-theme ui-dashboard">
      <DonorSidebar role="donor" firstName={donor?.firstName}
        onChangeRole={handleChangeRole} onLogout={handleLogout} />
      <main className="dashboard-content">
        <div className="content-placeholder">
          <header className="ui-page-header ui-page-header--card">
            <h1>Donation History</h1>
          </header>
          <DonorDonationHistory />
        </div>
      </main>
    </div>
  );
}
