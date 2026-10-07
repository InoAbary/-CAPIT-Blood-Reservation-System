import React from 'react';

import {
    UTILIZATION_STATUSES,
    BLOOD_TYPES,
    BLOOD_COMPONENTS
} from './mockUtilizationData';


const SearchIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <circle
            cx="11"
            cy="11"
            r="7"
        />

        <line
            x1="16.5"
            y1="16.5"
            x2="21"
            y2="21"
        />
    </svg>
);


function UtilizationFilters({
    role,

    query,
    setQuery,

    statusFilter,
    setStatusFilter,

    bloodTypeFilter,
    setBloodTypeFilter,

    componentFilter,
    setComponentFilter,

    hospitalFilter,
    setHospitalFilter,

    hospitalOptions = [],

    totalRecords = 0
}) {

    const isBSF = role === 'bsf';


    return (
        <div className="util-toolbar">

            <div className="util-search">

                <SearchIcon />

                <input
                    type="search"
                    placeholder="Search reports..."
                    aria-label="Search utilization reports"
                    value={query}
                    onChange={(event) =>
                        setQuery(
                            event.target.value
                        )
                    }
                />

            </div>


            <div className="util-filter">

                <select
                    aria-label="Filter by disposition"
                    value={statusFilter}
                    onChange={(event) =>
                        setStatusFilter(
                            event.target.value
                        )
                    }
                >
                    <option value="all">
                        All dispositions
                    </option>

                    {UTILIZATION_STATUSES.map(
                        (status) => (
                            <option
                                key={status}
                                value={status}
                            >
                                {status}
                            </option>
                        )
                    )}

                </select>

            </div>


            <div className="util-filter">

                <select
                    aria-label="Filter by component"
                    value={componentFilter}
                    onChange={(event) =>
                        setComponentFilter(
                            event.target.value
                        )
                    }
                >
                    <option value="all">
                        All components
                    </option>

                    {BLOOD_COMPONENTS.map(
                        (component) => (
                            <option
                                key={component}
                                value={component}
                            >
                                {component}
                            </option>
                        )
                    )}

                </select>

            </div>


            <div className="util-filter">

                <select
                    aria-label="Filter by blood type"
                    value={bloodTypeFilter}
                    onChange={(event) =>
                        setBloodTypeFilter(
                            event.target.value
                        )
                    }
                >
                    <option value="all">
                        All blood types
                    </option>

                    {BLOOD_TYPES.map(
                        (bloodType) => (
                            <option
                                key={bloodType}
                                value={bloodType}
                            >
                                {bloodType}
                            </option>
                        )
                    )}

                </select>

            </div>


            {isBSF && (

                <div className="util-filter">

                    <select
                        aria-label="Filter by hospital"
                        value={hospitalFilter}
                        onChange={(event) =>
                            setHospitalFilter(
                                event.target.value
                            )
                        }
                    >
                        <option value="all">
                            All hospitals
                        </option>

                        {hospitalOptions.map(
                            (hospital) => (
                                <option
                                    key={hospital}
                                    value={hospital}
                                >
                                    {hospital}
                                </option>
                            )
                        )}

                    </select>

                </div>

            )}


            <div className="util-record-count">

                {totalRecords}{' '}

                {totalRecords === 1
                    ? 'record'
                    : 'records'}

            </div>

        </div>
    );
}


export default UtilizationFilters;