import React, { useEffect, useMemo, useState } from 'react';
import {
    MOCK_INVENTORY_HISTORY
} from './mockInventoryHistory';

const USE_MOCK_DATA = true;

const API_URL =
    (typeof process !== 'undefined' &&
        process.env &&
        process.env.REACT_APP_API_URL) ||
    (typeof import.meta !== 'undefined' &&
        import.meta.env &&
        import.meta.env.VITE_API_URL) ||
    'http://localhost:3000';

    const PAGE_SIZE = 8;

    const ACTIONS = [
        'Created',
        'Updated',
        'Deleted'
    ];
    
    const BLOOD_TYPES = [
        'A+',
        'A-',
        'B+',
        'B-',
        'O+',
        'O-',
        'AB+',
        'AB-'
    ];
    
    const COMPONENTS = [
        'Packed RBC',
        'Plasma',
        'Platelets',
        'Whole Blood'
    ];

function formatDate(date) {
    if (!date) return '—';

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return '—';
    }

    return new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(parsed);
}


function formatValue(value) {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    const parsedDate = new Date(value);

    if (
        typeof value === 'string' &&
        !Number.isNaN(parsedDate.getTime()) &&
        value.includes('T')
    ) {
        return new Intl.DateTimeFormat('en-PH', {
            dateStyle: 'medium'
        }).format(parsedDate);
    }

    return String(value);
}


function fieldLabel(field) {
    const labels = {
        donorID: 'Donor ID',
        bloodType: 'Blood Type',
        component: 'Component',
        collectionDate: 'Collection Date',
        expiryDate: 'Expiry Date',
        status: 'Status'
    };

    return labels[field] || field;
}


function HistoryDetails({ record }) {

    if (record.action === 'Created') {
        return (
            <span>
                Blood unit added to inventory.
            </span>
        );
    }


    if (record.action === 'Deleted') {
        return (
            <span>
                Blood unit deleted.
            </span>
        );
    }


    if (
        record.action === 'Updated' &&
        Array.isArray(record.changes) &&
        record.changes.length > 0
    ) {
        return (
            <div className="inv-history-changes">

                {record.changes.map((change, index) => (
                    <div
                        key={`${change.field}-${index}`}
                        className="inv-history-change"
                    >
                        <strong>
                            {fieldLabel(change.field)}:
                        </strong>{' '}

                        {formatValue(change.oldValue)}

                        <span className="inv-history-arrow">
                            {' '}→{' '}
                        </span>

                        {formatValue(change.newValue)}
                    </div>
                ))}

            </div>
        );
    }


    return <span>—</span>;
}


function InventoryHistory({ facilityID }) {

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [query, setQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [bloodTypeFilter, setBloodTypeFilter] = useState('all');
    const [componentFilter, setComponentFilter] = useState('all');

    const [page, setPage] = useState(1);


    useEffect(() => {

        // TODO: Remove this later. For mock data tetsting only
        if (!facilityID && !USE_MOCK_DATA) {
            setHistory([]);
            setLoading(false);
            return;
        }

        /*
        if (!facilityID) {
            setHistory([]);
            setLoading(false);
            return;
        } */


        const controller = new AbortController();


        const loadHistory = async () => {

            setLoading(true);
            setError('');

            // TODO: Remove later. for mock data testing only
            if (USE_MOCK_DATA) {
                setHistory(MOCK_INVENTORY_HISTORY);
                setLoading(false);
                return;
            }

            try {

                const response = await fetch(
                    `${API_URL}/api/facilities/${facilityID}/blood-unit-history`,
                    {
                        signal: controller.signal
                    }
                );


                const body = await response.json();


                if (!response.ok) {
                    throw new Error(
                        body.message ||
                        'Could not load inventory history.'
                    );
                }


                setHistory(
                    Array.isArray(body)
                        ? body
                        : []
                );

            } catch (err) {

                if (err.name !== 'AbortError') {
                    setError(err.message);
                }

            } finally {

                setLoading(false);
            }
        };


        loadHistory();


        return () => controller.abort();

    }, [facilityID]);


    const filteredHistory = useMemo(() => {

        const search = query.trim().toLowerCase();
    
        return history.filter((record) => {
    
            if (
                actionFilter !== 'all' &&
                record.action !== actionFilter
            ) {
                return false;
            }
    
            if (
                bloodTypeFilter !== 'all' &&
                record.bloodType !== bloodTypeFilter
            ) {
                return false;
            }
    
            if (
                componentFilter !== 'all' &&
                record.component !== componentFilter
            ) {
                return false;
            }
    
            if (
                search &&
                !String(record.bloodUnitID || '')
                    .toLowerCase()
                    .includes(search)
            ) {
                return false;
            }
    
            return true;
        });
    
    }, [
        history,
        query,
        actionFilter,
        bloodTypeFilter,
        componentFilter
    ]);

    const total = filteredHistory.length;

const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
);

const safePage = Math.min(page, totalPages);

const pageRows = filteredHistory.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
);

const rangeStart =
    total === 0
        ? 0
        : (safePage - 1) * PAGE_SIZE + 1;

const rangeEnd = Math.min(
    safePage * PAGE_SIZE,
    total
);

    if (loading) {
        return (
            <p className="inv-history-message">
                Loading history…
            </p>
        );
    }


    if (error) {
        return (
            <p
                className="inv-history-error"
                role="alert"
            >
                {error}
            </p>
        );
    }


    return (
        <div className="inv-history">

<div className="inv-history-toolbar">

<div className="inv-history-search-box">

    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>

    <input
        type="search"
        placeholder="Search blood units..."
        aria-label="Search blood unit history"
        value={query}
        onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
        }}
    />

</div>


<div className="inv-history-select-wrap">
    <select
        aria-label="Filter history by action"
        value={actionFilter}
        onChange={(e) => setActionFilter(e.target.value)}
    >
        <option value="all">All actions</option>

        {ACTIONS.map((action) => (
            <option key={action} value={action}>
                {action}
            </option>
        ))}
    </select>
</div>


<div className="inv-history-select-wrap">
    <select
        aria-label="Filter history by component"
        value={componentFilter}
        onChange={(e) => setComponentFilter(e.target.value)}
    >
        <option value="all">All components</option>

        {COMPONENTS.map((component) => (
            <option key={component} value={component}>
                {component}
            </option>
        ))}
    </select>
</div>


<div className="inv-history-select-wrap">
    <select
        aria-label="Filter history by blood type"
        value={bloodTypeFilter}
        onChange={(e) => setBloodTypeFilter(e.target.value)}
    >
        <option value="all">All blood types</option>

        {BLOOD_TYPES.map((bloodType) => (
            <option key={bloodType} value={bloodType}>
                {bloodType}
            </option>
        ))}
    </select>
</div>

<div className="inv-history-count">
    {filteredHistory.length}{' '}
    {filteredHistory.length === 1
        ? 'record'
        : 'records'}
</div>

</div>


        {filteredHistory.length === 0 ? (

                <div className="inv-history-empty">

                    <strong>
                        No history records yet.
                    </strong>

                </div>

            ) : (

                    <div className="inv-history-table-wrap">

                    <table className="inv-history-table">

                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Blood Unit</th>
                                <th>Action</th>
                                <th>Blood Type</th>
                                <th>Component</th>
                                <th>Details</th>
                                <th>Performed By</th>
                            </tr>
                        </thead>


                        <tbody>

                        {pageRows.map((record) => {

                                // TODO: Use the authenticated user's information once performedBy
                                // is consistently recorded by the backend.

                                const performer =
                                    record.performedBy
                                        ? `${record.performedBy.firstName || ''} ${record.performedBy.lastName || ''}`.trim()
                                        : 'System / Unavailable';

                                return (
                                    <tr key={record._id}>

                                        <td>
                                            {formatDate(record.date)}
                                        </td>


                                        <td>
                                            <span className="inv-history-unit">
                                                {record.bloodUnitID}
                                            </span>
                                        </td>


                                        <td>
                                            <span
                                                className={`inv-history-action inv-history-action-${record.action.toLowerCase()}`}
                                            >
                                                {record.action}
                                            </span>
                                        </td>


                                        <td>
                                            {record.bloodType || '—'}
                                        </td>


                                        <td>
                                            {record.component || '—'}
                                        </td>


                                        <td>
                                            <HistoryDetails
                                                record={record}
                                            />
                                        </td>


                                        <td>
                                            {performer}
                                        </td>

                                    </tr>
                                );
                            })}

                        </tbody>

                    </table>

                </div>
   
            )}

<div className="inv-history-footer">

<span>
    {rangeStart}–{rangeEnd} of {total}
</span>

<div className="inv-history-pager">

    <button
        type="button"
        onClick={() =>
            setPage((current) =>
                Math.max(1, current - 1)
            )
        }
        disabled={safePage <= 1}
        aria-label="Previous page"
    >
        ‹
    </button>

    <button
        type="button"
        onClick={() =>
            setPage((current) =>
                Math.min(totalPages, current + 1)
            )
        }
        disabled={safePage >= totalPages}
        aria-label="Next page"
    >
        ›
    </button>

</div>

</div>

        </div>
    );
}


export default InventoryHistory;