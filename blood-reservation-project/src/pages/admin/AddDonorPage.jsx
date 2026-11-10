import { useNavigate } from 'react-router-dom';
import StaffAddDonor from '../../components/StaffAddDonor';
import '../../styles/StaffDonations.css';

export default function AddDonorPage() {
  const navigate = useNavigate();
  return (
    <section className="content-card staff-donations">
      <StaffAddDonor endpoint="/api/admin/donors" cancelLabel="Back to donors"
        onCancel={() => navigate('/admin/donors')}
        onCreated={() => navigate('/admin/donors', { state: { donorAdded: true } })} />
    </section>
  );
}
