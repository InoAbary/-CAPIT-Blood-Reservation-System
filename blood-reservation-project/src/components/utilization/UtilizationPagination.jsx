import React from 'react';


const ChevronLeftIcon = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <polyline points="15 5 8 12 15 19" />
    </svg>
);


const ChevronRightIcon = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <polyline points="9 5 16 12 9 19" />
    </svg>
);


function UtilizationPagination({
    page,
    setPage,
    totalRecords,
    pageSize = 8
}) {

    const totalPages = Math.max(
        1,
        Math.ceil(
            totalRecords / pageSize
        )
    );


    const safePage = Math.min(
        page,
        totalPages
    );


    const rangeStart =
        totalRecords === 0
            ? 0
            : (
                (safePage - 1) *
                pageSize
            ) + 1;


    const rangeEnd = Math.min(
        safePage * pageSize,
        totalRecords
    );


    return (
        <div className="util-pagination">

            <span className="util-pagination-count">
                {rangeStart}–{rangeEnd} of{' '}
                {totalRecords}
            </span>


            <div className="util-pagination-buttons">

                <button
                    type="button"
                    aria-label="Previous page"
                    disabled={
                        safePage <= 1
                    }
                    onClick={() =>
                        setPage(
                            Math.max(
                                1,
                                safePage - 1
                            )
                        )
                    }
                >
                    <ChevronLeftIcon />
                </button>


                <button
                    type="button"
                    aria-label="Next page"
                    disabled={
                        safePage >= totalPages
                    }
                    onClick={() =>
                        setPage(
                            Math.min(
                                totalPages,
                                safePage + 1
                            )
                        )
                    }
                >
                    <ChevronRightIcon />
                </button>

            </div>

        </div>
    );
}


export default UtilizationPagination;