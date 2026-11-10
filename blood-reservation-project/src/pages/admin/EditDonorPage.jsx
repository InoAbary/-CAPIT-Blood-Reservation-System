import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import StaffAddDonor from '../../components/StaffAddDonor';
import '../../styles/StaffDonations.css';

export default function EditDonorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [donor, setDonor] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setDonor(null);
    setError('');
    (async () => {
      try {
        const response = await fetch(`/api/admin/donors/${id}`, { credentials: 'include', signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load donor.');
        if (!controller.signal.aborted) setDonor(result.donor);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      }
    })();
    return () => controller.abort();
  }, [id]);

  return (
    <section className="content-card staff-donations">
      {error ? <><p className="form-message error-message" role="alert">{error}</p><Link to="/admin/donors">Back to donors</Link></>
        : donor ? <StaffAddDonor key={id} editing initialDonor={donor}
          endpoint={`/api/admin/donors/${id}`} cancelLabel="Back to donors"
          onCancel={() => navigate('/admin/donors')}
          onCreated={() => navigate('/admin/donors', { state: { donorUpdated: true } })} />
        : <p role="status">Loading donor…</p>}
    </section>
  );
}
