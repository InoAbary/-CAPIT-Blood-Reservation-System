<<<<<<< Updated upstream
import React, { useState, useEffect, useRef } from 'react';


function Utilization() {

    const [bloodInventory, setBloodInventory] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        loadBloodInventory();
    }, [])
=======
import React, { useState, useEffect } from 'react';
import './Utilization.css';

function Utilization() {
    const [reports, setReports] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // form state for new report
    const [formData, setFormData] = useState({
        inventoryId: '',
        status: 'Used',
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);
>>>>>>> Stashed changes

    const loadData = async () => {
        setIsLoading(true);
<<<<<<< Updated upstream
        try{
            const resp = await fetch ('/api/inventories')

            if (resp.ok) {
                const data = await resp.json();
                if (data.success) {
                    setBloodInventory(data.inventories);
                } else {
                    setError(data.message || 'Failed to load data');
                }
            } else {
                setError('Server responded with an error');
            } 

        } catch (error) {
            console.error('Error loading blood inventory:', error);
=======
        setError(null);
        try {
            const [reportsResp, invResp] = await Promise.all([
                fetch('/api/inventories/reports'),
                fetch('/api/inventories')
            ]);

            const reportsData = await reportsResp.json();
            const invData = await invResp.json();

            if (reportsData.success) setReports(reportsData.reports);
            else setError(reportsData.message || 'Failed to load reports');

            

            if (invData.success) {
                console.log('First inventory item:', invData.inventories[0]);
                setInventory(invData.inventories);
            }
        } catch (err) {
            console.error('Error loading data:', err);
>>>>>>> Stashed changes
            setError('Network error occurred');
        } finally {
            setIsLoading(false);
        }
    
    };

<<<<<<< Updated upstream
    if (isLoading) return <div>Loading blood inventory...</div>;
    if (error) return <div>Error: {error}</div>;
=======
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
        if (!formData.inventoryId || !formData.status) {
            alert('Please select an inventory item and a status.');
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
                setFormData({ inventoryId: '', status: 'Used', description: '' });
                await loadData();
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

    if (isLoading) return <div className="loading-state">Loading utilization reports...</div>;
    if (error) return <div className="error-state">Error: {error}</div>;
>>>>>>> Stashed changes

    return (

        <div className="utilization-container">
<<<<<<< Updated upstream
            <h2>Available Blood Supplies</h2>
            
            {bloodInventory.length === 0 ? (
                <p>No blood supplies currently in inventory.</p>
            ) : (
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Inventory ID</th>
                            <th>Facility ID</th>
                            <th>Blood Type</th>
                            <th>Component</th>
                            <th>Quantity</th>
                            <th>Status</th>
                            <th>Last Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bloodInventory.map((item) => (
                            <tr key={item._id?.$oid || item.inventoryID}>
                                <td>{item.inventoryID}</td>
                                <td>{item.facilityID}</td>
                                <td><strong>{item.bloodType}</strong></td>
                                <td>{item.component}</td>
                                <td>{item.availQuantity}</td>
                                <td>
                                    <span className={`status-badge ${item.availStatus?.toLowerCase()}`}>
                                        {item.availStatus}
                                    </span>
                                </td>
                                <td>
                                    {item.lastUpdated?.$date 
                                        ? new Date(item.lastUpdated.$date).toLocaleDateString() 
                                        : 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
=======
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

            {/* Summary cards */}
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
                <p className="empty-state">No utilization reports have been created yet.</p>
            ) : (
                <div className="table-wrapper">
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>Report ID</th>
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
                                    <td>
                                        {r.inventoryId?.bloodType ? (
                                            <span className="blood-type-badge">
                                                {r.inventoryId.bloodType}
                                            </span>
                                        ) : (
                                            'N/A'
                                        )}
                                    </td>
                                    <td>{r.inventoryId?.component || 'N/A'}</td>
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
>>>>>>> Stashed changes
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
                                    Inventory Item
                                    <select
                                        value={formData.inventoryId}
                                        onChange={(e) =>
                                            setFormData({ ...formData, inventoryId: e.target.value })
                                        }
                                        required
                                    >
                                        <option value="">Select an inventory item…</option>
                                        {inventory.map((item, index) => {
                                            
                                            const id =
                                                typeof item._id === 'string' ? item._id :
                                                item._id?.$oid ? item._id.$oid :
                                                item.inventoryID || null;
                                
                                            return(
                                                <option
                                                    key={id || `inv-${index}`}
                                                    value={id || ''}
                                                    disabled={!id}
                                                >
                                                    {item.bloodType} — {item.component} (Qty: {item.availQuantity})
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
    )

}

export default Utilization;