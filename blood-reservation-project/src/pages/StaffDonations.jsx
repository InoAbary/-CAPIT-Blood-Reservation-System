import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '../styles/BranchAdmin.css';
import { donationBloodUnit } from '../utils/donationBloodUnit';
import StaffAddDonor from '../components/StaffAddDonor';
import '../styles/StaffDonations.css';

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

function philippineDateTime() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function formatDonor(donor) {
  if (!donor) return 'Unknown donor';
  const name = `${donor.firstName || ''} ${donor.lastName || ''}`.trim();
  return name || donor.email || 'Unknown donor';
}

export default function StaffDonations({ onDonationRecorded }) {
  const [addingDonor, setAddingDonor] = useState(false);
  const [donations, setDonations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [staffOptions, setStaffOptions] = useState([]);
  const [screener, setScreener] = useState('');
  const [extractor, setExtractor] = useState('');
  const [page, setPage] = useState(1);

  // New donation form
  const [activeTab, setActiveTab] = useState('record');
  const showForm = activeTab === 'record';
  const [donorQuery, setDonorQuery] = useState('');
  const [donorResults, setDonorResults] = useState([]);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [donationType, setDonationType] = useState(DONATION_TYPES[0]);
  const [notes, setNotes] = useState('');
  const [dateTime, setDateTime] = useState(philippineDateTime);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (typeFilter) params.set('type', typeFilter);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const result = await request(`/api/donations/staff-donations?${params}`);
      setDonations(result.donations || []);
      setPagination(result.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, fromDate, toDate]);

  useEffect(() => {
    if (activeTab === 'history') load();
  }, [load, activeTab]);

  useEffect(() => {
    if (!showForm) return;
    let cancelled = false;
    request('/api/donations/staff-options')
      .then(result => { if (!cancelled) setStaffOptions(result.staff || []); })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [showForm]);

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
    setScreener('');
    setExtractor('');
    setDateTime(philippineDateTime());
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
      const result = await request('/api/donations/staff-donations', {
        method: 'POST',
        body: JSON.stringify({
          donorID: selectedDonor._id,
          donationType,
          screener,
          extractor,
          notes: notes.trim() || undefined,
          dateTime: new Date(`${dateTime}:00+08:00`).toISOString(),
        }),
      });
      setNotice('Donation recorded.');
      resetForm();
      setPage(1);
      onDonationRecorded?.(donationBloodUnit(result.donation));
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
    <section className="content-card staff-donations">
      <div className="card-header-row">
        <div>
          <span className="sd-eyebrow">DONATION MANAGEMENT</span>
          <h2 className="card-title">Donations</h2>
          <p className="card-subtitle">
            Record and review donations at your facility.
          </p>
        </div>

      </div>

      <div className="sd-tabs" role="tablist" aria-label="Donation management">
        {[
          ['record', 'Record donation'],
          ['history', 'Previous donations'],
        ].map(([tab, label], index) => (
          <button
            key={tab}
            id={`donation-tab-${tab}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`donation-panel-${tab}`}
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => { setActiveTab(tab); setError(''); }}
            onKeyDown={event => {
              const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
              if (!keys.includes(event.key)) return;
              event.preventDefault();
              const next = event.key === 'Home' ? 'record' : event.key === 'End' ? 'history' : index === 0 ? 'history' : 'record';
              setActiveTab(next);
              setError('');
              document.getElementById(`donation-tab-${next}`)?.focus();
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {notice && <p className="form-message" role="status">{notice}</p>}

      <div id="donation-panel-record" role="tabpanel" aria-labelledby="donation-tab-record" hidden={!showForm}>
        {addingDonor ? (
          <StaffAddDonor onCancel={() => setAddingDonor(false)} onCreated={donor => {
            setSelectedDonor(donor);
            setDonorQuery('');
            setDonorResults([]);
            setAddingDonor(false);
            setError('');
            setNotice('Donor added. You can now record their donation.');
          }} />
        ) : (
        <>
        <div className="sd-add-donor-heading">
          <p className="muted small">Donor not registered yet?</p>
          <button type="button" className="btn-secondary" onClick={() => {
            setAddingDonor(true); setError(''); setNotice('');
          }}>Add donor</button>
        </div>
        <form id="record-donation-form" className="donation-form" onSubmit={submit}>
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

          {[
            ['Screener', screener, setScreener],
            ['Extractor', extractor, setExtractor],
          ].map(([label, value, setValue]) => (
            <label key={label}>
              {label}
              <select required value={value} onChange={e => setValue(e.target.value)}>
                <option value="">Select {label.toLowerCase()}</option>
                {staffOptions.map(staff => (
                  <option key={staff._id} value={staff._id}>{formatDonor(staff)}</option>
                ))}
              </select>
            </label>
          ))}

          <label>
            Date &amp; time (Philippine Standard Time)
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
              onClick={() => { resetForm(); setError(''); setNotice(''); }}
            >
              Clear form
            </button>
            <button type="submit" className="btn-action" disabled={saving || !selectedDonor || !screener || !extractor}>
              {saving ? 'Saving…' : 'Save donation'}
            </button>
          </div>
        </form>
        </>
        )}
      </div>

      <div id="donation-panel-history" role="tabpanel" aria-labelledby="donation-tab-history" hidden={showForm}>

      <div className="sd-records-heading"><h3>Donation records</h3><span className="sd-count" role="status">{summary}</span></div>
      <div className="donation-filters">
        <select
          aria-label="Filter by donation type"
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="">All types</option>
          {DONATION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <label>From date
          <input type="date" value={fromDate} max={toDate || undefined}
            onChange={e => { setFromDate(e.target.value); setPage(1); }} />
        </label>
        <label>To date
          <input type="date" value={toDate} min={fromDate || undefined}
            onChange={e => { setToDate(e.target.value); setPage(1); }} />
        </label>
        <button type="button" className="btn-secondary" onClick={() => {
          setTypeFilter(''); setFromDate(''); setToDate(''); setPage(1);
        }}>Clear filters</button>
      </div>

      <div className="sd-table-wrap" tabIndex={0} role="region" aria-label="Donation records" aria-busy={loading}>
        <table className="sd-table">
          <caption className="sd-sr-only">Donations recorded at your facility</caption>
          <thead>
            <tr>
              <th scope="col">Donor</th>
              <th scope="col">Blood Type</th>
              <th scope="col">Donation Type</th>
              <th scope="col">Date and Time (PST)</th>
              <th scope="col">Screener</th>
              <th scope="col">Extractor</th>
              <th scope="col">Encoder</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="sd-empty"><span role="status">Loading donations…</span></td></tr>
            ) : donations.length === 0 ? (
              <tr><td colSpan={7} className="sd-empty">
                <strong>{error ? 'Donations could not be loaded.' : 'No donations found'}</strong>
                <p>{error ? 'Please try again shortly.' : typeFilter || fromDate || toDate ? 'Try adjusting your filters.' : 'Record your first donation to get started.'}</p>
              </td></tr>
            ) : donations.map((d) => {
              const date = new Date(d.dateTime);
              const validDate = !Number.isNaN(date.getTime());
              return (
                <tr key={d._id}>
                  <td>
                    <div className="sd-donor">
                      <span className="sd-avatar" aria-hidden="true">{formatDonor(d.donorID).charAt(0).toUpperCase()}</span>
                      <div><strong>{formatDonor(d.donorID)}</strong>
                        {d.notes && <span className="sd-note">Notes: {d.notes}</span>}
                      </div>
                    </div>
                  </td>
                  <td><span className="sd-blood-type">{d.donorID?.bloodType || 'Unknown'}</span></td>
                  <td><span className="sd-type">{d.donationType || 'Unknown'}</span></td>
                  <td>{validDate ? <time dateTime={date.toISOString()}>
                    <span className="sd-date">{date.toLocaleDateString(undefined, { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="sd-time">{date.toLocaleTimeString(undefined, { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}</span>
                  </time> : 'Unknown date'}</td>
                  {[d.screener, d.extractor, d.encoder].map((staff, index) => (
                    <td key={index}>{staff ? formatDonor(staff) : 'Not recorded'}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
      </div>
    </section>
  );
}
