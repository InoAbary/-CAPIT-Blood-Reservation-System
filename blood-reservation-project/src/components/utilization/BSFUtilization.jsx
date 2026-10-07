import React, {
    useEffect,
    useMemo,
    useState
} from 'react';

import UtilizationFilters
    from './UtilizationFilters';

import UtilizationTable
    from './UtilizationTable';

import UtilizationSummary
    from './UtilizationSummary';

import UtilizationPagination
    from './UtilizationPagination';

import {
    MOCK_CURRENT_BSF,
    MOCK_REPORTS
} from './mockUtilizationData';

import {
    getFacilityName,
    getID
} from './utilizationUtils';


const PAGE_SIZE = 8;


/*
 * TODO:
 * Change this to false once authentication and
 * real utilization data are connected.
 */
const USE_MOCK_DATA = true;


function BSFUtilization() {

    const [reports, setReports] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    const [generating, setGenerating] =
        useState(false);


    /* ---------- Filters ---------- */

    const [query, setQuery] =
        useState('');

    const [
        statusFilter,
        setStatusFilter
    ] = useState('all');

    const [
        bloodTypeFilter,
        setBloodTypeFilter
    ] = useState('all');

    const [
        componentFilter,
        setComponentFilter
    ] = useState('all');

    const [
        hospitalFilter,
        setHospitalFilter
    ] = useState('all');

    const [page, setPage] =
        useState(1);


    /* =====================================================
       LOAD REPORTS
       ===================================================== */

    useEffect(() => {

        const loadReports = async () => {

            setLoading(true);
            setError('');


            if (USE_MOCK_DATA) {

                setReports(MOCK_REPORTS);
                setLoading(false);

                return;
            }


            try {

                /*
                 * TODO:
                 * Once authentication is implemented,
                 * the backend should only return reports
                 * relevant to the logged-in BSF.
                 */
                const response =
                    await fetch(
                        '/api/utilization/reports'
                    );


                const data =
                    await response.json();


                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        'Failed to load utilization reports.'
                    );
                }


                setReports(
                    Array.isArray(data.reports)
                        ? data.reports
                        : []
                );

            } catch (err) {

                setError(
                    err.message ||
                    'Failed to load utilization reports.'
                );

            } finally {

                setLoading(false);
            }
        };


        loadReports();

    }, []);


    /* =====================================================
       REPORTS RELEVANT TO THIS BSF
       ===================================================== */

    const bsfReports =
        useMemo(
            () =>
                reports.filter(
                    (report) =>
                        getID(
                            report.bsfFacilityID
                        ) ===
                        MOCK_CURRENT_BSF._id
                ),
            [reports]
        );


    /* =====================================================
       HOSPITAL FILTER OPTIONS
       ===================================================== */

    const hospitalOptions =
        useMemo(
            () => {

                const hospitals =
                    new Set();


                bsfReports.forEach(
                    (report) => {

                        const name =
                            getFacilityName(
                                report.hospitalFacilityID
                            );


                        if (name !== '—') {
                            hospitals.add(name);
                        }
                    }
                );


                return Array
                    .from(hospitals)
                    .sort();
            },
            [bsfReports]
        );


    /* =====================================================
       FILTER REPORTS
       ===================================================== */

    const filteredReports =
        useMemo(
            () => {

                const search =
                    query
                        .trim()
                        .toLowerCase();


                return bsfReports.filter(
                    (report) => {

                        if (
                            statusFilter !== 'all' &&
                            report.status !==
                                statusFilter
                        ) {
                            return false;
                        }


                        if (
                            bloodTypeFilter !== 'all' &&
                            report.bloodType !==
                                bloodTypeFilter
                        ) {
                            return false;
                        }


                        if (
                            componentFilter !== 'all' &&
                            report.component !==
                                componentFilter
                        ) {
                            return false;
                        }


                        if (
                            hospitalFilter !== 'all' &&
                            getFacilityName(
                                report.hospitalFacilityID
                            ) !== hospitalFilter
                        ) {
                            return false;
                        }


                        if (!search) {
                            return true;
                        }


                        const values = [
                            report._id,
                            report.bloodRequestID,
                            report.bloodUnitID,
                            report.bloodType,
                            report.component,
                            report.status,

                            getFacilityName(
                                report.hospitalFacilityID
                            )
                        ];


                        return values.some(
                            (value) =>
                                String(
                                    value || ''
                                )
                                    .toLowerCase()
                                    .includes(search)
                        );
                    }
                );
            },
            [
                bsfReports,
                query,
                statusFilter,
                bloodTypeFilter,
                componentFilter,
                hospitalFilter
            ]
        );


    /* =====================================================
       RESET PAGE WHEN FILTERS CHANGE
       ===================================================== */

    useEffect(() => {

        setPage(1);

    }, [
        query,
        statusFilter,
        bloodTypeFilter,
        componentFilter,
        hospitalFilter
    ]);


    /* =====================================================
       PAGINATION
       ===================================================== */

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredReports.length /
            PAGE_SIZE
        )
    );


    const safePage = Math.min(
        page,
        totalPages
    );


    const pageReports =
        filteredReports.slice(
            (safePage - 1) *
                PAGE_SIZE,

            safePage *
                PAGE_SIZE
        );


    /* =====================================================
       GENERATE REPORT
       ===================================================== */

    const handleGenerateReport =
        async () => {

            /*
             * TODO:
             * Later pass the current filters and date range
             * to the backend so the generated file matches
             * what the BSF is viewing.
             */

            if (USE_MOCK_DATA) {

                alert(
                    'Report generation will use real database data once mock mode is disabled.'
                );

                return;
            }


            setGenerating(true);


            try {

                const response =
                    await fetch(
                        '/api/utilization/create-utilization-report',
                        {
                            method: 'POST'
                        }
                    );


                if (!response.ok) {
                    throw new Error(
                        'Failed to generate utilization report.'
                    );
                }


                const blob =
                    await response.blob();


                const url =
                    window.URL.createObjectURL(
                        blob
                    );


                const link =
                    document.createElement(
                        'a'
                    );


                link.href = url;

                link.download =
                    'utilization-report.xlsx';


                document.body.appendChild(
                    link
                );

                link.click();

                link.remove();


                window.URL.revokeObjectURL(
                    url
                );

            } catch (err) {

                alert(
                    err.message ||
                    'Failed to generate utilization report.'
                );

            } finally {

                setGenerating(false);
            }
        };


    /* =====================================================
       LOADING / ERROR
       ===================================================== */

    if (loading) {

        return (
            <div className="util-state-message">
                Loading utilization reports...
            </div>
        );
    }


    if (error) {

        return (
            <div className="util-error-message">
                {error}
            </div>
        );
    }


    /* =====================================================
       PAGE
       ===================================================== */

    return (
        <div className="util-view">


            {/* HEADER */}

            <div className="util-header">

                <div>

                    <h1>
                        Blood Utilization Reports
                    </h1>

                    <p>
                        Monitor how blood units
                        released by your facility
                        are used by hospitals.
                    </p>

                </div>


                <button
                    type="button"
                    className="util-btn-primary"
                    onClick={
                        handleGenerateReport
                    }
                    disabled={generating}
                >
                    {generating
                        ? 'Generating...'
                        : 'Generate Report'}
                </button>

            </div>


            {/* BSF INFO */}

            <div className="util-context-card">

                <span>
                    Blood Service Facility
                </span>

                <strong>
                    {
                        MOCK_CURRENT_BSF
                            .facilityName
                    }
                </strong>

            </div>


            {/* SUMMARY */}

            <UtilizationSummary
                reports={
                    filteredReports
                }
            />


            {/* FILTERS */}

            <UtilizationFilters
                role="bsf"

                query={query}
                setQuery={setQuery}

                statusFilter={
                    statusFilter
                }
                setStatusFilter={
                    setStatusFilter
                }

                bloodTypeFilter={
                    bloodTypeFilter
                }
                setBloodTypeFilter={
                    setBloodTypeFilter
                }

                componentFilter={
                    componentFilter
                }
                setComponentFilter={
                    setComponentFilter
                }

                hospitalFilter={
                    hospitalFilter
                }
                setHospitalFilter={
                    setHospitalFilter
                }

                hospitalOptions={
                    hospitalOptions
                }

                totalRecords={
                    filteredReports.length
                }
            />


            {/* TABLE */}

            <UtilizationTable
                reports={pageReports}
                role="bsf"
            />


            {/* PAGINATION */}

            <UtilizationPagination
                page={safePage}
                setPage={setPage}
                totalRecords={
                    filteredReports.length
                }
                pageSize={PAGE_SIZE}
            />


        </div>
    );
}


export default BSFUtilization;