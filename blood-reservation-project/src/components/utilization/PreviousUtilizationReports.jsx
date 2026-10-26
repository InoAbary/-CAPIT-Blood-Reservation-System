import { useState } from 'react';

function PreviousUtilizationReports({
    reports,
    loading,
    error
}) {
    const [selectedReport, setSelectedReport] = useState(null);

    const formatDate = (value) => {
        if (!value) return '—';

        return new Date(value).toLocaleString();
    };

    if (loading) {
        return (
            <div className="hu-state-box">
                Loading previous reports...
            </div>
        );
    }

    if (error) {
        return (
            <div className="hu-alert hu-alert--error">
                {error}
            </div>
        );
    }

    if (!reports.length) {
        return (
            <div>
                <SectionHeading
                    title="Previous Reports"
                    description="Review utilization reports submitted by your hospital."
                    count="0 reports"
                />

                <div className="hu-empty-state">
                    <div className="hu-empty-title">
                        No reports submitted yet
                    </div>

                    <div className="hu-empty-description">
                        Submitted utilization reports will appear here.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <SectionHeading
                title="Previous Reports"
                description="Review utilization reports submitted by your hospital."
                count={`${reports.length} ${
                    reports.length === 1
                        ? 'report'
                        : 'reports'
                }`}
            />

            <div className="hu-desktop-data">
                <div className="hu-report-grid hu-data-header">
                    <div>Report</div>
                    <div>Blood Unit</div>
                    <div>Blood</div>
                    <div>Component</div>
                    <div>Status</div>
                    <div>Reported</div>
                    <div className="hu-action-heading">
                        Action
                    </div>
                </div>

                <div className="hu-data-list">
                    {reports.map((report) => (
                        <div
                            key={report._id}
                            className="hu-report-grid hu-data-row"
                        >
                            <div className="hu-code">
                                {report.reportID || '—'}
                            </div>

                            <div className="hu-primary-cell">
                                {report.bloodUnitID?.bloodUnitID || '—'}
                            </div>

                            <div>
                                <span className="hu-blood-badge">
                                    {report.bloodUnitID?.bloodType || '—'}
                                </span>
                            </div>

                            <div className="hu-normal-cell">
                                {report.bloodUnitID?.component || '—'}
                            </div>

                            <div>
                                <StatusBadge
                                    status={report.status}
                                />
                            </div>

                            <div className="hu-date-cell">
                                {formatDate(report.dateCreated)}
                            </div>

                            <div className="hu-row-action">
                                <button
                                    type="button"
                                    className="hu-button hu-button--outline"
                                    onClick={() => setSelectedReport(report)}
                                >
                                    View
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="hu-mobile-data">
                {reports.map((report) => (
                    <article
                        key={report._id}
                        className="hu-mobile-card"
                    >
                        <div className="hu-mobile-card-header">
                            <div>
                                <div className="hu-code">
                                    {report.reportID || '—'}
                                </div>

                                <div className="hu-mobile-patient">
                                    {report.bloodUnitID?.bloodUnitID || '—'}
                                </div>
                            </div>

                            <StatusBadge
                                status={report.status}
                            />
                        </div>

                        <div className="hu-mobile-info-grid hu-mobile-info-grid--two">
                            <MobileValue
                                label="Blood Type"
                                value={report.bloodUnitID?.bloodType}
                                red
                            />

                            <MobileValue
                                label="Component"
                                value={report.bloodUnitID?.component}
                            />
                        </div>

                        <div className="hu-mobile-reported">
                            <span>Reported</span>

                            <strong>
                                {formatDate(report.dateCreated)}
                            </strong>
                        </div>

                        <button
                            type="button"
                            className="hu-button hu-button--outline hu-button--full hu-mobile-action"
                            onClick={() => setSelectedReport(report)}
                        >
                            View Details
                        </button>
                    </article>
                ))}
            </div>

            {selectedReport && (
                <ReportDetailsModal
                    report={selectedReport}
                    formatDate={formatDate}
                    onClose={() => setSelectedReport(null)}
                />
            )}
        </>
    );
}

function ReportDetailsModal({
    report,
    formatDate,
    onClose
}) {
    const getReporter = () => {
        if (report.reportedBy) {
            const name = [
                report.reportedBy.firstName,
                report.reportedBy.lastName
            ]
                .filter(Boolean)
                .join(' ');

            if (name) return name;
        }

        if (report.reportSource === 'System') {
            return 'System';
        }

        return 'Hospital';
    };

    return (
        <div
            className="hu-modal-backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="hu-detail-modal">
                <div className="hu-modal-header">
                    <div>
                        <div className="hu-modal-eyebrow">
                            Utilization Report
                        </div>

                        <div className="hu-modal-title">
                            {report.reportID || 'Report Details'}
                        </div>
                    </div>

                    <button
                        type="button"
                        className="hu-close-button"
                        onClick={onClose}
                        aria-label="Close report"
                    >
                        ×
                    </button>
                </div>

                <div className="hu-detail-modal-body">
                    <div className="hu-detail-grid">
                        <Detail
                            label="Blood Unit"
                            value={report.bloodUnitID?.bloodUnitID}
                        />

                        <Detail
                            label="Blood Type"
                            value={report.bloodUnitID?.bloodType}
                            red
                        />

                        <Detail
                            label="Component"
                            value={report.bloodUnitID?.component}
                        />

                        <div className="hu-detail-card">
                            <div className="hu-detail-label">
                                Status
                            </div>

                            <div className="hu-detail-status">
                                <StatusBadge
                                    status={report.status}
                                />
                            </div>
                        </div>

                        <Detail
                            label="Source"
                            value={
                                report.reportSource === 'System'
                                    ? report.isAssumed
                                        ? 'System — Assumed'
                                        : 'System'
                                    : 'Hospital'
                            }
                        />

                        <Detail
                            label="Reported By"
                            value={getReporter()}
                        />
                    </div>

                    <div className="hu-detail-full">
                        <Detail
                            label="Date Reported"
                            value={formatDate(report.dateCreated)}
                        />
                    </div>

                    <div className="hu-detail-full">
                        <Detail
                            label="Notes"
                            value={
                                report.description ||
                                'No notes provided.'
                            }
                        />
                    </div>
                </div>

                <div className="hu-modal-footer">
                    <button
                        type="button"
                        className="hu-button hu-button--secondary"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function SectionHeading({
    title,
    description,
    count
}) {
    return (
        <div className="hu-section-header">
            <div className="hu-section-title-row">
                <div className="hu-section-title">
                    {title}
                </div>

                <div className="hu-section-count">
                    {count}
                </div>
            </div>

            <div className="hu-section-description">
                {description}
            </div>
        </div>
    );
}

function StatusBadge({
    status
}) {
    return (
        <span
            className="hu-status-badge"
            data-status={status}
        >
            {status}
        </span>
    );
}

function Detail({
    label,
    value,
    red = false
}) {
    return (
        <div className="hu-detail-card">
            <div className="hu-detail-label">
                {label}
            </div>

            <div
                className={
                    red
                        ? 'hu-detail-value hu-text-red'
                        : 'hu-detail-value'
                }
            >
                {value || '—'}
            </div>
        </div>
    );
}

function MobileValue({
    label,
    value,
    red = false
}) {
    return (
        <div className="hu-mobile-info">
            <div className="hu-mobile-info-label">
                {label}
            </div>

            <div
                className={
                    red
                        ? 'hu-mobile-info-value hu-text-red'
                        : 'hu-mobile-info-value'
                }
            >
                {value || '—'}
            </div>
        </div>
    );
}

export default PreviousUtilizationReports;