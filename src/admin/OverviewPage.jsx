import React, { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../lib/api.js';

const metrics = [
  { key: 'systemAdmins', label: 'System Admins', detail: 'System-wide administrator accounts', icon: '🛡️', color: 'purple' },
  { key: 'bsfAdmins', label: 'BSF Admins', detail: 'Participating blood service facilities', icon: '🩸', color: 'red' },
  { key: 'prcAdmins', label: 'PRC Admins', detail: 'Philippine Red Cross facilities', icon: '🏥', color: 'pink' },
  { key: 'donors', label: 'Donors', detail: 'Self-registered donors', icon: '❤️', color: 'orange' },
  { key: 'hospitalStaff', label: 'Hospital Staff', detail: 'Staff accounts authorized by supervisors', icon: '🩺', color: 'blue' },
  { key: 'bsfStaff', label: 'BSF Staff', detail: 'Staff accounts authorized by supervisors', icon: '🔬', color: 'purple' },
];

function OverviewPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/admin/summary')
      .then(setSummary)
      .catch((requestError) => setError(getErrorMessage(requestError)));
  }, []);

  return (
    <section id="overview">
      {error && <p className="form-message error-message" role="alert">{error}</p>}
      <div className="metrics-grid">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className="metric-header">
              <span className="metric-label">{metric.label}</span>
              <span className={`metric-icon ${metric.color}`}>{metric.icon}</span>
            </div>
            <div className="metric-value">{summary?.[metric.key] ?? '—'}</div>
            <div className="metric-subtext">{metric.detail}</div>
          </article>
        ))}
        <article className="metric-card total-users-card">
          <div className="metric-header">
            <span className="metric-label">Total Users</span>
            <span className="metric-icon green">👥</span>
          </div>
          <div className="metric-value">{summary?.totalUsers ?? '—'}</div>
          <div className="metric-subtext">All accounts in the system, including admin</div>
        </article>
        <article className="metric-card audit-metric-card">
          <div className="metric-header">
            <span className="metric-label">Admin Logged Actions</span>
            <span className="metric-icon green">✓</span>
          </div>
          <div className="metric-value">{summary?.auditCount ?? '—'}</div>
          <div className="metric-subtext">Recorded in the audit log</div>
        </article>
      </div>

      <section className="content-card">
        <h2 className="card-title">Administration overview</h2>
        <p className="card-subtitle">
          Use the workspace menu to manage accounts, assign facility administrators, and inspect the audit log.
        </p>
        <div className="overview-actions">
          <div><strong>{summary?.totalUsers ?? '—'}</strong><span>Accounts you created</span></div>
          <div><strong>{summary?.donors ?? '—'}</strong><span>Registered donors</span></div>
        </div>
      </section>
    </section>
  );
}

export default OverviewPage;
