import React, { useState, useEffect, useCallback } from 'react';
import './Utilization.css';

function Utilization() {
    const [reports, setReports] = useState([]);
    const [bloodUnits, setBloodUnits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Filter state
    const [filters, setFilters] = useState({
        bloodType: 'all',
        component: 'all',
        status: 'all'
    });

    // form state for new report
    const [formData, setFormData] = useState({
        bloodUnitID: '',
        status: 'Used',
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Fetch reports from the server, applying filters via query string
    const fetchReports = useCallback(async (currentFilters) => {
        try {
            const params = new URLSearchParams();
            if (currentFilters.bloodType !== 'all') {
                params.append('bloodType', currentFilters.bloodType);
            }
            if (currentFilters.component !== 'all') {
                params.append('component', currentFilters.component);
            }

            if (currentFilters.status !== 'all') {
                params.append('status', currentFilters.status);
            }

            const qs = params.toString();
            const url = `/api/inventories/reports${qs ? `?${qs}` : ''}`;

            const resp = await fetch(url);
            const data = await resp.json();

            if (data.success) {
                setReports(data.reports);
                setError(null);
            } else {
                setError(data.message || 'Failed to load reports');
            }
        } catch (err) {
            console.error('Error fetching reports:', err);
            setError('Network error occurred');
        }
    }, []);

    // Fetch blood units once (for the Log Usage dropdown)
    const fetchBloodUnits = useCallback(async () => {
        try {
            const resp = await fetch('/api/inventories/bloodUnits');
            const data = await resp.json();
            if (data.success) {
                setBloodUnits(data.bUnits);
            }
        } catch (err) {
            console.error('Error fetching blood units:', err);
        }
    }, []);

    // Initial load
    useEffect(() => {
        (async () => {
            setIsLoading(true);
            await Promise.all([fetchReports(filters), fetchBloodUnits()]);
            setIsLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-fetch whenever filters change (but skip the very first render,
    // since the mount effect already fetched)
    const [didMount, setDidMount] = useState(false);
    useEffect(() => {
        if (!didMount) {
            setDidMount(true);
            return;
        }
        fetchReports(filters);
    }, [filters, fetchReports, didMount]);

    const handleGenerateReport = () => setShowReportModal(true);

    const handleDownloadReport = async (format) => {
        if (format === 'excel') {
            try {
                const resp = await fetch('/api/inventories/create-utilization-report', {
                    method: 'POST'
                });
                if (!resp.ok) throw new Error('Failed to generate report');
                const blob = await resp.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'utilization-report.xlsx';
                a.click();
                window.URL.revokeObjectURL(url);
            } catch (err) {
                console.error(err);
                alert('Failed to download Excel report.');
            }
        } else {
            alert(`Report generation (${format.toUpperCase()}) will be implemented soon.`);
        }
        setShowReportModal(false);
    };

    const handleCreateReport = async (e) => {
        e.preventDefault();
        if (!formData.bloodUnitID || !formData.status) {
            alert('Please select a blood unit and a status.');
            return;
        }

        setSubmitting(true);
        try {
            const resp = await fetch('/api/inventories/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await resp.json();
            if (data.success) {
                setShowCreateModal(false);
                setFormData({ bloodUnitID: '', status: 'Used', description: '' });
                // Re-fetch with current filters
                await fetchReports(filters);
                await fetchBloodUnits();
            } else {
                alert(data.message || 'Failed to create report.');
            }
        } catch (err) {
            console.error(err);
            alert('Network error occurred.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (value) => {
        if (!value) return 'N/A';
        const d = value.$date ? new Date(value.$date) : new Date(value);
        return isNaN(d) ? 'N/A' : d.toLocaleDateString();
    };

    const getStatusClass = (status) =>
        (status || '').toLowerCase().replace(/\s+/g, '-');

    // Static option lists (they come from the BloodUnits enum, so we can hardcode)
    const bloodTypeOptions = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    const componentOptions = ['Packed RBC', 'Plasma', 'Platelets', 'Whole Blood'];
    const statusOptions = ['Used', 'Wasted', 'Expired', 'Unused'];

    const resetFilters = () => setFilters({ bloodType: 'all', component: 'all' });

    const hasActiveFilters =
        filters.bloodType !== 'all' || filters.component !== 'all';

    if (isLoading) return <div className="loading-state">Loading utilization reports...</div>;
    if (error) return <div className="error-state">Error: {error}</div>;

    return (
        <div className="utilization-container">
            {/* Header */}
            <div className="utilization-header">
                <div>
                    <h2>Blood Utilization Reports</h2>
                    <p className="subtitle">
                        Track blood usage, wastage, and expiration records
                    </p>
                </div>
                <div className="header-actions">
                    <button
                        className="generate-report-btn"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <span className="btn-icon">＋</span>
                        Log Usage
                    </button>
                    <button
                        className="generate-report-btn"
                        onClick={handleGenerateReport}
                    >
                        <span className="btn-icon">📊</span>
                        Generate Reports
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-bar">
                <div className="filter-group">
                    <label htmlFor="filter-blood-type">Blood Type</label>
                    <select
                        id="filter-blood-type"
                        value={filters.bloodType}
                        onChange={(e) =>
                            setFilters((f) => ({ ...f, bloodType: e.target.value }))
                        }
                    >
                        <option value="all">All</option>
                        {bloodTypeOptions.map((bt) => (
                            <option key={bt} value={bt}>{bt}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="filter-component">Component</label>
                    <select
                        id="filter-component"
                        value={filters.component}
                        onChange={(e) =>
                            setFilters((f) => ({ ...f, component: e.target.value }))
                        }
                    >
                        <option value="all">All</option>
                        {componentOptions.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="filter-status">Status</label>
                    <select
                        id="filter-status"
                        value={filters.status}
                        onChange={(e) =>
                            setFilters((f) => ({ ...f, status: e.target.value }))
                        }
                    >
                        <option value="all">All</option>
                        {statusOptions.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group filter-group-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={resetFilters}
                        disabled={!hasActiveFilters}
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Summary cards (reflect filtered data) */}
            {reports.length > 0 && (
                <div className="summary-cards">
                    <div className="summary-card">
                        <span className="summary-label">Total Reports</span>
                        <span className="summary-value">{reports.length}</span>
                    </div>
                    <div className="summary-card">
                        <span className="summary-label">Used</span>
                        <span className="summary-value">
                            {reports.filter((r) => r.status === 'Used').length}
                        </span>
                    </div>
                    <div className="summary-card">
                        <span className="summary-label">Wasted</span>
                        <span className="summary-value">
                            {reports.filter((r) => r.status === 'Wasted').length}
                        </span>
                    </div>
                    <div className="summary-card">
                        <span className="summary-label">Expired</span>
                        <span className="summary-value">
                            {reports.filter((r) => r.status === 'Expired').length}
                        </span>
                    </div>
                </div>
            )}

            {/* Reports table */}
            {reports.length === 0 ? (
                <p className="empty-state">
                    {hasActiveFilters
                        ? 'No reports match the selected filters.'
                        : 'No utilization reports have been created yet.'}
                </p>
            ) : (
                <div className="table-wrapper">
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>Report ID</th>
                                <th>Blood Unit ID</th>
                                <th>Blood Type</th>
                                <th>Component</th>
                                <th>Status</th>
                                <th>Description</th>
                                <th>Date Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((r) => (
                                <tr key={r._id?.$oid || r._id}>
                                    <td>{r._id?.$oid || r._id}</td>
                                    <td>{r.bloodUnitID?.bloodUnitID || 'N/A'}</td>
                                    <td>
                                        {r.bloodUnitID?.bloodType ? (
                                            <span className="blood-type-badge">
                                                {r.bloodUnitID.bloodType}
                                            </span>
                                        ) : (
                                            'N/A'
                                        )}
                                    </td>
                                    <td>{r.bloodUnitID?.component || 'N/A'}</td>
                                    <td>
                                        <span className={`status-badge ${getStatusClass(r.status)}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td>{r.description || '—'}</td>
                                    <td>{formatDate(r.dateCreated)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Generate Report modal */}
            {showReportModal && (
                <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Generate Report</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowReportModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Select the format for your utilization report:</p>
                            <div className="report-options">
                                <button
                                    className="report-option-btn"
                                    onClick={() => handleDownloadReport('pdf')}
                                >
                                    <span className="option-icon">📄</span>
                                    <span>PDF Report</span>
                                </button>
                                <button
                                    className="report-option-btn"
                                    onClick={() => handleDownloadReport('csv')}
                                >
                                    <span className="option-icon">📊</span>
                                    <span>CSV Export</span>
                                </button>
                                <button
                                    className="report-option-btn"
                                    onClick={() => handleDownloadReport('excel')}
                                >
                                    <span className="option-icon">📈</span>
                                    <span>Excel Sheet</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Report modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Log Blood Usage</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowCreateModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleCreateReport} className="report-form">
                                <label>
                                    Blood Unit
                                    <select
                                        value={formData.bloodUnitID}
                                        onChange={(e) =>
                                            setFormData({ ...formData, bloodUnitID: e.target.value })
                                        }
                                        required
                                    >
                                        <option value="">Select a blood unit…</option>
                                        {bloodUnits.map((unit, index) => {
                                            const id =
                                                typeof unit._id === 'string' ? unit._id :
                                                unit._id?.$oid ? unit._id.$oid :
                                                null;

                                            return (
                                                <option
                                                    key={id || `unit-${index}`}
                                                    value={id || ''}
                                                    disabled={!id}
                                                >
                                                    {unit.bloodUnitID} — {unit.bloodType} {unit.component} (Status: {unit.status})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </label>

                                <label>
                                    Status
                                    <select
                                        value={formData.status}
                                        onChange={(e) =>
                                            setFormData({ ...formData, status: e.target.value })
                                        }
                                    >
                                        <option value="Used">Used</option>
                                        <option value="Wasted">Wasted</option>
                                        <option value="Expired">Expired</option>
                                        <option value="Unused">Unused</option>
                                    </select>
                                </label>

                                <label>
                                    Description
                                    <textarea
                                        rows="3"
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({ ...formData, description: e.target.value })
                                        }
                                        placeholder="Optional notes about this usage…"
                                    />
                                </label>

                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => setShowCreateModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="generate-report-btn"
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Saving…' : 'Save Report'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Utilization;