import React, {
    useEffect,
    useMemo,
    useState
} from 'react';

import UtilizationFilters
    from './UtilizationFilters';

import UtilizationTable
    from './UtilizationTable';

import UtilizationPagination
    from './UtilizationPagination';

import SubmitUtilizationModal
    from './SubmitUtilizationModal';

import {
    MOCK_CURRENT_HOSPITAL,
    MOCK_CURRENT_USER,
    MOCK_ISSUED_UNITS,
    MOCK_REPORTS
} from './mockUtilizationData';

import {
    getFacilityName,
    getID
} from './utilizationUtils';


const PAGE_SIZE = 8;


/*
 * TODO:
 * Set this to false once the real Blood Request,
 * authentication, and utilization APIs are ready.
 */
const USE_MOCK_DATA = true;


function HospitalUtilization() {

    const [reports, setReports] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState('');

    const [showModal, setShowModal] =
        useState(false);

    const [submitting, setSubmitting] =
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
                 * the backend should determine the hospital
                 * from the logged-in user.
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
       ONLY THIS HOSPITAL'S REPORTS
       ===================================================== */

    const hospitalReports =
        useMemo(
            () =>
                reports.filter(
                    (report) =>
                        getID(
                            report.hospitalFacilityID
                        ) ===
                        MOCK_CURRENT_HOSPITAL._id
                ),
            [reports]
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


                return hospitalReports.filter(
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
                                report.bsfFacilityID
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
                hospitalReports,
                query,
                statusFilter,
                bloodTypeFilter,
                componentFilter
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
        componentFilter
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
       ISSUED UNITS STILL WAITING FOR REPORT
       ===================================================== */

    const availableIssuedUnits =
        useMemo(
            () => {

                const alreadyReported =
                    new Set(
                        hospitalReports.map(
                            (report) =>
                                report.bloodUnitID
                        )
                    );


                return MOCK_ISSUED_UNITS.filter(
                    (unit) =>
                        !alreadyReported.has(
                            unit.bloodUnitID
                        )
                );
            },
            [hospitalReports]
        );


    /* =====================================================
       SUBMIT REPORT
       ===================================================== */

    const handleSubmit =
        async (formData) => {

            setSubmitting(true);


            try {

                if (USE_MOCK_DATA) {

                    const issuedUnit =
                        MOCK_ISSUED_UNITS.find(
                            (unit) =>
                                unit.bloodUnitID ===
                                formData.bloodUnitID
                        );


                    if (!issuedUnit) {
                        throw new Error(
                            'Issued blood unit could not be found.'
                        );
                    }


                    const newReport = {

                        _id:
                            `URMOCK-${Date.now()}`,

                        bloodRequestID:
                            formData.bloodRequestID,

                        bloodUnitID:
                            formData.bloodUnitID,

                        bsfFacilityID:
                            issuedUnit.bsfFacilityID,

                        hospitalFacilityID:
                            MOCK_CURRENT_HOSPITAL,

                        bloodType:
                            formData.bloodType,

                        component:
                            formData.component,

                        status:
                            formData.status,

                        utilizationDate:
                            formData.utilizationDate,

                        description:
                            formData.description,

                        performedBy:
                            MOCK_CURRENT_USER,

                        dateCreated:
                            new Date().toISOString()
                    };


                    setReports(
                        (current) => [
                            newReport,
                            ...current
                        ]
                    );


                    setShowModal(false);

                    return;
                }


                /*
                 * TODO:
                 * hospitalFacilityID should eventually come
                 * from the authenticated hospital account,
                 * not from frontend input.
                 */
                const response =
                    await fetch(
                        '/api/utilization/reports',
                        {
                            method: 'POST',

                            headers: {
                                'Content-Type':
                                    'application/json'
                            },

                            body:
                                JSON.stringify(
                                    formData
                                )
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        'Failed to submit utilization report.'
                    );
                }


                setReports(
                    (current) => [
                        data.report,
                        ...current
                    ]
                );


                setShowModal(false);

            } catch (err) {

                alert(
                    err.message ||
                    'Failed to submit utilization report.'
                );

            } finally {

                setSubmitting(false);
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
                        My Utilization Reports
                    </h1>

                    <p>
                        Report and review the
                        disposition of blood units
                        released to your hospital.
                    </p>

                </div>


                <button
                    type="button"
                    className="util-btn-primary"
                    onClick={() =>
                        setShowModal(true)
                    }
                >
                    + Submit Report
                </button>

            </div>


            {/* HOSPITAL INFO */}

            <div className="util-context-card">

                <span>
                    Hospital
                </span>

                <strong>
                    {
                        MOCK_CURRENT_HOSPITAL
                            .facilityName
                    }
                </strong>

            </div>


            {/* FILTERS */}

            <UtilizationFilters
                role="hospital"

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

                totalRecords={
                    filteredReports.length
                }
            />


            {/* TABLE */}

            <UtilizationTable
                reports={pageReports}
                role="hospital"
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


            {/* SUBMIT MODAL */}

            {showModal && (

                <SubmitUtilizationModal
                    issuedUnits={
                        availableIssuedUnits
                    }

                    onClose={() =>
                        setShowModal(false)
                    }

                    onSubmit={
                        handleSubmit
                    }

                    submitting={
                        submitting
                    }
                />

            )}

        </div>
    );
}


export default HospitalUtilization;