function UtilizationReportForm({
    selectedRequest,
    releasedUnits,
    reportValues,
    unitsLoading,
    unitsError,
    submitError,
    submitting,
    onChange,
    onSubmit,
    onCancel
}) {
    if (!selectedRequest) return null;

    const getPatientName = () =>
        [
            selectedRequest.firstName,
            selectedRequest.middleName,
            selectedRequest.lastName
        ]
            .filter(Boolean)
            .join(' ') || '—';

    const getRequestID = () =>
        selectedRequest.requestID ||
        (
            selectedRequest._id
                ? `REQ-${selectedRequest._id.slice(-6).toUpperCase()}`
                : '—'
        );

    return (
        <div
            className="hu-modal-backdrop"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !submitting
                ) {
                    onCancel();
                }
            }}
        >
            <div className="hu-form-modal">
                <div className="hu-modal-header">
                    <div>
                        <div className="hu-modal-eyebrow">
                            Utilization Report
                        </div>

                        <div className="hu-modal-title">
                            {getPatientName()}
                        </div>

                        <div className="hu-modal-meta">
                            <span className="hu-code">
                                {getRequestID()}
                            </span>

                            <span
                                className="hu-status-badge"
                                data-status="Fulfilled"
                            >
                                <span className="hu-status-dot" />
                                Fulfilled
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="hu-close-button"
                        onClick={onCancel}
                        disabled={submitting}
                        aria-label="Close report"
                    >
                        ×
                    </button>
                </div>

                <div className="hu-summary-grid">
                    <Summary
                        label="Blood Type"
                        value={selectedRequest.bloodType}
                        red
                    />

                    <Summary
                        label="Component"
                        value={selectedRequest.component}
                    />

                    <Summary
                        label="Units Requested"
                        value={selectedRequest.units}
                    />

                    <Summary
                        label="Request Status"
                        value="Fulfilled"
                        green
                    />
                </div>

                <div className="hu-modal-body">
                    <div className="hu-section-header">
                        <div className="hu-section-title-row">
                            <div className="hu-section-title">
                                Released Blood Units
                            </div>

                            {!unitsLoading && releasedUnits.length > 0 && (
                                <div className="hu-section-count">
                                    {releasedUnits.length}{' '}
                                    {releasedUnits.length === 1
                                        ? 'unit'
                                        : 'units'}
                                </div>
                            )}
                        </div>

                        <div className="hu-section-description">
                            Select a utilization outcome for every released unit.
                        </div>
                    </div>

                    {unitsLoading ? (
                        <div className="hu-state-box">
                            Loading released blood units...
                        </div>
                    ) : unitsError ? (
                        <div className="hu-alert hu-alert--error">
                            {unitsError}
                        </div>
                    ) : !releasedUnits.length ? (
                        <div className="hu-state-box">
                            No released blood units were found
                            for this request.
                        </div>
                    ) : (
                        <div className="hu-unit-list">
                            {releasedUnits.map((unit, index) => (
                                <BloodUnitReport
                                    key={unit._id}
                                    unit={unit}
                                    index={index}
                                    value={
                                        reportValues[unit._id] || {}
                                    }
                                    onChange={onChange}
                                />
                            ))}
                        </div>
                    )}

                    {submitError && (
                        <div className="hu-alert hu-alert--error hu-submit-error">
                            {submitError}
                        </div>
                    )}
                </div>

                <div className="hu-modal-footer">
                    <button
                        type="button"
                        className="hu-button hu-button--secondary"
                        onClick={onCancel}
                        disabled={submitting}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        className="hu-button hu-button--primary"
                        onClick={onSubmit}
                        disabled={
                            submitting ||
                            unitsLoading ||
                            !releasedUnits.length
                        }
                    >
                        {submitting
                            ? 'Submitting...'
                            : 'Submit Report'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function BloodUnitReport({
    unit,
    index,
    value,
    onChange
}) {
    return (
        <article className="hu-unit-card">
            <div className="hu-unit-header">
                <div>
                    <div className="hu-unit-label">
                        Blood Unit {index + 1}
                    </div>

                    <div className="hu-unit-id">
                        {unit.bloodUnitID}
                    </div>
                </div>

                <div className="hu-unit-badges">
                    <span className="hu-blood-badge">
                        {unit.bloodType}
                    </span>

                    <span className="hu-component-badge">
                        {unit.component}
                    </span>

                    {value.status && (
                        <span
                            className="hu-status-badge"
                            data-status={value.status}
                        >
                            {value.status}
                        </span>
                    )}
                </div>
            </div>

            <div className="hu-unit-form-grid">
                <label className="hu-field">
                    <span className="hu-field-label">
                        Utilization Status
                        <span className="hu-required">
                            *
                        </span>
                    </span>

                    <select
                        className="hu-form-control"
                        value={value.status || ''}
                        onChange={(event) =>
                            onChange(
                                unit._id,
                                'status',
                                event.target.value
                            )
                        }
                    >
                        <option value="">
                            Select status
                        </option>

                        <option value="Used">
                            Used
                        </option>

                        <option value="Wasted">
                            Wasted
                        </option>

                        <option value="Expired">
                            Expired
                        </option>

                        <option value="Unused">
                            Unused
                        </option>
                    </select>
                </label>

                <label className="hu-field">
                    <span className="hu-field-label">
                        Notes

                        <span className="hu-optional">
                            Optional
                        </span>
                    </span>

                    <textarea
                        className="hu-form-control hu-textarea"
                        rows="2"
                        value={value.description || ''}
                        onChange={(event) =>
                            onChange(
                                unit._id,
                                'description',
                                event.target.value
                            )
                        }
                        placeholder="Add relevant notes..."
                    />
                </label>
            </div>
        </article>
    );
}

function Summary({
    label,
    value,
    red = false,
    green = false
}) {
    let className = 'hu-detail-value';

    if (red) className += ' hu-text-red';
    if (green) className += ' hu-text-green';

    return (
        <div className="hu-detail-card">
            <div className="hu-detail-label">
                {label}
            </div>

            <div className={className}>
                {value ?? '—'}
            </div>
        </div>
    );
}

export default UtilizationReportForm;