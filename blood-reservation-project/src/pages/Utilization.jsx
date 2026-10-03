import React, { useState, useEffect, useRef } from 'react';
import './Utilization.css'; // Add this import for the styles

function Utilization() {
    const [bloodInventory, setBloodInventory] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);

    useEffect(() => {
        loadBloodInventory();
    }, []);

    const loadBloodInventory = async () => {
        setIsLoading(true);
        try {
            const resp = await fetch('/api/inventories');

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
            setError('Network error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateReport = () => {
        setShowReportModal(true);
    };

    const handleDownloadReport = (format) => {
        // Temporary: just log. Replace with actual report generation logic.
        console.log(`Generating ${format} report...`);
        alert(`Report generation (${format.toUpperCase()}) will be implemented soon.`);
        setShowReportModal(false);
    };

    if (isLoading) return <div className="loading-state">Loading blood inventory...</div>;
    if (error) return <div className="error-state">Error: {error}</div>;

    return (
        <div className="utilization-container">
            {/* Header with title and button */}
            <div className="utilization-header">
                <div>
                    <h2>Available Blood Supplies</h2>
                    <p className="subtitle">Real-time overview of blood inventory across facilities</p>
                </div>
                <button
                    className="generate-report-btn"
                    onClick={handleGenerateReport}
                >
                    <span className="btn-icon">📊</span>
                    Generate Reports
                </button>
            </div>

            {/* Summary cards */}
            {bloodInventory && bloodInventory.length > 0 && (
                <div className="summary-cards">
                    <div className="summary-card">
                        <span className="summary-label">Total Inventory Items</span>
                        <span className="summary-value">{bloodInventory.length}</span>
                    </div>
                    <div className="summary-card">
                        <span className="summary-label">Total Quantity</span>
                        <span className="summary-value">
                            {bloodInventory.reduce((sum, item) => sum + (item.availQuantity || 0), 0)}
                        </span>
                    </div>
                    <div className="summary-card">
                        <span className="summary-label">Blood Types</span>
                        <span className="summary-value">
                            {new Set(bloodInventory.map((item) => item.bloodType)).size}
                        </span>
                    </div>
                    <div className="summary-card">
                        <span className="summary-label">Components</span>
                        <span className="summary-value">
                            {new Set(bloodInventory.map((item) => item.component)).size}
                        </span>
                    </div>
                </div>
            )}

            {/* Inventory table */}
            {bloodInventory.length === 0 ? (
                <p className="empty-state">No blood supplies currently in inventory.</p>
            ) : (
                <div className="table-wrapper">
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
                                    <td>
                                        <span className="blood-type-badge">{item.bloodType}</span>
                                    </td>
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
                </div>
            )}

            {/* Report modal */}
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
                            <p>Select the format for your inventory report:</p>
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
        </div>
    );
}

export default Utilization;