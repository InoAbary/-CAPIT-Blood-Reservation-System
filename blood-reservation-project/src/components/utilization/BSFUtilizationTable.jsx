function BSFUtilizationTable({
    reports,
    hasFilters,
    onView
}) {
    if (!reports.length) {
        return (
            <div className="bu-empty-state">
                <div className="bu-empty-title">
                    No utilization reports found
                </div>

                <div className="bu-empty-description">
                    {hasFilters
                        ? 'Try adjusting or clearing your filters.'
                        : 'Utilization reports will appear here once hospitals submit utilization records.'}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bu-desktop-data">
                <div className="bu-report-grid bu-data-header">
                    <div>Report</div>
                    <div>Blood Unit</div>
                    <div>Hospital</div>
                    <div>Blood</div>
                    <div>Component</div>
                    <div>Status</div>
                    <div>Source</div>
                    <div className="bu-action-heading">
                        Action
                    </div>
                </div>

                <div className="bu-data-list">
                    {reports.map((report) => (
                        <div
                            key={report.id}
                            className="bu-report-grid bu-data-row"
                        >
                            <div className="bu-code">
                                {report.reportID}
                            </div>

                            <div className="bu-primary-cell">
                                {report.bloodUnitID}
                            </div>

                            <div
                                className="bu-normal-cell"
                                title={report.hospital}
                            >
                                {report.hospital}
                            </div>

                            <div>
                                <span className="bu-blood-badge">
                                    {report.bloodType}
                                </span>
                            </div>

                            <div
                                className="bu-normal-cell"
                                title={report.component}
                            >
                                {report.component}
                            </div>

                            <div>
                                <span
                                    className="bu-status-badge"
                                    data-status={report.status}
                                >
                                    {report.status}
                                </span>
                            </div>

                            <div>
                                <span
                                    className="bu-source-badge"
                                    data-source={report.reportSource}
                                >
                                    {report.sourceDisplay}
                                </span>
                            </div>

                            <div className="bu-row-action">
                                <button
                                    type="button"
                                    className="bu-button bu-button--outline"
                                    onClick={() => onView(report)}
                                >
                                    View
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bu-mobile-data">
                {reports.map((report) => (
                    <article
                        key={report.id}
                        className="bu-mobile-card"
                    >
                        <div className="bu-mobile-card-header">
                            <div>
                                <div className="bu-code">
                                    {report.reportID}
                                </div>

                                <div className="bu-mobile-unit">
                                    {report.bloodUnitID}
                                </div>
                            </div>

                            <span
                                className="bu-status-badge"
                                data-status={report.status}
                            >
                                {report.status}
                            </span>
                        </div>

                        <div className="bu-mobile-hospital">
                            <span>Hospital</span>

                            <strong>
                                {report.hospital}
                            </strong>
                        </div>

                        <div className="bu-mobile-info-grid">
                            <Info
                                label="Blood Type"
                                value={report.bloodType}
                                red
                            />

                            <Info
                                label="Component"
                                value={report.component}
                            />

                            <Info
                                label="Source"
                                value={report.sourceDisplay}
                            />
                        </div>

                        <button
                            type="button"
                            className="bu-button bu-button--outline bu-button--full bu-mobile-action"
                            onClick={() => onView(report)}
                        >
                            View Details
                        </button>
                    </article>
                ))}
            </div>
        </>
    );
}

function Info({
    label,
    value,
    red = false
}) {
    return (
        <div className="bu-mobile-info">
            <div className="bu-mobile-info-label">
                {label}
            </div>

            <div
                className={
                    red
                        ? 'bu-mobile-info-value bu-text-red'
                        : 'bu-mobile-info-value'
                }
            >
                {value}
            </div>
        </div>
    );
}

export default BSFUtilizationTable;