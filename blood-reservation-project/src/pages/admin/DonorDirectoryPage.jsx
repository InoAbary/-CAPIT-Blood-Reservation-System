import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../styles/StaffDonations.css';

export default function DonorDirectoryPage() {
  const { state } = useLocation();
  const [search, setSearch] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ donors: [], pagination: { total: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ page, search, bloodType });
        const response = await fetch(`/api/admin/donors?${params}`, {
          credentials: 'include', signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load donors.');
        if (!controller.signal.aborted) setResult(data);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [page, search, bloodType]);

  return (
    <section className="content-card staff-donations">
      <div className="card-header-row">
        <h2 className="card-title">All donors</h2>
        <Link className="btn-action" to="/admin/donors/add">Add donor</Link>
      </div>
      {state?.donorUpdated && <p className="form-message" role="status">Donor information updated.</p>}
      {state?.donorAdded && <p className="form-message" role="status">Donor added successfully.</p>}
      {error && <p className="form-message error-message" role="alert">{error}</p>}
      <div className="donation-filters">
        <input type="search" aria-label="Search donors" placeholder="Search name, email, or donor ID"
          value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
        <select aria-label="Filter by blood type" value={bloodType}
          onChange={event => { setBloodType(event.target.value); setPage(1); }}>
          <option value="">All blood types</option>
          {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(type => <option key={type}>{type}</option>)}
        </select>
      </div>
      <p role="status">{loading ? 'Loading donors…' : `${result.pagination.total} donors found`}</p>
      <div className="sd-table-wrap" tabIndex={0} role="region" aria-label="Donor directory" aria-busy={loading}>
        <table className="sd-table">
          <thead><tr>{['Donor ID', 'Name', 'Blood type', 'Email', 'Mobile number', 'Location', 'Actions'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7}>Loading donors…</td></tr> : error ? <tr><td colSpan={7}>Donors could not be loaded.</td></tr> : result.donors.length ? result.donors.map(donor => (
              <tr key={donor._id}>
                <td>{donor.donorID}</td>
                <td>{[donor.firstName, donor.middleName, donor.lastName].filter(Boolean).join(' ')}</td>
                <td>{donor.bloodType}</td><td>{donor.email || '—'}</td><td>{donor.mobileNumber || '—'}</td>
                <td>{[donor.municipality, donor.province].filter(Boolean).join(', ') || '—'}</td>
                <td><Link className="btn-secondary" to={`/admin/donors/${donor._id}/edit`} aria-label={`Edit ${donor.firstName} ${donor.lastName}`}>Edit</Link></td>
              </tr>
            )) : <tr><td colSpan={7}>No donors found.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="pagination-row">
        <button type="button" className="btn-secondary" disabled={loading || page <= 1} onClick={() => setPage(current => current - 1)}>Previous</button>
        <span>Page {page} of {result.pagination.totalPages}</span>
        <button type="button" className="btn-secondary" disabled={loading || page >= result.pagination.totalPages} onClick={() => setPage(current => current + 1)}>Next</button>
      </div>
    </section>
  );
}
