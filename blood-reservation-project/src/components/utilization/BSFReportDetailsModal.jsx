function BSFReportDetailsModal({
    report,
    onClose
}) {
    const formatDate = (value) => {
        if (!value) return '—';

        return new Date(value).toLocaleString();
    };

    return (
        <div
            className="bu-modal-backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="bu-detail-modal">
                <div className="bu-modal-header">
                    <div>
                        <div className="bu-modal-eyebrow">
                            Utilization Record
                        </div>

                        <div className="bu-modal-title">
                            {report.reportID}
                        </div>
                    </div>

                    <button
                        type="button"
                        className="bu-close-button"
                        onClick={onClose}
                        aria-label="Close report"
                    >
                        ×
                    </button>
                </div>

                <div className="bu-detail-modal-body">
                    <div className="bu-detail-grid">
                        <Detail
                            label="Blood Unit"
                            value={report.bloodUnitID}
                        />

                        <Detail
                            label="Blood Type"
                            value={report.bloodType}
                            red
                        />

                        <Detail
                            label="Request"
                            value={report.requestID}
                        />

                        <Detail
                            label="Component"
                            value={report.component}
                        />

                        <Detail
                            label="Hospital"
                            value={report.hospital}
                        />

                        <div className="bu-detail-card">
                            <div className="bu-detail-label">
                                Status
                            </div>

                            <div className="bu-detail-badge">
                                <span
                                    className="bu-status-badge"
                                    data-status={report.status}
                                >
                                    {report.status}
                                </span>
                            </div>
                        </div>

                        <div className="bu-detail-card">
                            <div className="bu-detail-label">
                                Source
                            </div>

                            <div className="bu-detail-badge">
                                <span
                                    className="bu-source-badge"
                                    data-source={report.reportSource}
                                >
                                    {report.sourceDisplay}
                                </span>
                            </div>
                        </div>

                        <Detail
                            label="Reported By"
                            value={report.reportedBy}
                        />

                        <Detail
                            label="Date Reported"
                            value={formatDate(report.dateCreated)}
                        />
                    </div>

                    <div className="bu-detail-full">
                        <Detail
                            label="Description / Notes"
                            value={
                                report.description ||
                                'No notes provided.'
                            }
                        />
                    </div>
                </div>

                <div className="bu-modal-footer">
                    <button
                        type="button"
                        className="bu-button bu-button--secondary"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function Detail({
    label,
    value,
    red = false
}) {
    return (
        <div className="bu-detail-card">
            <div className="bu-detail-label">
                {label}
            </div>

            <div
                className={
                    red
                        ? 'bu-detail-value bu-text-red'
                        : 'bu-detail-value'
                }
            >
                {value || '—'}
            </div>
        </div>
    );
}

export default BSFReportDetailsModal;