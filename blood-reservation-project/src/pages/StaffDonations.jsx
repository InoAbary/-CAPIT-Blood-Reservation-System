import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '../styles/BranchAdmin.css';

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || result.message || 'The request could not be completed.');
  }
  return result;
}

const DONATION_TYPES = [
  'Whole Blood Donation',
  'Power Red Donation',
  'Platelet Donation',
  'Plasma Donation',
];

const PAGE_SIZE = 20;

function formatDonor(donor) {
  if (!donor) return 'Unknown donor';
  const name = `${donor.firstName || ''} ${donor.lastName || ''}`.trim();
  return name || donor.email || 'Unknown donor';
}

export default function StaffDonations() {
  const [donations, setDonations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  // New donation form
  const [showForm, setShowForm] = useState(false);
  const [donorQuery, setDonorQuery] = useState('');
  const [donorResults, setDonorResults] = useState([]);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [donationType, setDonationType] = useState(DONATION_TYPES[0]);
  const [notes, setNotes] = useState('');
  const [dateTime, setDateTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search.trim()) params.set('search', search.trim());
      if (typeFilter) params.set('type', typeFilter);

      const result = await request(`/api/donations/staff-donations?${params}`);
      setDonations(result.donations || []);
      setPagination(result.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced donor lookup
  useEffect(() => {
    if (!showForm) return;
    const q = donorQuery.trim();
    if (q.length < 2) {
      setDonorResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const result = await request(`/api/donations/donor-lookup?q=${encodeURIComponent(q)}`);
        setDonorResults(result.donors || []);
      } catch {
        setDonorResults([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [donorQuery, showForm]);

  const resetForm = () => {
    setDonorQuery('');
    setDonorResults([]);
    setSelectedDonor(null);
    setDonationType(DONATION_TYPES[0]);
    setNotes('');
    setDateTime(new Date().toISOString().slice(0, 16));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!selectedDonor) {
      setError('Please select a donor.');
      return;
    }
    setSaving(true);
    try {
      await request('/api/donations/staff-donations', {
        method: 'POST',
        body: JSON.stringify({
          donorID: selectedDonor._id,
          donationType,
          notes: notes.trim() || undefined,
          dateTime: new Date(dateTime).toISOString(),
        }),
      });
      setNotice('Donation recorded.');
      setShowForm(false);
      resetForm();
      setPage(1);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    if (!pagination.total) return 'No donations recorded yet.';
    return `${pagination.total} donation${pagination.total === 1 ? '' : 's'} recorded`;
  }, [pagination.total]);

  return (
    <section className="content-card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Donations</h2>
          <p className="card-subtitle">
            Record and review donations at your facility. {summary}
          </p>
        </div>
        <button
          type="button"
          className="btn-action"
          onClick={() => {
            setShowForm((v) => !v);
            setError('');
            setNotice('');
          }}
        >
          {showForm ? 'Cancel' : 'Record donation'}
        </button>
      </div>

      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {notice && <p className="form-message" role="status">{notice}</p>}

      {showForm && (
        <form className="donation-form" onSubmit={submit}>
          <label>
            Donor
            {selectedDonor ? (
              <div className="selected-donor">
                <span>
                  {formatDonor(selectedDonor)}
                  {selectedDonor.bloodType ? ` (${selectedDonor.bloodType})` : ''}
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedDonor(null);
                    setDonorQuery('');
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={donorQuery}
                  onChange={(e) => setDonorQuery(e.target.value)}
                  placeholder="Search by name or email…"
                  autoComplete="off"
                />
                {donorResults.length > 0 && (
                  <ul className="donor-results">
                    {donorResults.map((d) => (
                      <li key={d._id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDonor(d);
                            setDonorResults([]);
                          }}
                        >
                          <strong>{formatDonor(d)}</strong>
                          {d.bloodType && <span className="muted"> · {d.bloodType}</span>}
                          {d.email && <span className="muted"> · {d.email}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {donorQuery.trim().length >= 2 && donorResults.length === 0 && (
                  <p className="muted small">No matching donors.</p>
                )}
              </>
            )}
          </label>

          <label>
            Donation type
            <select value={donationType} onChange={(e) => setDonationType(e.target.value)}>
              {DONATION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label>
            Date &amp; time
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
          </label>

          <label>
            Notes (optional)
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Hemoglobin 14.2, mild bruising"
            />
          </label>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setShowForm(false); resetForm(); }}
            >
              Cancel
            </button>
            <button type="submit" className="btn-action" disabled={saving || !selectedDonor}>
              {saving ? 'Saving…' : 'Save donation'}
            </button>
          </div>
        </form>
      )}

      <div className="donation-filters">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search donor…"
        />
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="">All types</option>
          {DONATION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading donations…</p>
      ) : donations.length === 0 ? (
        <p className="muted">No donations match these filters.</p>
      ) : (
        <ul className="appointment-list">
          {donations.map((d) => (
            <li key={d._id} className="appointment-item">
              <div>
                <strong>{formatDonor(d.donorID)}</strong>
                <span className="appointment-venue">
                  {new Date(d.dateTime).toLocaleString()}
                </span>
                <span className="appointment-venue">{d.donationType}</span>
                {d.donorID?.bloodType && (
                  <span className="appointment-venue">Blood type: {d.donorID.bloodType}</span>
                )}
                {d.notes && <span className="appointment-note">Notes: {d.notes}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pagination.totalPages > 1 && (
        <div className="pagination-row">
          <button
            type="button"
            className="btn-secondary"
            disabled={pagination.page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="muted">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}