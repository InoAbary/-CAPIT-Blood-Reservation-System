function HospitalRequestList({
    requests,
    onReport
}) {
    const getPatientName = (request) =>
        [
            request.firstName,
            request.middleName,
            request.lastName
        ]
            .filter(Boolean)
            .join(' ') || '—';

    const getRequestID = (request) =>
        request.requestID ||
        (
            request._id
                ? `REQ-${request._id.slice(-6).toUpperCase()}`
                : '—'
        );

    if (!requests.length) {
        return (
            <div>
                <SectionHeading
                    title="Requests Ready for Reporting"
                    description="Fulfilled requests that require a utilization report."
                    count="0 requests"
                />

                <div className="hu-empty-state">
                    <div className="hu-empty-icon">
                        ✓
                    </div>

                    <div className="hu-empty-title">
                        You're all caught up
                    </div>

                    <div className="hu-empty-description">
                        No fulfilled requests are currently waiting
                        for utilization reporting.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <SectionHeading
                title="Requests Ready for Reporting"
                description="Select a fulfilled request to report its released blood units."
                count={`${requests.length} ${
                    requests.length === 1
                        ? 'request'
                        : 'requests'
                }`}
            />

            <div className="hu-desktop-data">
                <div className="hu-request-grid hu-data-header">
                    <div>Request</div>
                    <div>Patient</div>
                    <div>Blood</div>
                    <div>Component</div>
                    <div>Units</div>
                    <div>Status</div>
                    <div className="hu-action-heading">
                        Action
                    </div>
                </div>

                <div className="hu-data-list">
                    {requests.map((request) => (
                        <div
                            key={request._id}
                            className="hu-request-grid hu-data-row"
                        >
                            <div className="hu-code">
                                {getRequestID(request)}
                            </div>

                            <div className="hu-patient-cell">
                                <div className="hu-primary-cell">
                                    {getPatientName(request)}
                                </div>

                                {request.wardRoom && (
                                    <div className="hu-secondary-cell">
                                        Ward/Room {request.wardRoom}
                                    </div>
                                )}
                            </div>

                            <div>
                                <span className="hu-blood-badge">
                                    {request.bloodType || '—'}
                                </span>
                            </div>

                            <div className="hu-normal-cell">
                                {request.component || '—'}
                            </div>

                            <div className="hu-primary-cell">
                                {request.units ?? '—'}
                            </div>

                            <div>
                                <StatusBadge
                                    status="Fulfilled"
                                    dot
                                />
                            </div>

                            <div className="hu-row-action">
                                <button
                                    type="button"
                                    className="hu-button hu-button--primary"
                                    onClick={() => onReport(request)}
                                >
                                    Report
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="hu-mobile-data">
                {requests.map((request) => (
                    <article
                        key={request._id}
                        className="hu-mobile-card"
                    >
                        <div className="hu-mobile-card-header">
                            <div className="hu-mobile-request">
                                <div className="hu-code">
                                    {getRequestID(request)}
                                </div>

                                <div className="hu-mobile-patient">
                                    {getPatientName(request)}
                                </div>

                                {request.wardRoom && (
                                    <div className="hu-secondary-cell">
                                        Ward/Room {request.wardRoom}
                                    </div>
                                )}
                            </div>

                            <StatusBadge
                                status="Fulfilled"
                                dot
                            />
                        </div>

                        <div className="hu-mobile-info-grid">
                            <MobileValue
                                label="Blood Type"
                                value={request.bloodType}
                                red
                            />

                            <MobileValue
                                label="Component"
                                value={request.component}
                            />

                            <MobileValue
                                label="Units"
                                value={request.units}
                            />
                        </div>

                        <button
                            type="button"
                            className="hu-button hu-button--primary hu-button--full hu-mobile-action"
                            onClick={() => onReport(request)}
                        >
                            Report Utilization
                        </button>
                    </article>
                ))}
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
    status,
    dot = false
}) {
    return (
        <span
            className="hu-status-badge"
            data-status={status}
        >
            {dot && (
                <span className="hu-status-dot" />
            )}

            {status}
        </span>
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
                {value ?? '—'}
            </div>
        </div>
    );
}

export default HospitalRequestList;