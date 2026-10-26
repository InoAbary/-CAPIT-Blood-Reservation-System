import { useEffect, useMemo, useState } from 'react';

import '../styles/BSFUtilization.css';

import BSFUtilizationFilters from '../components/utilization/BSFUtilizationFilters';
import BSFUtilizationTable from '../components/utilization/BSFUtilizationTable';
import BSFReportDetailsModal from '../components/utilization/BSFReportDetailsModal';
import BSFGenerateReportModal from '../components/utilization/BSFGenerateReportModal';

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

function normalizeReport(report) {
    const unit =
        report.bloodUnitID &&
        typeof report.bloodUnitID === 'object'
            ? report.bloodUnitID
            : {};

    const request =
        unit.requestID &&
        typeof unit.requestID === 'object'
            ? unit.requestID
            : {};

    const facility =
        request.hospitalFacilityID &&
        typeof request.hospitalFacilityID === 'object'
            ? request.hospitalFacilityID
            : {};

    const reporter =
        report.reportedBy &&
        typeof report.reportedBy === 'object'
            ? report.reportedBy
            : {};

    const reporterName = [
        reporter.firstName,
        reporter.lastName
    ]
        .filter(Boolean)
        .join(' ');

    return {
        id: report._id || report.reportID,
        reportID: report.reportID || '—',
        bloodUnitID: unit.bloodUnitID || '—',
        requestID:
            request.requestID ||
            request._id ||
            '—',
        hospital:
            facility.facilityName ||
            facility.name ||
            request.hospital ||
            '—',
        bloodType: unit.bloodType || '—',
        component: unit.component || '—',
        status: report.status || '—',
        reportSource:
            report.reportSource ||
            (report.isAssumed ? 'System' : 'Hospital'),
        sourceDisplay:
            report.isAssumed
                ? 'System — Assumed'
                : report.reportSource || 'Hospital',
        isAssumed: Boolean(report.isAssumed),
        dateCreated: report.dateCreated || null,
        description: report.description || '',
        reportedBy:
            reporterName ||
            (
                report.reportSource === 'System'
                    ? 'System'
                    : 'Hospital'
            ),
        raw: report
    };
}

function BSFUtilization() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [hospitalFilter, setHospitalFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [bloodTypeFilter, setBloodTypeFilter] = useState('All');
    const [componentFilter, setComponentFilter] = useState('All');
    const [sourceFilter, setSourceFilter] = useState('All');

    const [selectedReport, setSelectedReport] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [downloadingReport, setDownloadingReport] = useState(false);

    const fetchReports = async () => {
        try {
            setLoading(true);
            setError('');

            const data = await fetchJson(
                '/api/utilization/bsf/reports'
            );

            setReports(
                Array.isArray(data)
                    ? data
                    : data.reports || []
            );
        } catch (error) {
            console.error('Failed to load utilization reports:', error);

            setError(
                error.message ||
                'Failed to load utilization reports.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const normalizedReports = useMemo(
        () => reports.map(normalizeReport),
        [reports]
    );

    const getUnique = (values) =>
        [...new Set(
            values.filter(
                (value) =>
                    value &&
                    value !== '—'
            )
        )].sort();

    const hospitals = useMemo(
        () => getUnique(
            normalizedReports.map((report) => report.hospital)
        ),
        [normalizedReports]
    );

    const bloodTypes = useMemo(
        () => getUnique(
            normalizedReports.map((report) => report.bloodType)
        ),
        [normalizedReports]
    );

    const components = useMemo(
        () => getUnique(
            normalizedReports.map((report) => report.component)
        ),
        [normalizedReports]
    );

    const filteredReports = useMemo(() => {
        const query = search.trim().toLowerCase();

        return normalizedReports.filter((report) => {
            const matchesSearch =
                !query ||
                [
                    report.reportID,
                    report.bloodUnitID,
                    report.requestID,
                    report.hospital,
                    report.bloodType,
                    report.component,
                    report.status,
                    report.sourceDisplay
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(query);

            return (
                matchesSearch &&
                (
                    hospitalFilter === 'All' ||
                    report.hospital === hospitalFilter
                ) &&
                (
                    statusFilter === 'All' ||
                    report.status === statusFilter
                ) &&
                (
                    bloodTypeFilter === 'All' ||
                    report.bloodType === bloodTypeFilter
                ) &&
                (
                    componentFilter === 'All' ||
                    report.component === componentFilter
                ) &&
                (
                    sourceFilter === 'All' ||
                    report.reportSource === sourceFilter
                )
            );
        });
    }, [
        normalizedReports,
        search,
        hospitalFilter,
        statusFilter,
        bloodTypeFilter,
        componentFilter,
        sourceFilter
    ]);

    const hasFilters =
        Boolean(search) ||
        hospitalFilter !== 'All' ||
        statusFilter !== 'All' ||
        bloodTypeFilter !== 'All' ||
        componentFilter !== 'All' ||
        sourceFilter !== 'All';

    const clearFilters = () => {
        setSearch('');
        setHospitalFilter('All');
        setStatusFilter('All');
        setBloodTypeFilter('All');
        setComponentFilter('All');
        setSourceFilter('All');
    };

    const handleGenerateReport = () => {
        setShowReportModal(true);
    };

    const handleDownloadReport = async (format) => {
        if (format !== 'excel') {
            alert(
                `${
                    format === 'pdf'
                        ? 'PDF'
                        : 'CSV'
                } export is not yet available.`
            );
            return;
        }

        try {
            setDownloadingReport(true);

            const response = await fetch(
                '/api/inventories/create-utilization-report',
                {
                    method: 'POST',
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                let message =
                    'Failed to generate utilization report.';

                try {
                    const data = await response.json();
                    message = data.message || message;
                } catch {
                    // Keep default message.
                }

                throw new Error(message);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = 'utilization-report.xlsx';

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);

            setShowReportModal(false);
        } catch (error) {
            console.error(
                'Failed to generate utilization report:',
                error
            );

            alert(
                error.message ||
                'Failed to generate utilization report.'
            );
        } finally {
            setDownloadingReport(false);
        }
    };

    const totalCount = normalizedReports.length;

    const usedCount = normalizedReports.filter(
        (report) => report.status === 'Used'
    ).length;

    const wastedCount = normalizedReports.filter(
        (report) => report.status === 'Wasted'
    ).length;

    const expiredCount = normalizedReports.filter(
        (report) => report.status === 'Expired'
    ).length;

    if (loading) {
        return (
            <main className="bsf-utilization-page">
                <div className="bu-page-shell">
                    <div className="bu-loading-card">
                        Loading utilization reports...
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="bsf-utilization-page">
            <div className="bu-page-shell">
                <header className="bu-page-header">
                    <div>
            
                        <div className="bu-page-title">
                            Blood Utilization Reports
                        </div>

                        <div className="bu-page-description">
                            Monitor how released blood units are utilized
                            by hospitals and review submitted or
                            system-generated utilization records.
                        </div>
                    </div>

                    <button
                        type="button"
                        className="bu-button bu-button--primary"
                        onClick={handleGenerateReport}
                    >
                        Generate Reports
                    </button>
                </header>

                <div className="bu-stat-grid">
                    <StatCard
                        label="Total Reports"
                        value={totalCount}
                        accent="dark"
                    />

                    <StatCard
                        label="Used"
                        value={usedCount}
                        accent="green"
                    />

                    <StatCard
                        label="Wasted"
                        value={wastedCount}
                        accent="red"
                    />

                    <StatCard
                        label="Expired"
                        value={expiredCount}
                        accent="amber"
                    />
                </div>

                {error && (
                    <div className="bu-alert bu-alert--error">
                        {error}
                    </div>
                )}

                <section className="bu-module-card">
                    <div className="bu-module-header">
                        <div>
                            <div className="bu-module-title">
                                Utilization Monitoring
                            </div>

                            <div className="bu-module-description">
                                Review blood utilization records reported by hospitals.
                            </div>
                        </div>

                        <div className="bu-record-count">
                            {filteredReports.length}{' '}
                            {filteredReports.length === 1
                                ? 'record'
                                : 'records'}
                        </div>
                    </div>

                    <BSFUtilizationFilters
                        search={search}
                        onSearchChange={setSearch}
                        hospitalFilter={hospitalFilter}
                        onHospitalChange={setHospitalFilter}
                        statusFilter={statusFilter}
                        onStatusChange={setStatusFilter}
                        bloodTypeFilter={bloodTypeFilter}
                        onBloodTypeChange={setBloodTypeFilter}
                        componentFilter={componentFilter}
                        onComponentChange={setComponentFilter}
                        sourceFilter={sourceFilter}
                        onSourceChange={setSourceFilter}
                        hospitals={hospitals}
                        bloodTypes={bloodTypes}
                        components={components}
                        hasFilters={hasFilters}
                        onClear={clearFilters}
                    />

                    <div className="bu-module-body">
                        <BSFUtilizationTable
                            reports={filteredReports}
                            hasFilters={hasFilters}
                            onView={setSelectedReport}
                        />
                    </div>
                </section>

                {selectedReport && (
                    <BSFReportDetailsModal
                        report={selectedReport}
                        onClose={() => setSelectedReport(null)}
                    />
                )}

                {showReportModal && (
                    <BSFGenerateReportModal
                        downloading={downloadingReport}
                        onDownload={handleDownloadReport}
                        onClose={() => {
                            if (!downloadingReport) {
                                setShowReportModal(false);
                            }
                        }}
                    />
                )}
            </div>
        </main>
    );
}

function StatCard({
    label,
    value,
    accent
}) {
    return (
        <article className={`bu-stat-card bu-stat-card--${accent}`}>
            <div className="bu-stat-label">
                {label}
            </div>

            <div className="bu-stat-value">
                {value}
            </div>
        </article>
    );
}

export default BSFUtilization;