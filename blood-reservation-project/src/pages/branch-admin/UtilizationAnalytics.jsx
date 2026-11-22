import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowPathIcon, CalendarDaysIcon, CheckIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import {
  BarController, BarElement, CategoryScale, Chart, Legend, LineController, LineElement, LinearScale, PointElement, Tooltip,
} from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend, LineController, LineElement, PointElement, Tooltip);

export const REPORT_OUTCOMES = ['Used', 'Wasted', 'Expired', 'Unused'];
export const WASTAGE_OUTCOMES = ['Wasted', 'Expired'];
export const COVERAGE_OUTCOMES = ['Awaiting report', 'Assumed used'];
const UTILIZATION_OUTCOMES = [...REPORT_OUTCOMES, ...COVERAGE_OUTCOMES];
const OUTCOME_COLORS = ['#047857', '#be123c', '#a44b16', '#2563eb'];
const CHART_GROUP_LIMIT = 12;
const AXIS_LABELS = { color: '#475569', font: { size: 13 } };
export const EMPTY_UTILIZATION_FILTERS = {
  search: '', hospital: '', bloodType: [], component: [], from: '', to: '', outcome: '', reason: '',
};

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
});

function formatTimestamp(value, formatter) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? formatter.format(date) : '';
}

export function utilizationOutcome(unit) {
  if (!unit.report) return 'Awaiting report';
  if (unit.report.isAssumed) return 'Assumed used';
  if (unit.report.source === 'System') {
    return unit.report.status === 'Used' ? 'Assumed used' : 'Awaiting report';
  }
  return unit.report.status;
}

export function reportWastageReason(unit) {
  const outcome = utilizationOutcome(unit);
  if (outcome === 'Expired') return 'Expired';
  if (outcome === 'Wasted') return unit.report.wastageReason || '';
  return '';
}

export function reportSourceLabel(report) {
  if (!report) return '—';
  return report.source === 'System' || report.isAssumed ? 'System generated' : 'Hospital submitted';
}

const CHECKBOX_FILTERS = [
  { key: 'bloodType', label: 'Blood type', options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] },
  { key: 'component', label: 'Component', options: ['Packed RBC', 'Plasma', 'Platelets', 'Whole Blood'] },
];

const PATTERN_GROUPS = [
  { key: 'hospital', label: 'Hospital', read: unit => unit.hospitalName },
  ...CHECKBOX_FILTERS.map(({ key, label }) => ({ key, label, read: unit => unit[key] })),
];
const MONTH_GROUP = {
  label: 'Release month', read: unit => formatTimestamp(unit.releasedAt, dayFormatter).slice(0, 7),
};
const COVERAGE_GROUPS = [
  ...PATTERN_GROUPS,
  { key: 'month', ...MONTH_GROUP },
];

export function filterUtilizationUnits(units, filters) {
  const search = filters.search.trim().toLowerCase();
  return units.filter(unit => {
    if (search && ![
      unit.bloodUnitID, unit.request?.reference, unit.report?.reportID, unit.hospitalName,
    ].some(value => value?.toLowerCase().includes(search))) return false;
    if (filters.hospital && unit.hospitalName !== filters.hospital) return false;
    if (filters.bloodType.length && !filters.bloodType.includes(unit.bloodType)) return false;
    if (filters.component.length && !filters.component.includes(unit.component)) return false;
    if (!filters.from && !filters.to) return true;
    const day = formatTimestamp(unit.releasedAt, dayFormatter);
    return day && (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to);
  });
}

function HospitalPicker({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const controlId = useId();
  const summary = value || 'All hospitals';
  const query = search.trim().toLowerCase();
  const matches = options.filter(option => option.toLowerCase().includes(query));

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const dismiss = event => {
      if (!pickerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  function selectHospital(hospital) {
    onChange(hospital);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="utilization-picker" ref={pickerRef}
      onBlur={event => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <span id={`${controlId}-label`}>Hospital</span>
      <button
        type="button"
        ref={triggerRef}
        className="form-control utilization-picker-trigger"
        aria-labelledby={`${controlId}-label ${controlId}-value`}
        aria-expanded={open}
        aria-controls={`${controlId}-options`}
        onClick={() => { setSearch(''); setOpen(current => !current); }}
      >
        <span id={`${controlId}-value`} title={summary}>{summary}</span>
        <ChevronDownIcon aria-hidden="true" />
      </button>
      {open && (
        <div className="utilization-picker-panel" id={`${controlId}-options`} role="group" aria-labelledby={`${controlId}-label`}>
          <input
            type="search"
            ref={searchRef}
            className="form-control"
            aria-label="Search hospitals"
            placeholder="Search hospitals"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
          <ul className="utilization-picker-options">
            {!query && (
              <li>
                <button type="button" className="utilization-picker-option" aria-pressed={!value} onClick={() => selectHospital('')}>
                  All hospitals
                  {!value && <CheckIcon aria-hidden="true" />}
                </button>
              </li>
            )}
            {matches.map(option => (
              <li key={option}>
                <button type="button" className="utilization-picker-option" aria-pressed={option === value} onClick={() => selectHospital(option)}>
                  {option}
                  {option === value && <CheckIcon aria-hidden="true" />}
                </button>
              </li>
            ))}
            {!matches.length && <li className="utilization-picker-empty">No hospitals found.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

export function UtilizationFilters({ units, filters, onChange }) {
  const releaseDatesId = useId();
  const hospitals = [...new Set(units.map(unit => unit.hospitalName).filter(Boolean))].sort((first, second) => first.localeCompare(second));

  function bind(key) {
    return { value: filters[key], onChange: event => onChange({ ...filters, [key]: event.target.value }) };
  }

  return (
    <section className="content-card utilization-filters" aria-labelledby="utilization-filters-title">
      <div className="utilization-card-heading">
        <h3 className="card-title" id="utilization-filters-title">Filter utilization</h3>
        <button
          type="button"
          className="hospital-my-request-detail-button utilization-view-button"
          disabled={!Object.values(filters).some(value => Array.isArray(value) ? value.length > 0 : Boolean(value))}
          onClick={() => onChange(EMPTY_UTILIZATION_FILTERS)}
        >
          <ArrowPathIcon aria-hidden="true" />
          Clear filters
        </button>
      </div>
      <div className="utilization-filter-top">
        <label className="utilization-control utilization-dropdown utilization-filter-search">
          <span>Search records</span>
          <span className="utilization-search-input">
            <MagnifyingGlassIcon aria-hidden="true" />
            <input className="form-control" type="search" placeholder="Enter an ID" {...bind('search')} />
          </span>
        </label>
        <div className="utilization-date-range" role="group" aria-labelledby={releaseDatesId}>
          <span id={releaseDatesId} className="utilization-date-title"><CalendarDaysIcon aria-hidden="true" /> Release dates</span>
          <div className="utilization-date-fields">
            <label className="utilization-control utilization-dropdown">
              <span>From</span>
              <input className="form-control" type="date" aria-label="Release date from" max={filters.to || undefined} {...bind('from')} />
            </label>
            <label className="utilization-control utilization-dropdown">
              <span>To</span>
              <input className="form-control" type="date" aria-label="Release date to" min={filters.from || undefined} {...bind('to')} />
            </label>
          </div>
        </div>
      </div>
      <div className="utilization-filter-grid">
        <HospitalPicker options={hospitals} value={filters.hospital} onChange={hospital => onChange({ ...filters, hospital })} />
        {CHECKBOX_FILTERS.map(({ key, label, options }) => (
          <fieldset className="utilization-checkbox-filter" key={key}>
            <legend>{label}</legend>
            <div className="utilization-checkbox-options">
              {[...new Set([...options, ...units.map(unit => unit[key]).filter(Boolean)])].map(option => (
                <label key={option}>
                  <input
                    type="checkbox"
                    checked={filters[key].includes(option)}
                    onChange={event => onChange({
                      ...filters,
                      [key]: event.target.checked ? [...filters[key], option] : filters[key].filter(value => value !== option),
                    })}
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </section>
  );
}

function recentReleaseMonths(rows) {
  const months = rows.filter(row => /^\d{4}-\d{2}$/.test(row.label));
  if (!months.length) return [];
  const byMonth = new Map(months.map(row => [row.label, row]));
  const indexOfMonth = label => Number(label.slice(0, 4)) * 12 + Number(label.slice(5, 7)) - 1;
  const last = indexOfMonth(months.at(-1).label);
  const first = Math.max(indexOfMonth(months[0].label), last - CHART_GROUP_LIMIT + 1);
  return Array.from({ length: last - first + 1 }, (_, offset) => {
    const index = first + offset;
    const label = `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
    return byMonth.get(label) || { label, counts: { Used: 0, Expired: 0, Wasted: 0 } };
  });
}

function OutcomesChart({ rows, rankByWastage, trend }) {
  const canvasRef = useRef(null);
  const chartRows = trend
    ? recentReleaseMonths(rows)
    : rows.length > CHART_GROUP_LIMIT
      ? (rankByWastage
        ? rows.slice(0, CHART_GROUP_LIMIT)
        : [...rows].sort((first, second) => second.total - first.total).slice(0, CHART_GROUP_LIMIT))
      : rows;

  useEffect(() => {
    if (!chartRows.length) return;
    const chart = new Chart(canvasRef.current, {
      type: trend ? 'line' : 'bar',
      data: {
        labels: chartRows.map(row => row.label),
        datasets: trend ? [
          { label: 'Used', data: chartRows.map(row => row.counts.Used), borderColor: OUTCOME_COLORS[0], backgroundColor: OUTCOME_COLORS[0] },
          {
            label: 'Wastage (wasted + expired)',
            data: chartRows.map(row => row.counts.Wasted + row.counts.Expired),
            borderColor: OUTCOME_COLORS[1], backgroundColor: OUTCOME_COLORS[1],
          },
        ] : REPORT_OUTCOMES.map((label, index) => ({
          label, data: chartRows.map(row => row.counts[label]), backgroundColor: OUTCOME_COLORS[index],
          maxBarThickness: 22,
        })),
      },
      options: {
        indexAxis: trend ? 'x' : 'y',
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, color: '#334155', font: { size: 13 } } } },
        scales: trend ? {
          x: { ticks: AXIS_LABELS },
          y: { beginAtZero: true, ticks: { ...AXIS_LABELS, precision: 0 } },
        } : {
          x: { stacked: true, beginAtZero: true, ticks: { ...AXIS_LABELS, precision: 0 } },
          y: {
            stacked: true,
            ticks: {
              ...AXIS_LABELS,
              callback(value) {
                const label = this.getLabelForValue(value);
                return label.length > 24 ? `${label.slice(0, 23)}…` : label;
              },
            },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [chartRows, trend]);

  if (!chartRows.length) return <p className="card-subtitle">No release dates are available for the monthly trend.</p>;
  return (
    <>
      <div className="utilization-chart" style={{ height: trend ? 245 : Math.max(185, chartRows.length * 34 + 80) }}>
        <canvas ref={canvasRef} role="img" aria-label={trend
          ? 'Monthly trend for hospital-reported usage and wastage by release month.'
          : 'Hospital-reported outcomes by group. Counts are also shown in the table below.'} />
      </div>
      {trend ? (
        <p className="card-subtitle">Monthly counts use each bag’s release date. The chart covers up to 12 months.</p>
      ) : rows.length > CHART_GROUP_LIMIT && (
        <p className="card-subtitle">
          Chart shows the {CHART_GROUP_LIMIT} {rankByWastage ? 'hospitals with the most wastage' : 'largest groups'}. The table lists every group.
        </p>
      )}
    </>
  );
}

function WastageReasonBreakdown({ units, reasons, onShowReason }) {
  const counts = new Map([...reasons, 'Expired'].map(reason => [reason, 0]));
  for (const unit of units) {
    const reason = reportWastageReason(unit);
    if (reason) counts.set(reason, (counts.get(reason) || 0) + 1);
  }

  return (
    <div className="table-scroll">
      <table className="custom-table utilization-patterns utilization-reason-breakdown" aria-label="Wastage reason breakdown">
        <thead><tr><th scope="col">Reason</th><th scope="col">Bags</th><th scope="col">Records</th></tr></thead>
        <tbody>
          {[...counts].map(([reason, count]) => (
            <tr key={reason}>
              <th scope="row">{reason}</th>
              <td>{count}</td>
              <td>
                {count > 0 ? (
                  <button type="button" className="hospital-my-request-detail-button" onClick={() => onShowReason(reason)}
                    aria-label={`View wastage records for ${reason}`}>
                    View records
                  </button>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UtilizationAnalytics({ units, coverage, reasons, onShowReason, onSelectHospital }) {
  const [reportGroup, setReportGroup] = useState('component');
  const [coverageGroup, setCoverageGroup] = useState('hospital');
  const [chartView, setChartView] = useState('breakdown');
  const group = coverage ? coverageGroup : reportGroup;
  const trend = !coverage && chartView === 'monthly';
  const reasonView = !coverage && chartView === 'reasons';
  const groupOptions = coverage ? COVERAGE_GROUPS : PATTERN_GROUPS;
  const activeGroup = trend ? MONTH_GROUP : groupOptions.find(item => item.key === group);
  const rankByWastage = !coverage && !trend && !reasonView && group === 'hospital';
  const groups = new Map();

  for (const unit of units) {
    const label = activeGroup.read(unit) || 'Unknown';
    if (!groups.has(label)) {
      groups.set(label, { total: 0, counts: Object.fromEntries(UTILIZATION_OUTCOMES.map(outcome => [outcome, 0])) });
    }
    const row = groups.get(label);
    row.total += 1;
    row.counts[utilizationOutcome(unit)] += 1;
  }

  const rows = [...groups]
    .map(([label, row]) => ({ label, wastage: row.counts.Wasted + row.counts.Expired, ...row }))
    .sort((first, second) => (rankByWastage ? second.wastage - first.wastage : 0) || first.label.localeCompare(second.label));

  return (
    <section className="content-card" aria-labelledby="utilization-patterns-title">
      <div className="utilization-card-heading utilization-analytics-heading">
        <div>
          <h3 className="card-title" id="utilization-patterns-title">
            {coverage ? 'Reporting coverage' : reasonView ? 'Wastage reasons' : 'Usage and wastage patterns'}
          </h3>
          <p className="card-subtitle">
            {coverage
              ? 'Reporting rate counts hospital submissions out of all released bags.'
              : reasonView
                ? 'Choose a reason to see the matching wastage records.'
                : rankByWastage
                  ? 'Sorted by Wasted + Expired bags, highest first.'
                  : 'Wastage rate counts Wasted and Expired bags out of all hospital-confirmed reports.'}
          </p>
        </div>
        <div className="utilization-analytics-controls">
          {!coverage && (
            <label className="utilization-control utilization-dropdown">
              <span>Analytics view</span>
              <span className="utilization-select">
                <select className="form-control" value={chartView} onChange={event => setChartView(event.target.value)}>
                  <option value="breakdown">Breakdown</option>
                  <option value="monthly">Monthly trend</option>
                  <option value="reasons">Wastage reasons</option>
                </select>
                <ChevronDownIcon aria-hidden="true" />
              </span>
            </label>
          )}
          {!trend && !reasonView && (
            <label className="utilization-control utilization-dropdown">
              <span>Group by</span>
              <select className="form-control" value={group}
                onChange={event => (coverage ? setCoverageGroup : setReportGroup)(event.target.value)}>
                {groupOptions.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>
      {reasonView && <WastageReasonBreakdown units={units} reasons={reasons} onShowReason={onShowReason} />}
      {!coverage && !reasonView && rows.length > 0 && <OutcomesChart rows={rows} rankByWastage={rankByWastage} trend={trend} />}
      {!reasonView && <div className="table-scroll utilization-patterns-scroll">
        <table className="custom-table utilization-patterns">
          <thead>
            <tr>
              <th scope="col">{activeGroup.label}</th>
              {coverage && <th scope="col">Released</th>}
              <th scope="col">Hospital submitted</th>
              {(coverage ? COVERAGE_OUTCOMES : REPORT_OUTCOMES).map(outcome => (
                <th key={outcome} scope="col">{outcome === 'Assumed used' ? 'System assumed' : outcome}</th>
              ))}
              {rankByWastage && <th scope="col" aria-sort="descending">Total wastage</th>}
              <th scope="col">{coverage ? 'Reporting rate' : 'Wastage rate'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ label, counts, total, wastage }) => {
              const hospitalReports = REPORT_OUTCOMES.reduce((sum, outcome) => sum + counts[outcome], 0);
              const rate = coverage ? hospitalReports / total : wastage / hospitalReports;
              return (
                <tr key={label}>
                  <th scope="row">
                    {coverage && group === 'hospital' && label !== 'Unknown' ? (
                      <button type="button" className="utilization-hospital-link" onClick={() => onSelectHospital(label)}
                        aria-label={`Filter by hospital ${label}`}>
                        {label}
                      </button>
                    ) : label}
                  </th>
                  {coverage && <td>{total}</td>}
                  <td>{hospitalReports}</td>
                  {(coverage ? COVERAGE_OUTCOMES : REPORT_OUTCOMES).map(outcome => (
                    <td key={outcome}>{counts[outcome]}</td>
                  ))}
                  {rankByWastage && <td>{wastage}</td>}
                  <td>{`${(rate * 100).toFixed(0)}%`}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={coverage ? 6 : rankByWastage ? 8 : 7} className="empty-table">
                  {coverage ? 'No released units match these filters.' : 'No hospital reports match these filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>}
    </section>
  );
}

