import { useEffect, useMemo, useState } from 'react';

import '../styles/HospitalUtilization.css';

import HospitalRequestList from '../components/utilization/HospitalRequestList';
import PreviousUtilizationReports from '../components/utilization/PreviousUtilizationReports';
import UtilizationReportForm from '../components/utilization/UtilizationReportForm';

async function fetchJson(path, options = {}) {
    const response = await fetch(path, {
        credentials: 'include',
        ...options,
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Request failed.');
    }

    return data;
}

function HospitalUtilization() {
    const [activeTab, setActiveTab] = useState('report');

    const [requests, setRequests] = useState([]);
    const [previousReports, setPreviousReports] = useState([]);

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [releasedUnits, setReleasedUnits] = useState([]);
    const [reportValues, setReportValues] = useState({});

    const [loading, setLoading] = useState(true);
    const [reportsLoading, setReportsLoading] = useState(true);
    const [unitsLoading, setUnitsLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [error, setError] = useState('');
    const [reportsError, setReportsError] = useState('');
    const [unitsError, setUnitsError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [pageMessage, setPageMessage] = useState('');

    const fetchRequests = async () => {
        try {
            setError('');

            const data = await fetchJson(
                '/api/utilization/hospital/requests'
            );

            setRequests(data.requests || []);
        } catch (error) {
            console.error('Failed to load utilization requests:', error);
            setError(error.message || 'Failed to load blood requests.');
        } finally {
            setLoading(false);
        }
    };

    const fetchPreviousReports = async () => {
        try {
            setReportsLoading(true);
            setReportsError('');

            const data = await fetchJson(
                '/api/utilization/hospital/reports'
            );

            setPreviousReports(data.reports || []);
        } catch (error) {
            console.error('Failed to load previous reports:', error);
            setReportsError(
                error.message || 'Failed to load previous reports.'
            );
        } finally {
            setReportsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        fetchPreviousReports();
    }, []);

    const readyRequests = useMemo(
        () =>
            requests.filter(
                (request) =>
                    request.requestStatus === 'Fulfilled' &&
                    !request.utilizationSubmitted
            ),
        [requests]
    );

    const handleReportUtilization = async (request) => {
        if (
            request.requestStatus !== 'Fulfilled' ||
            request.utilizationSubmitted
        ) {
            return;
        }

        setSelectedRequest(request);
        setReleasedUnits([]);
        setReportValues({});
        setUnitsError('');
        setSubmitError('');
        setPageMessage('');

        try {
            setUnitsLoading(true);

            const data = await fetchJson(
                `/api/utilization/hospital/requests/${request._id}/units`
            );

            const units = data.units || [];

            setReleasedUnits(units);

            setReportValues(
                Object.fromEntries(
                    units.map((unit) => [
                        unit._id,
                        {
                            status: '',
                            description: ''
                        }
                    ])
                )
            );
        } catch (error) {
            console.error('Failed to load released units:', error);

            setUnitsError(
                error.message ||
                'Failed to load released blood units.'
            );
        } finally {
            setUnitsLoading(false);
        }
    };

    const updateReportValue = (unitId, field, value) => {
        setReportValues((current) => ({
            ...current,
            [unitId]: {
                ...current[unitId],
                [field]: value
            }
        }));
    };

    const handleCancelReport = () => {
        if (submitting) return;

        setSelectedRequest(null);
        setReleasedUnits([]);
        setReportValues({});
        setUnitsError('');
        setSubmitError('');
    };

    const handleSubmitReports = async () => {
        if (!selectedRequest) return;

        setSubmitError('');
        setPageMessage('');

        if (selectedRequest.utilizationSubmitted) {
            setSubmitError(
                'Utilization has already been submitted for this request.'
            );
            return;
        }

        if (selectedRequest.requestStatus !== 'Fulfilled') {
            setSubmitError(
                'The request must be fulfilled before utilization can be submitted.'
            );
            return;
        }

        if (!releasedUnits.length) {
            setSubmitError(
                'No released blood units were found for this request.'
            );
            return;
        }

        const incomplete = releasedUnits.some(
            (unit) => !reportValues[unit._id]?.status
        );

        if (incomplete) {
            setSubmitError(
                'Please select a utilization status for every blood unit.'
            );
            return;
        }

        const reports = releasedUnits.map((unit) => ({
            bloodUnitID: unit._id,
            status: reportValues[unit._id].status,
            description: reportValues[unit._id].description || ''
        }));

        try {
            setSubmitting(true);

            const data = await fetchJson(
                `/api/utilization/hospital/requests/${selectedRequest._id}/reports`,
                {
                    method: 'POST',
                    body: JSON.stringify({ reports })
                }
            );

            setSelectedRequest(null);
            setReleasedUnits([]);
            setReportValues({});

            setPageMessage(
                data.message ||
                'Utilization report submitted successfully.'
            );

            await Promise.all([
                fetchRequests(),
                fetchPreviousReports()
            ]);

            setActiveTab('history');
        } catch (error) {
            console.error('Failed to submit utilization report:', error);

            setSubmitError(
                error.message ||
                'Failed to submit utilization report.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const readyCount = readyRequests.length;
    const reportCount = previousReports.length;

    if (loading) {
        return (
            <main className="hospital-utilization-page">
                <div className="hu-page-shell">
                    <div className="hu-loading-card">
                        Loading utilization records...
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="hospital-utilization-page">
            <div className="hu-page-shell">

                <header className="hu-page-header">
                    <div className="hu-page-title">
                        Blood Utilization
                    </div>

                    <div className="hu-page-description">
                        Report the disposition of released blood units and
                        review utilization records submitted by your hospital.
                    </div>
                </header>

                <div className="hu-stat-grid">
                    <StatCard
                        label="Ready to Report"
                        value={readyCount}
                        description="Fulfilled requests awaiting a report"
                        accent="red"
                    />

                    <StatCard
                        label="Reports Submitted"
                        value={reportCount}
                        description="Utilization records submitted"
                        accent="dark"
                    />
                </div>

                {error && (
                    <div className="hu-alert hu-alert--error">
                        {error}
                    </div>
                )}

                {pageMessage && (
                    <div className="hu-alert hu-alert--success">
                        {pageMessage}
                    </div>
                )}

                <section className="hu-module-card">
                    <div className="hu-module-header">
                        <div>
                            <div className="hu-module-title">
                                Utilization Management
                            </div>

                            <div className="hu-module-description">
                                Manage hospital blood utilization records.
                            </div>
                        </div>

                        <div className="hu-tabs">
                            <TabButton
                                active={activeTab === 'report'}
                                count={readyCount}
                                onClick={() => setActiveTab('report')}
                            >
                                Report Utilization
                            </TabButton>

                            <TabButton
                                active={activeTab === 'history'}
                                count={reportCount}
                                onClick={() => setActiveTab('history')}
                            >
                                Previous Reports
                            </TabButton>
                        </div>
                    </div>

                    <div className="hu-module-body">
                        {activeTab === 'report' && (
                            <HospitalRequestList
                                requests={readyRequests}
                                onReport={handleReportUtilization}
                            />
                        )}

                        {activeTab === 'history' && (
                            <PreviousUtilizationReports
                                reports={previousReports}
                                loading={reportsLoading}
                                error={reportsError}
                            />
                        )}
                    </div>
                </section>

                <UtilizationReportForm
                    selectedRequest={selectedRequest}
                    releasedUnits={releasedUnits}
                    reportValues={reportValues}
                    unitsLoading={unitsLoading}
                    unitsError={unitsError}
                    submitError={submitError}
                    submitting={submitting}
                    onChange={updateReportValue}
                    onSubmit={handleSubmitReports}
                    onCancel={handleCancelReport}
                />
            </div>
        </main>
    );
}

function StatCard({
    label,
    value,
    description,
    accent
}) {
    return (
        <article className={`hu-stat-card hu-stat-card--${accent}`}>
            <div className="hu-stat-label">
                {label}
            </div>

            <div className="hu-stat-value">
                {value}
            </div>

            <div className="hu-stat-description">
                {description}
            </div>
        </article>
    );
}

function TabButton({
    active,
    count,
    onClick,
    children
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={active ? 'hu-tab is-active' : 'hu-tab'}
        >
            <span>{children}</span>

            <span
                className={
                    active
                        ? 'hu-tab-count is-active'
                        : 'hu-tab-count'
                }
            >
                {count}
            </span>
        </button>
    );
}

export default HospitalUtilization;