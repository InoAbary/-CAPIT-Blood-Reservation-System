import React, { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../lib/api.js';

const PAGE_SIZE = 10;

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('en-PH', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function AuditLogPage() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  async function downloadAuditCsv() {
    setError('');
    setDownloading(true);
    try {
      const response = await fetch('/api/admin/audit.csv', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Could not download the audit log.');
      }
      const downloadUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'sandugo-audit-trail.csv';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    api('/api/admin/audit')
      .then((res) => setEvents(res.events || []))
      .catch((requestError) => setError(getErrorMessage(requestError)))
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const visibleEvents = events.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <section className="content-card" id="audit-trail">
      <div className="card-header-flex">
        <div>
          <h2 className="card-title">Admin Action &amp; Delegation Audit Trail</h2>
          <p className="card-subtitle">Review account creation, authorization, and account status events.</p>
        </div>
        <button className="btn-action audit-download" type="button" onClick={downloadAuditCsv} disabled={downloading}>
          {downloading ? 'Preparing CSV…' : 'Download CSV'}
        </button>
      </div>
      {error && <p className="form-message error-message" role="alert">{error}</p>}
      <div className="table-scroll admin-bounded-table">
        <table className="custom-table audit-table">
          <thead><tr><th>Timestamp</th><th>Action</th><th>Actor</th><th>Target User</th><th>Branch / Facility</th><th>Audit Details</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan="6" className="empty-table">Loading audit events from MongoDB…</td></tr>}
            {visibleEvents.map((event) => (
              <tr key={event._id || event.id}>
                <td>{formatDate(event.createdAt)}</td>
                <td><span className="tag">{event.action}</span></td>
                <td><strong>{event.actor || '—'}</strong><div className="subtext">{event.actorRole || '—'}</div></td>
                <td><strong>{event.targetName || '—'}</strong><div className="subtext">{event.targetRole || '—'}</div></td>
                <td>{event.branch || '—'}</td>
                <td>{event.details || '—'}</td>
              </tr>
            ))}
            {!loading && events.length === 0 && <tr><td colSpan="6" className="empty-table">No audit events have been recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <nav className="admin-pagination" aria-label="Audit log pages">
        <button className="btn-action" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1}>Previous</button>
        <span aria-live="polite">Page {currentPage} of {totalPages}</span>
        <button className="btn-action" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages}>Next</button>
      </nav>
    </section>
  );
}

export default AuditLogPage;
