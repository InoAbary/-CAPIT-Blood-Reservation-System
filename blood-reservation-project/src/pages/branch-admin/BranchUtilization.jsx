import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ArchiveBoxIcon, ArrowDownTrayIcon, CalendarDaysIcon, ChartBarIcon, CheckCircleIcon, ClipboardDocumentListIcon,
  ClockIcon, EyeIcon, InformationCircleIcon, PencilSquareIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import '../../styles/BranchAdmin.css';
import '../../styles/HospitalRequests.css';
import '../../styles/BranchUtilization.css';
import UtilizationAnalytics, {
  COVERAGE_OUTCOMES, EMPTY_UTILIZATION_FILTERS, filterUtilizationUnits,
  REPORT_OUTCOMES, reportSourceLabel, reportWastageReason, utilizationOutcome, UtilizationFilters, WASTAGE_OUTCOMES,
} from './UtilizationAnalytics';

const EMPTY_REPORT = { status: '', description: '', wastageReason: '', wastageReasonOther: '' };
const OUTCOME_ICONS = {
  Used: CheckCircleIcon, Wasted: TrashIcon, Expired: CalendarDaysIcon, Unused: ArchiveBoxIcon,
  'Awaiting report': ClockIcon, 'Assumed used': InformationCircleIcon,
};
const METRIC_APPEARANCE = {
  'Units released': ['blue', ArchiveBoxIcon],
  'Hospital reports': ['blue', ClipboardDocumentListIcon],
  'Total reports': ['blue', ClipboardDocumentListIcon],
  Used: ['green', CheckCircleIcon],
  Wastage: ['red', TrashIcon],
  'Wastage rate': ['red', ChartBarIcon],
  'Awaiting report': ['orange', ClockIcon],
};
const UTILIZATION_DATE = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeZone: 'Asia/Manila',
});
const UTILIZATION_TIME = new Intl.DateTimeFormat('en-PH', {
  timeStyle: 'short',
  timeZone: 'Asia/Manila',
});

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

function formatDate(value, formatter = UTILIZATION_DATE) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : formatter.format(date);
}

function UtilizationExport({ units, view }) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const exportRef = useRef(null);
  const triggerRef = useRef(null);
  const choicesId = useId();

  useEffect(() => {
    if (!open) return;
    const dismiss = event => {
      if (!exportRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  async function download(format) {
    setOpen(false);
    setDownloading(true);
    setError('');
    try {
      const response = await fetch('/api/branch-admin/utilization/export', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, view, unitIds: units.map(unit => unit.id) }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || 'Could not download the report.');
      }
      const filename = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1];
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `utilization-report.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="utilization-export" ref={exportRef}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button type="button" ref={triggerRef} className="hospital-my-request-detail-button utilization-export-trigger"
        aria-label={downloading ? 'Downloading report' : 'Download report'}
        title={downloading ? 'Downloading report' : 'Download report'}
        aria-expanded={open} aria-controls={choicesId}
        disabled={!units.length || downloading} onClick={() => {
          setError('');
          setOpen(current => !current);
        }}>
        <ArrowDownTrayIcon aria-hidden="true" />
      </button>
      <div className="utilization-export-options" id={choicesId} hidden={!open || !units.length}>
        <button type="button" onClick={() => download('pdf')}>PDF</button>
        <button type="button" onClick={() => download('xlsx')}>Excel (.xlsx)</button>
      </div>
      {error && <p className="utilization-export-error" role="alert">{error}</p>}
    </div>
  );
}

function DetailFields({ fields }) {
  return (
    <dl className="hospital-my-request-detail-grid">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

function UnitDetailsButton({ unit, onOpen, label = 'View details' }) {
  return (
    <button
      type="button"
      className="hospital-my-request-detail-button utilization-view-button utilization-details-button"
      aria-haspopup="dialog"
      aria-label={`${label} for blood unit ${unit.bloodUnitID}`}
      title={label}
      onClick={() => onOpen(unit)}
    >
      <EyeIcon aria-hidden="true" />
    </button>
  );
}
function OutcomeBadge({ unit }) {
  const outcome = utilizationOutcome(unit);
  const Icon = OUTCOME_ICONS[outcome] || InformationCircleIcon;
  return (
    <span className="tag utilization-outcome" data-outcome={outcome}>
      <Icon aria-hidden="true" />
      {outcome}
    </span>
  );
}

function SourceBadge({ report }) {
  if (!report) return '—';
  const label = reportSourceLabel(report);
  return <span className="utilization-source" data-source={label}>{label}</span>;
}

function WastageReasonFields({ draft, reasons, onChange }) {
  if (draft.status !== 'Wasted') return null;

  return (
    <div className="utilization-reason-fields">
      <label className="utilization-control utilization-dropdown">
        <span>Reason</span>
        <select
          className="form-control"
          value={draft.wastageReason}
          onChange={event => onChange('wastageReason', event.target.value)}
          required
        >
          <option value="" disabled>Select reason</option>
          {reasons.map(reason => <option key={reason}>{reason}</option>)}
        </select>
      </label>
      {draft.wastageReason === 'Other' && (
        <label className="utilization-control">
          <span>Other reason</span>
          <input
            type="text"
            className="form-control"
            value={draft.wastageReasonOther}
            onChange={event => onChange('wastageReasonOther', event.target.value)}
            maxLength={240}
            pattern={'.*\\S.*'}
            title="Enter a reason with at least one non-space character."
            required
          />
        </label>
      )}
    </div>
  );
}

export default function BranchUtilization({          
  facilityType: facilityTypeProp,
}) {

  const outletContext = useOutletContext() || {};
  const facilityType = facilityTypeProp ?? outletContext.facilityType;
  const workspace = facilityType === 'hospital' ? 'hospital' : 'bsf';
  const [data, setData] = useState(null);
  const [hospitalView, setHospitalView] = useState('awaiting');
  const [providerView, setProviderView] = useState('reports');
  const [filters, setFilters] = useState(EMPTY_UTILIZATION_FILTERS);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [reasonEditor, setReasonEditor] = useState(null);
  const detailsRef = useRef(null);
  const reasonDialogRef = useRef(null);
  const recordsRef = useRef(null);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [submittingUnit, setSubmittingUnit] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUtilization = useCallback(async () => {
    setLoading(true);
  
    try {
      const result = await request(`/api/branch-admin/utilization?workspace=${workspace}`);
      setData(result);
      setError('');
    } catch (requestError) {
      setData(null);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    loadUtilization();
  }, [loadUtilization]);

  useEffect(() => {
    const dialog = reasonDialogRef.current;
    if (reasonEditor && dialog && !dialog.open) dialog.showModal();
  }, [reasonEditor]);

  function showUnitDetails(unit) {
    setSelectedUnit(unit);
    detailsRef.current?.showModal();
  }

  function changeProviderView(view) {
    if (view === providerView) return;
    setProviderView(view);
    setFilters(current => ({ ...current, outcome: '', reason: '' }));
  }

  function showWastageReason(reason) {
    setFilters(current => ({ ...current, outcome: 'Wastage', reason }));
    recordsRef.current?.focus();
    recordsRef.current?.scrollIntoView({ block: 'start' });
  }

  function updateDraft(id, field, value) {
    setDrafts(current => ({
      ...current,
      [id]: { ...(current[id] || EMPTY_REPORT), [field]: value },
    }));
  }

  function openWastageReason(unit) {
    setReasonEditor({ unit, draft: { ...(drafts[unit.id] || EMPTY_REPORT), status: 'Wasted' } });
  }

  function changeAwaitingOutcome(unit, status) {
    if (status === 'Wasted') openWastageReason(unit);
    else updateDraft(unit.id, 'status', status);
  }

  function saveWastageReason(event) {
    event.preventDefault();
    const { unit, draft } = reasonEditor;
    setDrafts(current => ({
      ...current,
      [unit.id]: {
        ...(current[unit.id] || EMPTY_REPORT),
        status: 'Wasted',
        wastageReason: draft.wastageReason,
        wastageReasonOther: draft.wastageReason === 'Other' ? draft.wastageReasonOther.trim() : '',
      },
    }));
    reasonDialogRef.current.close();
  }

  async function submitReport(event, unit) {
    event.preventDefault();
    if (submittingUnit) return;
    const draft = drafts[unit.id] || EMPTY_REPORT;
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
          wastageReason: draft.wastageReason,
          wastageReasonOther: draft.wastageReasonOther,
        }),
      });
      setNotice(`Utilization report submitted for ${unit.bloodUnitID}.`);
      if (selectedUnit?.id === unit.id) detailsRef.current?.close();
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
  const wastageReasons = data?.wastageReasons || [];
  const isHospital = data?.mode === 'hospital';
  const awaitingReports = units.filter(unit => !unit.report);
  const reportedUnits = units.filter(unit => unit.report);
  const isHistory = hospitalView === 'history';
  const hospitalUnits = isHistory
    ? reportedUnits.sort((first, second) =>
      (Date.parse(second.report.dateCreated) || 0) - (Date.parse(first.report.dateCreated) || 0))
    : awaitingReports;
  const filteredUnits = isHospital ? [] : filterUtilizationUnits(units, filters);
  const confirmedReports = filteredUnits.filter(unit => REPORT_OUTCOMES.includes(utilizationOutcome(unit)));
  const followUpUnits = filteredUnits.filter(unit => COVERAGE_OUTCOMES.includes(utilizationOutcome(unit)));
  const isCoverage = providerView === 'coverage';
  const providerRecords = isCoverage ? followUpUnits : confirmedReports;
  const isWastageReport = !isCoverage && (filters.outcome === 'Wastage' || WASTAGE_OUTCOMES.includes(filters.outcome));
  const visibleRecords = providerRecords.filter(unit => {
    if (filters.reason && filters.reason !== reportWastageReason(unit)) return false;
    const outcome = utilizationOutcome(unit);
    if (filters.outcome === 'Wastage') return WASTAGE_OUTCOMES.includes(outcome);
    return !filters.outcome || outcome === filters.outcome;
  });
  const wastageCount = confirmedReports.filter(unit => WASTAGE_OUTCOMES.includes(unit.report.status)).length;
  const awaitingCount = followUpUnits.filter(unit => utilizationOutcome(unit) === 'Awaiting report').length;
  const summary = isCoverage ? [
    ['Units released', filteredUnits.length],
    ['Total reports', filteredUnits.length - awaitingCount],
    ['Awaiting report', awaitingCount],
  ] : [
    ['Hospital reports', confirmedReports.length],
    ['Used', confirmedReports.filter(unit => unit.report.status === 'Used').length],
    ['Wastage', wastageCount],
    ['Wastage rate', confirmedReports.length ? `${(wastageCount / confirmedReports.length * 100).toFixed(0)}%` : '—'],
  ];
  const selectedDraft = drafts[selectedUnit?.id] || EMPTY_REPORT;

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
          <h2 className="card-title">{isHospital ? 'Hospital Utilization Reports' : 'Blood Utilization Dashboard'}</h2>
          <p className="card-subtitle">
            {isHospital
              ? 'Report what happened to each released blood bag. After seven days from recorded pickup or delivery, an unreported bag may be marked Assumed used.'
              : 'Monitor outcomes for released blood bags and see where usage, wastage, and reporting differ.'}
          </p>
        </div>
      </section>

      {error && <p className="form-message error-message" role="alert">{error}</p>}
      {notice && <p className="form-message" role="status">{notice}</p>}

      {isHospital ? (
        <section className="content-card">
          <div className="segmented-tabs branch-utilization-views" role="group" aria-label="Utilization report view">
            <button
              type="button"
              className={`segmented-btn${isHistory ? '' : ' segmented-btn--active'}`}
              aria-pressed={!isHistory}
              onClick={() => setHospitalView('awaiting')}
            >
              Awaiting report ({awaitingReports.length})
            </button>
            <button
              type="button"
              className={`segmented-btn${isHistory ? ' segmented-btn--active' : ''}`}
              aria-pressed={isHistory}
              onClick={() => setHospitalView('history')}
            >
              History ({reportedUnits.length})
            </button>
          </div>
          <div className="table-scroll">
            <table
              className="custom-table branch-utilization-table"
              aria-label={isHistory ? 'Utilization report history' : 'Blood units awaiting a utilization report'}
            >
              <thead>
                <tr>
                  {isHistory && <th scope="col">Report ID</th>}
                  <th scope="col">Blood unit ID</th>
                  <th scope="col">Blood type</th>
                  <th scope="col">Component</th>
                  {isHistory ? (
                    <>
                      <th scope="col">Outcome</th>
                      <th scope="col">Report date</th>
                      <th scope="col">Source</th>
                    </>
                  ) : (
                    <th scope="col">Release date</th>
                  )}
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {hospitalUnits.length ? hospitalUnits.map((unit) => (
                  <tr key={unit.id}>
                    {isHistory && <td>{unit.report.reportID || '—'}</td>}
                    <td><strong>{unit.bloodUnitID}</strong></td>
                    <td>{unit.bloodType}</td>
                    <td>{unit.component}</td>
                    {isHistory ? (
                      <>
                        <td><OutcomeBadge unit={unit} /></td>
                        <td>{formatDate(unit.report.dateCreated)}</td>
                        <td><SourceBadge report={unit.report} /></td>
                      </>
                    ) : (
                      <td>{formatDate(unit.releasedAt)}</td>
                    )}
                    <td>
                      <UnitDetailsButton unit={unit} onOpen={showUnitDetails}
                        label={!isHistory ? 'Report outcome' : unit.report.isAssumed ? 'Report actual outcome' : 'View report'} />
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={isHistory ? 8 : 5} className="empty-table">
                      {isHistory ? 'No utilization reports in history yet.' : 'No blood units awaiting a report.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <>
          <div className="segmented-tabs branch-utilization-views" role="group" aria-label="BSF utilization view">
            <button
              type="button"
              className={`segmented-btn${isCoverage ? '' : ' segmented-btn--active'}`}
              aria-pressed={!isCoverage}
              onClick={() => changeProviderView('reports')}
            >
              Utilization reports
            </button>
            <button
              type="button"
              className={`segmented-btn${isCoverage ? ' segmented-btn--active' : ''}`}
              aria-pressed={isCoverage}
              onClick={() => changeProviderView('coverage')}
            >
              Reporting coverage
            </button>
          </div>
          <UtilizationFilters units={units} filters={filters} onChange={setFilters} />
          <div className="metrics-grid branch-metrics utilization-metrics" data-view={isCoverage ? 'coverage' : 'reports'}>
            {summary.map(([label, value]) => {
              const [tone, Icon] = METRIC_APPEARANCE[label];
              return (
                <article className="metric-card" data-tone={tone} key={label}>
                  <div className="metric-header">
                    <span className="metric-label">{label}</span>
                    <span className={`metric-icon ${tone}`}><Icon aria-hidden="true" /></span>
                  </div>
                  <div className="metric-value">{value}</div>
                </article>
              );
            })}
          </div>

          <UtilizationAnalytics
            units={isCoverage ? filteredUnits : confirmedReports}
            coverage={isCoverage}
            reasons={wastageReasons}
            onShowReason={showWastageReason}
            onSelectHospital={hospital => setFilters(current => ({ ...current, hospital }))}
          />
          <section className="content-card utilization-records" ref={recordsRef} tabIndex={-1} aria-labelledby="utilization-records-title">
            <div className="utilization-card-heading">
              <div>
                <h3 className="card-title" id="utilization-records-title">{isCoverage ? 'Bags without a hospital report' : isWastageReport ? 'Wastage report' : 'Hospital report records'}</h3>
                <p className="card-subtitle">
                  {visibleRecords.length} {isCoverage
                    ? (visibleRecords.length === 1 ? 'bag' : 'bags')
                    : (visibleRecords.length === 1 ? 'report' : 'reports')} shown
                </p>
              </div>
              <div className="utilization-record-actions">
                <label className="utilization-control utilization-dropdown">
                  <span>Outcome</span>
                  <select className="form-control" value={filters.outcome}
                    onChange={event => setFilters(current => ({ ...current, outcome: event.target.value, reason: '' }))}>
                    <option value="">All outcomes</option>
                    {!isCoverage && <option value="Wastage">Wastage report (Wasted + Expired)</option>}
                    {(isCoverage ? COVERAGE_OUTCOMES : REPORT_OUTCOMES).map(outcome => <option key={outcome}>{outcome}</option>)}
                  </select>
                </label>
                <UtilizationExport units={visibleRecords} view={isCoverage ? 'coverage' : isWastageReport ? 'wastage' : 'reports'} />
              </div>
            </div>
            {filters.reason && (
              <div className="utilization-active-reason">
                <span>Reason: <strong>{filters.reason}</strong></span>
                <button type="button" className="hospital-my-request-detail-button"
                  onClick={() => setFilters(current => ({ ...current, reason: '' }))}>
                  Clear reason
                </button>
              </div>
            )}
            <div className="table-scroll">
              <table className="custom-table branch-utilization-table">
                <thead>
                  <tr>
                    <th>Report ID</th><th>Hospital</th><th>Blood Type</th><th>Component</th>
                    <th>Release date</th><th>Outcome</th>
                    {isCoverage && <th>Source</th>}
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecords.length ? visibleRecords.map((unit) => (
                    <tr key={unit.id}>
                      <td>{unit.report?.reportID || '—'}</td>
                      <td>{unit.hospitalName}</td>
                      <td>{unit.bloodType}</td>
                      <td>{unit.component}</td>
                      <td>{formatDate(unit.releasedAt)}</td>
                      <td><OutcomeBadge unit={unit} /></td>
                      {isCoverage && <td><SourceBadge report={unit.report} /></td>}
                      <td><UnitDetailsButton unit={unit} onOpen={showUnitDetails} /></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={isCoverage ? 8 : 7} className="empty-table">{isCoverage ? 'No bags without a hospital report match these filters.' : 'No hospital reports match these filters.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      {isHospital && (
        <dialog
          ref={reasonDialogRef}
          className="hospital-my-request-dialog utilization-reason-dialog"
          aria-labelledby="utilization-reason-title"
          onClose={() => setReasonEditor(null)}
        >
          <header className="hospital-my-request-dialog-header">
            <h3 id="utilization-reason-title">Wastage reason</h3>
            {reasonEditor && <strong>{reasonEditor.unit.bloodUnitID}</strong>}
          </header>
          {reasonEditor && (
            <form className="hospital-my-request-dialog-body utilization-reason-form" onSubmit={saveWastageReason}>
              <WastageReasonFields
                draft={reasonEditor.draft}
                reasons={wastageReasons}
                onChange={(field, value) => setReasonEditor(current => ({
                  ...current, draft: { ...current.draft, [field]: value },
                }))}
              />
              <div className="utilization-record-actions utilization-reason-actions">
                <button type="button" className="hospital-my-request-detail-button" onClick={() => reasonDialogRef.current.close()}>
                  Cancel
                </button>
                <button type="submit" className="btn-action">Save reason</button>
              </div>
            </form>
          )}
        </dialog>
      )}
      {data && (
        <dialog
          ref={detailsRef}
          className="hospital-my-request-dialog branch-utilization-details-dialog"
          aria-labelledby="utilization-details-title"
          onClose={() => setSelectedUnit(null)}
        >
          <header className="hospital-my-request-dialog-header">
            <h3 id="utilization-details-title">Request and blood unit details</h3>
            <form method="dialog">
              <button type="submit" className="hospital-my-request-detail-button">Close</button>
            </form>
          </header>
          {selectedUnit && (
            <div className="hospital-my-request-dialog-body">
              {selectedUnit.request && (
                <section className="hospital-my-request-detail-section">
                  <h4>Blood request</h4>
                  <DetailFields fields={[
                    ['Request ID', selectedUnit.request.reference],
                    ['Requesting hospital', isHospital ? data.facilityName : selectedUnit.hospitalName],
                    ['Issuing BSF', selectedUnit.request.supplierName],
                    ['Request date', formatDate(selectedUnit.request.submittedAt)],
                    ['Request time', formatDate(selectedUnit.request.submittedAt, UTILIZATION_TIME)],
                    ['Fulfillment method', selectedUnit.request.fulfillmentMethod],
                    ['Pickup or delivery status', selectedUnit.request.fulfillmentStatus],
                  ]} />
                </section>
              )}
              <section className="hospital-my-request-detail-section">
                <h4>Blood unit</h4>
                <DetailFields fields={[
                  ['Blood unit ID', selectedUnit.bloodUnitID],
                  ['Blood type', selectedUnit.bloodType],
                  ['Component', selectedUnit.component],
                  ['Collection date', formatDate(selectedUnit.collectionDate)],
                  ['Expiration date', formatDate(selectedUnit.expiryDate)],
                  ['BSF release date', formatDate(selectedUnit.releasedAt)],
                  ['BSF release time', formatDate(selectedUnit.releasedAt, UTILIZATION_TIME)],
                ]} />
              </section>
              {selectedUnit.report && (
                <section className="hospital-my-request-detail-section">
                  <h4>Utilization report</h4>
                  <DetailFields fields={[
                    ['Report ID', selectedUnit.report.reportID],
                    ['Outcome', utilizationOutcome(selectedUnit)],
                    ['Source', reportSourceLabel(selectedUnit.report)],
                    ['Reported by', selectedUnit.report.reportedByName],
                    ['Report date', formatDate(selectedUnit.report.dateCreated)],
                    ['Report time', formatDate(selectedUnit.report.dateCreated, UTILIZATION_TIME)],
                    ...(reportWastageReason(selectedUnit) ? [['Wastage reason', reportWastageReason(selectedUnit)]] : []),
                    ...(selectedUnit.report.wastageReasonOther ? [['Other reason', selectedUnit.report.wastageReasonOther]] : []),
                  ]} />
                  {selectedUnit.report.description && (
                    <div className="utilization-report-notes">
                      <h4>Notes</h4>
                      <p>{selectedUnit.report.description}</p>
                    </div>
                  )}
                </section>
              )}
              {isHospital && (!selectedUnit.report || selectedUnit.report.isAssumed) && (
                <form className="hospital-my-request-detail-section utilization-correction" onSubmit={event => submitReport(event, selectedUnit)}>
                  <h4>{selectedUnit.report ? 'Report actual outcome' : 'Report outcome'}</h4>
                  {error && <p className="form-message error-message" role="alert">{error}</p>}
                  <label className="utilization-control utilization-dropdown">
                    <span>Outcome</span>
                    <select
                      className="form-control"
                      required
                      value={selectedDraft.status}
                      onChange={event => selectedUnit.report
                        ? updateDraft(selectedUnit.id, 'status', event.target.value)
                        : changeAwaitingOutcome(selectedUnit, event.target.value)}
                    >
                      <option value="" disabled>Select status</option>
                      {REPORT_OUTCOMES.map(outcome => <option key={outcome}>{outcome}</option>)}
                    </select>
                  </label>
                  {selectedUnit.report ? (
                    <WastageReasonFields
                      draft={selectedDraft}
                      reasons={wastageReasons}
                      onChange={(field, value) => updateDraft(selectedUnit.id, field, value)}
                    />
                  ) : selectedDraft.status === 'Wasted' && (
                    <button type="button" className="hospital-my-request-detail-button utilization-view-button"
                      aria-haspopup="dialog" onClick={() => openWastageReason(selectedUnit)}>
                      <PencilSquareIcon aria-hidden="true" />
                      Edit wastage reason
                    </button>
                  )}
                  <label className="utilization-control">
                    <span>Notes (optional)</span>
                    <textarea
                      className="form-control"
                      value={selectedDraft.description}
                      onChange={event => updateDraft(selectedUnit.id, 'description', event.target.value)}
                    />
                  </label>
                  <button className="btn-action" type="submit" disabled={Boolean(submittingUnit)}>
                    {submittingUnit ? 'Submitting…' : 'Submit outcome'}
                  </button>
                </form>
              )}
            </div>
          )}
        </dialog>
      )}
    </section>
  );
}
