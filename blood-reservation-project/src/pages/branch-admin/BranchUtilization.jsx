import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import '../../styles/BranchAdmin.css';

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || result.message || 'The request could not be completed.');
  }
  return result;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

export default function BranchUtilization({
  basePath,          
  facilityType: facilityTypeProp,
}) {

  const outletContext = useOutletContext() || {};
  const facilityType = facilityTypeProp ?? outletContext.facilityType;
  const apiBase = basePath ?? '/api/branch-admin';

  const [data, setData] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [submittingUnit, setSubmittingUnit] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUtilization = useCallback(async () => {
    try {
      setData(await request('/api/branch-admin/utilization'));
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUtilization();
  }, [loadUtilization]);

  async function submitReport(event, unit) {
    event.preventDefault();
    const draft = drafts[unit.id] || { status: 'Used', description: '' };
    setSubmittingUnit(unit.id);
    setError('');
    setNotice('');
    try {
      await request('/api/branch-admin/utilization/reports', {
        method: 'POST',
        body: JSON.stringify({
          bloodUnitId: unit.id,
          status: draft.status,
          description: draft.description,
        }),
      });
      setNotice(`Utilization report submitted for ${unit.bloodUnitID}.`);
      await loadUtilization();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmittingUnit('');
    }
  }

  if (loading) {
    return <section className="content-card"><p>Loading utilization information…</p></section>;
  }

  const units = data?.units || [];
  const isHospital = data?.mode === 'hospital' || facilityType === 'hospital';
  const reportedCount = units.filter((unit) => unit.report).length;
  const usedCount = units.filter((unit) => unit.report?.status === 'Used').length;
  const wastedCount = units.filter((unit) => unit.report?.status === 'Wasted').length;

  return (
    <section
      id="branch-panel-utilization"
      className="branch-dashboard branch-utilization"
      role="tabpanel"
      aria-labelledby="branch-tab-utilization"
      tabIndex="0"
    >
      <section className="content-card branch-utilization-heading">
        <div>
          <span className="branch-eyebrow">{data?.facilityName || 'YOUR FACILITY'}</span>
          <h2 className="card-title">{isHospital ? 'Hospital Utilization Form' : 'Blood Utilization Dashboard'}</h2>
          <p className="card-subtitle">
            {isHospital
              ? 'Report how each released blood unit was used at your hospital.'
              : 'Track blood units released by your facility and the utilization reports received from hospitals.'}
          </p>
        </div>
      </section>

      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {notice && <p className="form-message" role="status">{notice}</p>}

      {isHospital ? (
        <section className="content-card">
          <div className="card-header-flex branch-users-header">
            <div>
              <h3 className="card-title">Released blood units</h3>
              <p className="card-subtitle">Submit one utilization report for each unit received by your hospital.</p>
            </div>
          </div>
          <div className="table-scroll">
            <table className="custom-table branch-utilization-table">
              <thead>
                <tr><th>Blood Unit</th><th>Released</th><th>Utilization report</th></tr>
              </thead>
              <tbody>
                {units.length ? units.map((unit) => {
                  const draft = drafts[unit.id] || { status: 'Used', description: '' };
                  return (
                    <tr key={unit.id}>
                      <td>
                        <strong>{unit.bloodUnitID}</strong>
                        <div className="subtext">{unit.bloodType} · {unit.component}</div>
                      </td>
                      <td>{formatDate(unit.releasedAt)}</td>
                      <td>
                        {unit.report ? (
                          <div className="branch-existing-report">
                            <span className="tag">{unit.report.status}</span>
                            {unit.report.description && <span>{unit.report.description}</span>}
                            <small>Reported {formatDate(unit.report.dateCreated)}</small>
                          </div>
                        ) : (
                          <form className="branch-utilization-report-form" onSubmit={(event) => submitReport(event, unit)}>
                            <label className="sr-only" htmlFor={`utilization-status-${unit.id}`}>Usage status for {unit.bloodUnitID}</label>
                            <select
                              id={`utilization-status-${unit.id}`}
                              className="form-control"
                              value={draft.status}
                              onChange={(event) => setDrafts((current) => ({
                                ...current,
                                [unit.id]: { ...draft, status: event.target.value },
                              }))}
                            >
                              <option value="Used">Used</option>
                              <option value="Wasted">Wasted</option>
                              <option value="Expired">Expired</option>
                              <option value="Unused">Unused</option>
                            </select>
                            <label className="sr-only" htmlFor={`utilization-notes-${unit.id}`}>Notes for {unit.bloodUnitID}</label>
                            <input
                              id={`utilization-notes-${unit.id}`}
                              className="form-control"
                              value={draft.description}
                              onChange={(event) => setDrafts((current) => ({
                                ...current,
                                [unit.id]: { ...draft, description: event.target.value },
                              }))}
                              placeholder="Notes (optional)"
                            />
                            <button className="btn-action" type="submit" disabled={submittingUnit === unit.id}>
                              {submittingUnit === unit.id ? 'Submitting…' : 'Submit'}
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="3" className="empty-table">No released blood units are linked to this hospital yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <>
          <div className="metrics-grid branch-metrics">
            <article className="metric-card">
              <div className="metric-header"><span className="metric-label">Units released</span><span className="metric-icon blue">🩸</span></div>
              <div className="metric-value">{units.length}</div>
              <div className="metric-subtext">Released by this facility</div>
            </article>
            <article className="metric-card">
              <div className="metric-header"><span className="metric-label">Reported as used</span><span className="metric-icon green">✓</span></div>
              <div className="metric-value">{usedCount}</div>
              <div className="metric-subtext">Hospital utilization reports</div>
            </article>
            <article className="metric-card">
              <div className="metric-header"><span className="metric-label">Awaiting report</span><span className="metric-icon orange">…</span></div>
              <div className="metric-value">{units.length - reportedCount}</div>
              <div className="metric-subtext">{wastedCount} reported as wasted</div>
            </article>
          </div>

          <section className="content-card">
            <div className="card-header-flex branch-users-header">
              <div>
                <h3 className="card-title">Blood issued to hospitals</h3>
                <p className="card-subtitle">Released units from {data?.facilityName || 'your facility'} and their latest hospital utilization report.</p>
              </div>
            </div>
            <div className="table-scroll">
              <table className="custom-table branch-utilization-table">
                <thead>
                  <tr><th>Hospital</th><th>Blood Unit</th><th>Component</th><th>Released</th><th>Usage status</th><th>Report details</th></tr>
                </thead>
                <tbody>
                  {units.length ? units.map((unit) => (
                    <tr key={unit.id}>
                      <td>{unit.hospitalName}</td>
                      <td><strong>{unit.bloodUnitID}</strong><div className="subtext">{unit.bloodType}</div></td>
                      <td>{unit.component}</td>
                      <td>{formatDate(unit.releasedAt)}</td>
                      <td>{unit.report ? <span className="tag">{unit.report.status}</span> : <span className="subtext">Not reported</span>}</td>
                      <td>
                        {unit.report
                          ? <div className="branch-existing-report">
                              {unit.report.description && <span>{unit.report.description}</span>}
                              <small>{formatDate(unit.report.dateCreated)}{unit.report.reportedByName ? ` · ${unit.report.reportedByName}` : ''}</small>
                            </div>
                          : '—'}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" className="empty-table">No blood units have been released from this facility yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
