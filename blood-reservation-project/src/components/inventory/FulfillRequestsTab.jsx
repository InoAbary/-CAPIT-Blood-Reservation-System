import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../utils/api';
import { EyeIcon } from '@heroicons/react/24/outline';

const ENDPOINT = '/api/inventory-fulfillment';
const formatDate = value => value
    ? new Date(value).toLocaleDateString('en-PH', {
        dateStyle: 'medium',
        timeZone: 'Asia/Manila',
    })
    : '—';

const formatTime = value => value
    ? new Date(value).toLocaleTimeString('en-PH', {
        timeStyle: 'short',
        timeZone: 'Asia/Manila',
    })
    : '—';

    function Icon({ name, ...props }) {
    const paths = {
        drop: 'M12 3s-6 6.3-6 10a6 6 0 0 0 12 0c0-3.7-6-10-6-10Z',
        refresh: 'M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.5-2L20 8M4 16l2.4 3A7 7 0 0 0 18 17',
        arrow: 'M5 12h14m-5-5 5 5-5 5',
        check: 'm5 12 4 4L19 6',
        clock: 'M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
        info: 'M12 11v6m0-10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
        close: 'm6 6 12 12M6 18 18 6',
        list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
    };
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.info} /></svg>;
}

const RELEASE_STATUSES = ['Allocated', 'Approved', 'Partially Fulfilled'];
const QUEUE_STATUSES = ['Allocated', 'Partially Fulfilled', 'Fulfilled'];

const requiresBagCodes = row =>
    row.requestStatus === 'Allocated' ||
    row.usesStockAllocation === true;

const statusTone = status => ({ Allocated: 'ready', Approved: 'ready', 'Partially Fulfilled': 'partial', Pending: 'pending', Fulfilled: 'done' }[status] || 'neutral');
function StatusBadge({ status }) {
    return <span className={`fr-status fr-status--${statusTone(status)}`}><span className="fr-status-dot" />{status}</span>;
}

function BagPicker({ requestID, quantity, selectedCodes, onChange }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        const timer = setTimeout(async () => {
            try {
                const search = encodeURIComponent(query.trim());
                const response = await apiFetch(
                    `${ENDPOINT}/${requestID}/eligible-units?q=${search}`,
                    { signal: controller.signal }
                );
                const body = await response.json();

                if (!response.ok || !Array.isArray(body.units)) {
                    throw new Error(body.message || 'Could not load eligible bags.');
                }

                if (!controller.signal.aborted) setResults(body.units);
            } catch (err) {
                if (!controller.signal.aborted) setError(err.message);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 200);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [requestID, query]);

    return (
        <div>
            <label className="fr-bag-search">
                Search blood bag IDs
                <input
                    type="search"
                    value={query}
                    maxLength={64}
                    placeholder="Enter part of a blood bag ID"
                    onChange={event => {
                        setQuery(event.target.value);
                        setResults([]);
                        setError('');
                        setLoading(true);
                    }}
                />
            </label>

            <p className="fr-bag-count" aria-live="polite">{selectedCodes.length} of {quantity} bags selected</p>

            {selectedCodes.length > 0 && (
            <ul className="fr-selected-bags" aria-label="Selected blood bags">
                    {selectedCodes.map(code => (
                        <li key={code}>
                            {code}{' '}
                            <button
                                type="button"
                                aria-label={`Remove ${code}`}
                                onClick={() => onChange(selectedCodes.filter(value => value !== code))}
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {loading && <p role="status">Searching eligible bags…</p>}
            {error && <p role="alert">{error}</p>}
            {!loading && !error && results.length === 0 && <p>No eligible bags found.</p>}

            {results.length > 0 && (
    <div className="fr-bag-results">
        <div className="fr-bag-row fr-bag-heading" aria-hidden="true">
            <span />
            <span>Blood unit ID</span>
            <span>Expiration date</span>
        </div>
        <ul aria-label="Matching blood bags">
            {results.map(({ bloodUnitID, storageLocation, expiryDate }) => {
                const checked = selectedCodes.includes(bloodUnitID);
                const expires = expiryDate ? new Date(expiryDate) : null;

                return (
                    <li key={bloodUnitID}>
                        <label className="fr-bag-row">
                            <input
                                type="checkbox"
                                checked={checked}
                                disabled={!checked && selectedCodes.length >= quantity}
                                onChange={event => onChange(event.target.checked
                                    ? [...selectedCodes, bloodUnitID]
                                    : selectedCodes.filter(code => code !== bloodUnitID)
                                )}
                            />
                            <span>
                                <strong>{bloodUnitID}</strong>
                                {storageLocation && <small>{storageLocation}</small>}
                            </span>
                            <span className="fr-bag-expiry">
                                {expires && !Number.isNaN(expires.getTime())
                                    ? expires.toLocaleDateString('en-PH', {
                                        dateStyle: 'medium',
                                        timeZone: 'UTC',
                                    })
                                    : '—'}
                            </span>
                        </label>
                    </li>
                );
            })}
        </ul>
    </div>
)}

            {results.length === 20 && <p>Showing up to 20 bags. Refine your search to find a specific blood bag ID.</p>}
        </div>
    );
}

export default function FulfillRequestsTab({ facilityID, onFulfilled }) {
    const [detailID, setDetailID] = useState(null);
    const detailDialogRef = useRef(null);
    const [confirmation, setConfirmation] = useState(null);
    const dialogRef = useRef(null);
    const [requests, setRequests] = useState([]);
    const detailRow = requests.find(row => row._id === detailID);
    const releasedBloodBagIDs = detailRow?.releasedBloodBagIDs ?? [];
    const [loading, setLoading] = useState(true);
    const [busyID, setBusyID] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [needsRefresh, setNeedsRefresh] = useState(true);
    const [statusFilter, setStatusFilter] = useState('open');
    const inFlight = useRef(false);

    const loadRequests = useCallback(async signal => {
        setLoading(true);
        try {
            const response = await apiFetch(ENDPOINT, { signal });
            const body = await response.json().catch(() => { throw new Error('The server returned an unreadable response. Refresh to check request progress.'); });
            if (!response.ok) throw new Error(body.message || 'Could not load fulfillment requests.');
            if (!Array.isArray(body.requests)) throw new Error('Invalid request list.');
            if (signal?.aborted) return false;
            setRequests(body.requests.filter(row => !facilityID || String(row.receivingFacilityID?._id || row.receivingFacilityID) === String(facilityID))); setNeedsRefresh(false);
            return true;
        } catch (err) {
            if (err.name !== 'AbortError') { setError(err.message); setNeedsRefresh(true); }
            return false;
        } finally { if (!signal?.aborted) setLoading(false); }
    }, [facilityID]);
    useEffect(() => {
        const controller = new AbortController();
        loadRequests(controller.signal);
        return () => controller.abort();
    }, [loadRequests]);

    useEffect(() => {
        if (confirmation && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
    }, [confirmation]);

        function prepareRelease(row) {
            const maximum = Math.min(row.remainingUnits, row.availableUnits);
        
            if (!RELEASE_STATUSES.includes(row.requestStatus) || maximum < 1 ||
                row.fulfillmentPending || inFlight.current || needsRefresh) return;
        
            setError('');
            setConfirmation({ row, units: maximum, bloodUnitIDs: [] });
        }

        async function fulfill(row, units, bloodUnitIDs) {
            if (inFlight.current || needsRefresh) return;
            const maximum = Math.min(row.remainingUnits, row.availableUnits);
            if (!RELEASE_STATUSES.includes(row.requestStatus) || !Number.isSafeInteger(units) || units < 1 || units > maximum) return;
            dialogRef.current?.close(); setConfirmation(null);
            inFlight.current = true; setBusyID(row._id); setError(''); setMessage('');
            try {
                const response = await apiFetch(`${ENDPOINT}/${row._id}/fulfill`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        units,
                        expectedFulfilledUnits: row.fulfilledUnits,
                        ...(requiresBagCodes(row) ? { bloodUnitIDs } : {}),
                    }),
                });
                const body = await response.json().catch(() => { throw new Error('The server returned an unreadable response. Refresh to check request progress.'); });
                if (!response.ok) throw new Error(body.message || 'Could not confirm fulfillment.');
                setMessage(`Released ${body.releasedCount} unit${body.releasedCount === 1 ? '' : 's'}: ${body.releasedUnits.map(unit => unit.bloodUnitID).join(', ')}. Request ${body.request.requestStatus.toLowerCase()}.`);
                setRequests(previous => previous.map(item => item._id === row._id ? {
                    ...item, ...body.request, remainingUnits: body.request.units - body.request.fulfilledUnits,
                    availableUnits: body.availableAfter
                } : item));
                try { await onFulfilled?.(); } catch { setError('Release succeeded, but the inventory summary could not refresh. Refresh the inventory page.'); }
            } catch (err) {
                setError(err.message || 'Could not confirm fulfillment. Refresh before trying again.');
            } finally {
                // Never automatically retry a release. Read back server progress even after
                // a lost response; expectedFulfilledUnits rejects stale resubmissions.
                setNeedsRefresh(true);
                await loadRequests();
                setBusyID(null); inFlight.current = false;
            }
        }

        useEffect(() => {
            const dialog = detailDialogRef.current;
            if (!dialog) return;
            if (detailRow && !dialog.open) dialog.showModal();
            if (!detailRow && dialog.open) dialog.close();
        }, [detailRow]);
        
        const releaseMaximum = confirmation
            ? Math.min(confirmation.row.remainingUnits, confirmation.row.availableUnits)
            : 0;
        const releaseUnits = Number(confirmation?.units);
        const validReleaseUnits = Number.isSafeInteger(releaseUnits) &&
            releaseUnits >= 1 && releaseUnits <= releaseMaximum;
            
        const visible = requests.filter(({ requestStatus }) => {
            if (statusFilter === 'all') return true;
            if (statusFilter === 'open') return requestStatus !== 'Fulfilled';
            return requestStatus === statusFilter;
        });
        const readyCount = requests.filter(row => RELEASE_STATUSES.includes(row.requestStatus) && Math.min(row.remainingUnits, row.availableUnits) > 0).length;
        const partialCount = requests.filter(row => row.requestStatus === 'Partially Fulfilled').length;
        const outstanding = requests.reduce((total, row) => total + (row.requestStatus === 'Fulfilled' ? 0 : Math.max(0, Number(row.remainingUnits) || 0)), 0);
        return (
        <section className="fr" aria-label="Release blood units to requests" aria-busy={loading}>
        <style>{STYLES}</style>
        <header className="fr-header">
        <div className="fr-title-group">
        <span className="fr-title-icon"><Icon name="drop" /></span>
        <div><span className="fr-eyebrow">BLOOD INVENTORY</span><h2>Request fulfillment</h2><p>Manage requests. Release units. Track every handover.</p></div>
        </div>
        <button type="button" className="fr-button fr-button--secondary" disabled={loading || busyID !== null} onClick={() => { setError(''); loadRequests(); }}>
        <Icon name="refresh" className={loading ? 'fr-spin' : ''} />{loading ? 'Refreshing…' : 'Refresh requests'}
        </button>
        </header>

        <div className="fr-stats">
        <div className="fr-stat"><div><span className="fr-stat-label">Ready to release</span><strong>{loading || needsRefresh ? '—' : readyCount}</strong><small>Requests with eligible stock</small></div><span className="fr-stat-icon fr-stat-icon--green"><Icon name="check" /></span></div>
        <div className="fr-stat"><div><span className="fr-stat-label">Partially fulfilled</span><strong>{loading || needsRefresh ? '—' : partialCount}</strong><small>Requests with units still to release</small></div><span className="fr-stat-icon fr-stat-icon--amber"><Icon name="clock" /></span></div>
        <div className="fr-stat"><div><span className="fr-stat-label">Units outstanding</span><strong>{loading || needsRefresh ? '—' : outstanding}</strong><small>Units remaining across open requests</small></div><span className="fr-stat-icon fr-stat-icon--red"><Icon name="drop" /></span></div>
        </div>

        {message && <div role="status" className="fr-alert fr-alert--success"><Icon name="check" /><span>{message}</span></div>}
        {error && <div role="alert" className="fr-alert fr-alert--error"><Icon name="info" /><span>{error}</span></div>}
        {!loading && needsRefresh && <div className="fr-alert fr-alert--warning"><Icon name="info" /><span>Refresh successfully before releasing any units.</span></div>}

        <div className="fr-queue">
        <div className="fr-toolbar">
        <div className="fr-queue-heading"><h3>Request queue <span className="fr-count">{visible.length}</span></h3><p>Patient requests assigned to this facility</p></div>
        <label className="fr-status-filter">
            <span>Request status</span>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                <option value="open">Open requests</option>
                <option value="all">All requests</option>
                {QUEUE_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
            </select>
        </label>
        </div>
        {loading && <div className="fr-loading" role="status"><Icon name="refresh" className="fr-spin" />Updating requests and eligible stock…</div>}
        {!loading && !needsRefresh && visible.length === 0 && (
            <div className="fr-empty">
                <span><Icon name="list" /></span>
                <h3>{requests.length === 0 ? 'Your queue is clear' : 'No requests match this filter'}</h3>
            </div>
        )}
        
        {visible.length > 0 && (
    <div className="fr-table-wrap">
        <table className="fr-table">
            <thead>
                <tr>
                    {['Patient name', 'Submitted date', 'Submitted time', 'Blood type', 'Component', 'Status', 'Action'].map(label => (
                        <th key={label} scope="col">{label}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {visible.map(row => {
                    const name = [row.firstName, row.middleName, row.lastName]
                        .filter(Boolean).join(' ') || 'Unnamed patient';

                    return (
                        <tr key={row._id}>
                            <td data-label="Patient name"><strong>{name}</strong></td>
                            <td data-label="Submitted date">{formatDate(row.createdAt)}</td>
                            <td data-label="Submitted time">{formatTime(row.createdAt)}</td>
                            <td data-label="Blood type">
                                <span className="fr-blood-type">{row.bloodType}</span>
                            </td>
                            <td data-label="Component">{row.component}</td>
                            <td data-label="Status"><StatusBadge status={row.requestStatus} /></td>
                            <td data-label="Action">
                                <div className="fr-row-actions">
                                    <button
                                        type="button"
                                        className="fr-view-details"
                                        aria-label={`View details for ${name}, ${row.component}`}
                                        title="View details"
                                        onClick={() => setDetailID(row._id)}
                                    >
                                        <EyeIcon aria-hidden="true" />
                                    </button>
                                    {RELEASE_STATUSES.includes(row.requestStatus) && row.remainingUnits > 0 && (
                                        <button
                                            type="button"
                                            className="fr-button fr-button--primary"
                                            disabled={loading || needsRefresh || busyID !== null ||
                                                row.availableUnits < 1 || row.fulfillmentPending}
                                            onClick={() => prepareRelease(row)}
                                        >
                                            Release
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
)}
            </div>

            <dialog
                className="fr-dialog fr-request-dialog"
                ref={detailDialogRef}
                aria-labelledby="fr-request-details-title"
                onClose={() => setDetailID(null)}
            >
                {detailRow && (
                    <>
                        <div className="fr-dialog-body">
                            <div className="fr-dialog-header">
                                <h2 id="fr-request-details-title">Request details</h2>
                                <StatusBadge status={detailRow.requestStatus} />
                            </div>

                            <section className="fr-request-section" aria-labelledby="fr-patient-request-heading">
                                <h3 id="fr-patient-request-heading">Patient and request</h3>
                                <dl className="fr-details">
                                    <div>
                                        <dt>Patient name</dt>
                                        <dd>
                                            {[detailRow.firstName, detailRow.middleName, detailRow.lastName]
                                                .filter(Boolean).join(' ') || 'Unnamed patient'}
                                        </dd>
                                    </div>
                                    <div><dt>Hospital</dt><dd>{detailRow.hospital || '—'}</dd></div>
                                    <div><dt>Blood type</dt><dd>{detailRow.bloodType}</dd></div>
                                    <div><dt>Component</dt><dd>{detailRow.component}</dd></div>
                                    <div><dt>Request ID</dt><dd>{detailRow.requestID || '—'}</dd></div>
                                </dl>
                            </section>

                            <section className="fr-request-section" aria-labelledby="fr-fulfillment-heading">
                                <h3 id="fr-fulfillment-heading">Fulfillment</h3>
                                <dl className="fr-details">
                                    <div>
                                        <dt>Method</dt>
                                        <dd>{detailRow.confirmedFulfillmentMethod || detailRow.fulfillmentMethod || '—'}</dd>
                                    </div>
                                    <div><dt>Progress</dt><dd>{detailRow.fulfillmentStatus || '—'}</dd></div>
                                    <div><dt>Eligible stock</dt><dd>{detailRow.availableUnits}</dd></div>
                                </dl>
                            </section>

                            <section className="fr-detail-progress" aria-labelledby="fr-release-progress-heading">
                                <h3 id="fr-release-progress-heading">Release progress</h3>
                                <progress
                                    value={detailRow.fulfilledUnits}
                                    max={Math.max(1, detailRow.units)}
                                    aria-labelledby="fr-release-progress-heading"
                                />
                                <dl className="fr-progress-counts">
                                    <div><dt>Requested</dt><dd>{detailRow.units}</dd></div>
                                    <div><dt>Released</dt><dd>{detailRow.fulfilledUnits}</dd></div>
                                    <div><dt>Remaining</dt><dd>{detailRow.remainingUnits}</dd></div>
                                </dl>
                            </section>

                            <section className="fr-request-section fr-released-bags" aria-labelledby="fr-released-bags-heading">
                                <h3 id="fr-released-bags-heading">Assigned blood bags</h3>
                                {releasedBloodBagIDs.length > 0 && (
                                    <ul className="fr-selected-bags">
                                        {releasedBloodBagIDs.map(id => <li key={id}>{id}</li>)}
                                    </ul>
                                )}
                                {releasedBloodBagIDs.length < detailRow.fulfilledUnits && (
                                    <p>Some blood bag IDs are unavailable. Refresh requests to check again.</p>
                                )}
                                {releasedBloodBagIDs.length === 0 && detailRow.fulfilledUnits === 0 && (
                                    <p>No blood bags assigned yet.</p>
                                )}
                            </section>
                        </div>

                        <div className="fr-dialog-actions">
                            <button
                                type="button"
                                className="fr-button fr-button--secondary"
                                onClick={() => detailDialogRef.current?.close()}
                            >
                                Close
                            </button>
                        </div>
                    </>
                )}
            </dialog>

            <dialog
                className="fr-dialog fr-confirm-dialog"
                ref={dialogRef}
                aria-labelledby="release-confirm-title"
                onCancel={() => setConfirmation(null)}
                onClose={() => setConfirmation(null)}
            >
                {confirmation && (
                    <>
                        <div className="fr-dialog-body">
                            <div className="fr-dialog-header">
                                <h2 id="release-confirm-title">Confirm release</h2>
                                <button
                                    type="button"
                                    className="fr-icon-button"
                                    aria-label="Close confirmation"
                                    onClick={() => dialogRef.current?.close()}
                                >
                                    <Icon name="close" />
                                </button>
                            </div>

                            <p className="fr-release-summary">
                                <span className="fr-blood-type">{confirmation.row.bloodType}</span>
                                <span>
                                    {validReleaseUnits && (
                                        <><span>{releaseUnits} {releaseUnits === 1 ? 'unit' : 'units'}</span>{' of '}</>
                                    )}
                                    <span>{confirmation.row.component}</span>
                                </span>
                            </p>

                            <dl className="fr-details">
                                <div>
                                    <dt>Patient name</dt>
                                    <dd>
                                        {[confirmation.row.firstName, confirmation.row.middleName, confirmation.row.lastName]
                                            .filter(Boolean).join(' ') || 'Unnamed patient'}
                                    </dd>
                                </div>
                                <div><dt>Hospital</dt><dd>{confirmation.row.hospital || '—'}</dd></div>
                                <div>
                                    <dt>Remaining after release</dt>
                                    <dd>{validReleaseUnits ? confirmation.row.remainingUnits - releaseUnits : '—'}</dd>
                                </div>
                            </dl>

                            <div className="fr-confirm-quantity-row">
                                <label className="fr-confirm-quantity">
                                    Units to release
                                    <input
                                        type="number"
                                        min={1}
                                        max={releaseMaximum}
                                        step={1}
                                        value={confirmation.units}
                                        aria-invalid={!validReleaseUnits}
                                        aria-describedby="fr-release-limit"
                                        onChange={event => {
                                            const units = event.target.value;
                                            setConfirmation(previous => previous
                                                ? { ...previous, units, bloodUnitIDs: [] }
                                                : null);
                                        }}
                                    />
                                </label>
                                <small id="fr-release-limit">Max {releaseMaximum}</small>
                            </div>

                            {requiresBagCodes(confirmation.row) ? (
                                validReleaseUnits && <BagPicker
                                    key={confirmation.row._id}
                                    requestID={confirmation.row._id}
                                    quantity={releaseUnits}
                                    selectedCodes={confirmation.bloodUnitIDs}
                                    onChange={bloodUnitIDs => {
                                        setConfirmation(previous => previous ? { ...previous, bloodUnitIDs } : null);
                                    }}
                                />
                            ) : (
                                <div className="fr-dialog-info">
                                    <Icon name="info" />
                                    <p>The oldest eligible units will be assigned to this request and marked <strong>Released</strong>.</p>
                                </div>
                            )}
                        </div>

                        <div className="fr-dialog-actions">
                            <button
                                type="button"
                                className="fr-button fr-button--secondary"
                                onClick={() => dialogRef.current?.close()}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="fr-button fr-button--primary"
                                disabled={busyID !== null || loading || needsRefresh || !validReleaseUnits ||
                                    (requiresBagCodes(confirmation.row) && confirmation.bloodUnitIDs.length !== releaseUnits)}
                                onClick={() => fulfill(confirmation.row, releaseUnits, confirmation.bloodUnitIDs)}
                            >
                                Confirm release<Icon name="arrow" />
                            </button>
                        </div>
                    </>
                )}
            </dialog>
        </section>
    );
}

const STYLES = `
.fr { --fr-red:#a51f36; --fr-ink:#202b3c; --fr-muted:#697587; --fr-line:#e8ecf1; color:var(--fr-ink); font-family:inherit; padding:8px 0; }
.fr *, .fr *::before, .fr *::after { box-sizing:border-box; }
.fr svg { width:20px; height:20px; flex-shrink:0; }
.fr button, .fr input { font:inherit; }
.fr button { cursor:pointer; }
.fr button:disabled, .fr input:disabled { cursor:not-allowed; opacity:.5; }
.fr button:focus-visible, .fr input:focus-visible { outline:3px solid #dd91a2; outline-offset:3px; }
.fr .fr-header { display:flex; justify-content:space-between; gap:24px; align-items:center; margin-bottom:26px; }
.fr .fr-title-group { display:flex; align-items:center; gap:15px; }
.fr .fr-title-icon { display:grid; place-items:center; width:52px; height:56px; border-radius:16px; background:#faedf0; color:var(--fr-red); flex-shrink:0; }
.fr .fr-title-icon svg { width:28px; height:28px; }
.fr .fr-eyebrow { display:block; color:var(--fr-red); font-size:10px; font-weight:750; letter-spacing:.13em; margin-bottom:5px; }
.fr h2 { margin:0; color:var(--fr-ink); font-size:25px; font-weight:750; letter-spacing:-.6px; line-height:1.25; }
.fr .fr-header p { margin:7px 0 0; font-size:13px; color:var(--fr-muted); line-height:1.6; }
.fr .fr-button { display:inline-flex; justify-content:center; align-items:center; gap:8px; border-radius:9px; min-height:40px; padding:10px 15px; font-size:12px; font-weight:700; line-height:1.3; white-space:nowrap; transition:background .15s,box-shadow .15s; }
.fr .fr-button svg { width:16px; height:16px; }
.fr .fr-button--secondary { color:#4d596b; background:#fff; border:1px solid #dce2ea; }
.fr .fr-button--secondary:hover:enabled { background:#f7f9fc; border-color:#b7c0cd; }
.fr .fr-button--primary { border:1px solid var(--fr-red); background:var(--fr-red); color:white; box-shadow:0 2px 4px #a51f3618; }
.fr .fr-button--primary:hover:enabled { background:#89182c; border-color:#89182c; box-shadow:0 3px 9px #a51f362b; }
.fr .fr-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin-bottom:25px; }
.fr .fr-stat { border:1px solid var(--fr-line); background:#fff; border-radius:13px; padding:20px; display:flex; justify-content:space-between; gap:12px; box-shadow:0 2px 4px #14233c03; }
.fr .fr-stat-label { display:block; color:#626e80; font-size:12px; font-weight:650; }
.fr .fr-stat strong { display:block; font-size:30px; line-height:1.2; letter-spacing:-1px; margin:9px 0 8px; font-variant-numeric:tabular-nums; }
.fr .fr-stat small { display:block; font-size:11px; color:#7a8594; line-height:1.5; }
.fr .fr-stat-icon { width:36px; height:36px; display:grid; place-items:center; border-radius:10px; }
.fr .fr-stat-icon--green { color:#17815c; background:#edf8f3; }
.fr .fr-stat-icon--amber { color:#ac7518; background:#fff7e9; }
.fr .fr-stat-icon--red { color:var(--fr-red); background:#faedf0; }
.fr .fr-alert { display:flex; align-items:flex-start; gap:10px; padding:14px 16px; border-radius:10px; margin-bottom:16px; font-size:13px; line-height:1.6; overflow-wrap:anywhere; }
.fr .fr-alert--success { background:#edf8f2; color:#166744; border:1px solid #cce9da; }
.fr .fr-alert--error { background:#fff1f2; color:#9f243b; border:1px solid #f6d2da; }
.fr .fr-alert--warning { background:#fff8e8; color:#8a6319; border:1px solid #eedeb5; }
.fr .fr-queue { border:1px solid var(--fr-line); border-radius:14px; overflow:hidden; background:#fff; box-shadow:0 3px 12px #16243b03; }
.fr .fr-toolbar { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:22px 23px; }
.fr h3 { font-size:15px; font-weight:750; margin:0; color:var(--fr-ink); }
.fr .fr-queue-heading h3 { display:flex; align-items:center; gap:8px; }
.fr .fr-count { display:inline-flex; align-items:center; justify-content:center; border-radius:6px; background:#f2f4f7; color:#606b7c; font-size:11px; min-width:23px; padding:3px 7px; }
.fr .fr-queue-heading p { margin:6px 0 0; color:var(--fr-muted); font-size:12px; }
.fr .fr-status-filter { display:flex; flex-wrap:wrap; align-items:center; gap:6px 9px; color:var(--fr-muted); font-size:.8125rem; font-weight:600; }
.fr .fr-status-filter select { max-width:100%; min-height:36px; padding:5px 8px; border:1px solid #d6dee9; border-radius:8px; background:#fff; color:var(--fr-ink); font:inherit; }
.fr .fr-status-filter select:focus-visible { outline:3px solid #dd91a2; outline-offset:2px; }
.fr .fr-table-wrap { overflow-x:auto; }
.fr .fr-table { width:100%; min-width:720px; border-collapse:collapse; border:0; margin:0; }
.fr .fr-table th { background:#f8f9fb; border-top:1px solid var(--fr-line); border-bottom:1px solid var(--fr-line); color:#7a8594; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.065em; padding:13px 16px; text-align:left; white-space:nowrap; }
.fr .fr-table th:first-child, .fr .fr-table td:first-child { padding-left:23px; }
.fr .fr-table td { padding:21px 16px; border-bottom:1px solid #f0f2f5; vertical-align:middle; font-size:12px; text-align:left; }
.fr .fr-table tr:last-child td { border-bottom:0; }
.fr .fr-table tbody tr { transition:background .15s; }
.fr .fr-table tbody tr:hover { background:#fcfcfe; }
.fr .fr-blood-type { display:inline-flex; align-items:center; justify-content:center; min-width:36px; height:36px; padding:0 7px; background:#fceef1; color:var(--fr-red); border:1px solid #f7dde3; border-radius:9px; font-size:13px; font-weight:800; white-space:nowrap; }
.fr .fr-status { display:inline-flex; align-items:center; gap:6px; border-radius:6px; padding:6px 8px; font-size:10px; font-weight:650; white-space:nowrap; line-height:1.4; background:#f1f3f6; color:#697587; }
.fr .fr-status-dot { width:5px; height:5px; border-radius:50%; background:currentColor; }
.fr .fr-status--ready, .fr .fr-status--done { color:#218260; background:#edf8f2; }
.fr .fr-status--partial { color:#477ac2; background:#eef4fd; }
.fr .fr-status--pending { color:#a57720; background:#fff7e7; }
.fr .fr-footer { display:flex; gap:9px; align-items:center; padding:15px 23px; background:#fafbfd; border-top:1px solid var(--fr-line); color:#8792a2; }
.fr .fr-footer svg { width:15px; height:15px; }
.fr .fr-footer p { margin:0; font-size:11px; line-height:1.7; flex:1; }
.fr .fr-footer strong { color:#647186; font-weight:650; }
.fr .fr-fifo { border:1px solid #e2e7ef; border-radius:5px; padding:3px 7px; font-size:9px; letter-spacing:.07em; color:#778398; font-weight:700; }
.fr .fr-loading { display:flex; align-items:center; justify-content:center; gap:9px; padding:18px; background:#f9fafc; color:#738095; font-size:12px; }
.fr .fr-empty { padding:50px 20px; text-align:center; }
.fr .fr-empty > span { display:grid; place-items:center; width:50px; height:50px; border-radius:15px; background:#f5f7fa; color:#8e9bb0; margin:0 auto 15px; }
.fr .fr-dialog::backdrop { background:#17223980; backdrop-filter:blur(3px); }
.fr .fr-dialog-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.fr .fr-dialog-header h2 { margin: 0; font-size: 1.25rem; line-height: 1.25; }
.fr .fr-icon-button { display: grid; place-items: center; flex-shrink: 0; width: 32px; height: 32px; border: 0; border-radius: 50%; background: #f5f6f8; color: var(--fr-muted); }
.fr .fr-icon-button:hover { background: #e9edf2; }
.fr .fr-icon-button svg { width: 16px; height: 16px; }
.fr .fr-release-summary { display:flex; align-items:center; gap:10px; margin:0 0 12px; padding:7px 10px; border:1px solid #f0e0e4; border-radius:9px; background:#fdf8fa; font-size:.9375rem; font-weight:700; text-align:left; }
.fr .fr-release-summary .fr-blood-type { min-width: 38px; height: 30px; font-size: 0.8125rem; }
.fr .fr-details { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr)); gap:10px 16px; margin:0 0 14px; padding:0 0 12px; border-bottom:1px solid var(--fr-line); text-align:left; }
.fr .fr-details dt { color:var(--fr-muted); font-size:.8125rem; }
.fr .fr-details dd { margin:4px 0 0; font-size:.9375rem; font-weight:650; overflow-wrap:anywhere; }
.fr .fr-dialog-info svg { width:16px; height:16px; margin-top:1px; }
.fr .fr-dialog-info { display:flex; align-items:flex-start; gap:8px; padding:10px 12px; border:1px solid var(--fr-line); border-radius:8px; background:#f8fafc; color:var(--fr-muted); }
.fr .fr-dialog-info p { font-size:11px; line-height:1.7; margin:0; }
.fr .fr-dialog { width:min(740px,calc(100vw - 32px)); max-height:min(calc(100dvh - 32px),720px); padding:0; overflow:hidden; border:1px solid #e7eaf0; border-radius:16px; color:var(--fr-ink); background:#fff; box-shadow:0 24px 90px #101d3240; color-scheme:light; text-align:left; }
.fr .fr-dialog[open] { position:fixed; inset:0; margin:auto; height:fit-content; display:flex; flex-direction:column; }
.fr .fr-dialog-body { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: clamp(14px, 4vw, 24px); }
.fr .fr-dialog-actions { display: flex; flex: 0 0 auto; flex-wrap: wrap; justify-content: flex-end; gap: 9px; margin: 0; padding: 12px clamp(14px, 4vw, 24px); border-top: 1px solid var(--fr-line); background: #fff; }
.fr .fr-bag-search { display: grid; gap: 6px; color: var(--fr-ink); font-size: 0.875rem; font-weight: 600; }
.fr .fr-bag-search input { width:100%; min-width:0; min-height:44px; margin:0; padding:8px 12px; border:1px solid #d6dee9; border-radius:8px; background:#fff; color:var(--fr-ink); font-size:.875rem; font-weight:400; }
.fr .fr-bag-count { margin: 10px 0 6px; color: var(--fr-muted); font-size: 0.8125rem; }
.fr .fr-selected-bags { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.fr .fr-selected-bags li { display: inline-flex; align-items: center; gap: 8px; padding: 5px 9px; border-radius: 8px; background: #faedf0; color: #842338; font-size: 0.8125rem; }
.fr .fr-selected-bags button { padding: 2px 3px; border: 0; background: transparent; color: inherit; font-size: 0.75rem; text-decoration: underline; }
.fr .fr-bag-results { max-height:15rem; margin-top:12px; overflow:auto; border:1px solid var(--fr-line); border-radius:10px; }
.fr .fr-bag-results ul { margin: 0; padding: 0; list-style: none; }
.fr .fr-bag-row { display: grid; grid-template-columns: 1rem minmax(0, 1fr) minmax(5.75rem, auto); align-items: center; gap: 0.625rem; padding: 0.625rem 0.75rem; font-size: 0.875rem; text-align: left; }
.fr .fr-bag-heading { position:sticky; top:0; z-index:1; background:#f3f6fa; color:var(--fr-muted); font-size:.75rem; font-weight:700; }
.fr .fr-bag-row > :last-child { text-align:right; }
.fr .fr-bag-results li { border-top: 1px solid var(--fr-line); }
.fr .fr-bag-row:has(input:checked) { background: #fff3f5; }
.fr .fr-bag-row input { margin: 0; accent-color: var(--fr-red); }
.fr .fr-bag-row strong, .fr .fr-bag-row small { display: block; overflow-wrap: anywhere; }
.fr .fr-bag-row small, .fr .fr-bag-expiry { color: var(--fr-muted); }
.fr .fr-dialog-actions .fr-button { min-height:42px; }
.fr .fr-view-details { display: inline-grid; place-items: center; width: 40px; height: 40px; border: 1px solid #f0d6dd; border-radius: 9px; background: #fff3f5; color: var(--fr-red); }
.fr .fr-view-details:hover { background: #fae5eb; }
.fr .fr-detail-progress { display:grid; gap:10px; margin:0; padding:12px; border:1px solid var(--fr-line); border-radius:10px; background:#f8fafc; }
.fr .fr-detail-progress progress { width: 100%; height: 8px; accent-color: var(--fr-red); }
.fr .fr-request-dialog { width: min(600px, calc(100vw - 32px)); }
.fr .fr-request-section { margin:0 0 14px; padding:12px; border:1px solid var(--fr-line); border-radius:10px; }
.fr .fr-request-section h3 { margin:0 0 8px; }
.fr .fr-released-bags { margin:14px 0 0; }
.fr .fr-released-bags p { margin:8px 0 0; color:var(--fr-muted); font-size:.8125rem; }
.fr .fr-released-bags li { min-width:0; overflow-wrap:anywhere; }
.fr .fr-progress-counts { display: grid; gap: 10px 14px; margin: 0; text-align: left; }
.fr .fr-progress-counts { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.fr .fr-progress-counts dt { color: var(--fr-muted); font-size: 0.75rem; }
.fr .fr-progress-counts dd { margin: 2px 0 0; font-size: 0.875rem; font-weight: 600; overflow-wrap: anywhere; }
.fr .fr-request-dialog .fr-details { margin:0; padding:0; border:0; }
.fr .fr-row-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.fr .fr-confirm-quantity { display:inline-flex; align-items:center; gap:8px; color:var(--fr-ink); font-size:.8125rem; font-weight:600; }
.fr .fr-confirm-quantity input { width:4rem; min-height:36px; padding:4px 6px; border:1px solid #d6dee9; border-radius:7px; background:#fff; color:var(--fr-ink); text-align:center; }
.fr .fr-confirm-quantity input[aria-invalid="true"] { border-color:var(--fr-red); }
.fr .fr-confirm-dialog .fr-confirm-quantity-row { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:14px; }
.fr .fr-confirm-quantity-row small { color:var(--fr-muted); font-size:.75rem; }
@keyframes fr-rotate { to { transform:rotate(360deg); } }
.fr .fr-spin { animation:fr-rotate 1.2s linear infinite; }
@media (prefers-reduced-motion:reduce) {
    .fr .fr-spin { animation:none; }
    .fr * { transition:none !important; }
}
@media (max-width:900px) {
    .fr .fr-stat { padding:16px; }
    .fr .fr-stat-icon { display:none; }
    .fr .fr-title-icon { display:none; }
}
@media (max-width:640px) {
    .fr .fr-header { align-items:flex-start; gap:15px; flex-direction:column; margin-bottom:20px; }
    .fr h2 { font-size:23px; }
    .fr .fr-stats { gap:8px; margin-bottom:20px; }
    .fr .fr-stat { padding:13px 10px; border-radius:10px; }
    .fr .fr-stat-label { font-size:10px; min-height:28px; line-height:1.4; }
    .fr .fr-stat strong { font-size:26px; margin:6px 0 0; }
    .fr .fr-stat small { display:none; }
    .fr .fr-toolbar { padding:18px 15px; align-items:flex-start; flex-wrap:wrap; gap:12px; }
    .fr .fr-queue-heading p { font-size:10px; }
    .fr .fr-table { display:block; min-width:0; }
    .fr .fr-table thead { position:absolute; width:1px; height:1px; padding:0; overflow:hidden; clip-path:inset(50%); }
    .fr .fr-table tbody { display:block; }
    .fr .fr-table tr { display:grid; grid-template-columns:1fr 1fr; gap:17px 15px; padding:20px 15px; border-top:1px solid var(--fr-line); }
    .fr .fr-table td, .fr .fr-table td:first-child { display:block; border:0; padding:0; min-width:0; }
    .fr .fr-table td::before { content:attr(data-label); display:block; color:#929bab; font-size:9px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; margin-bottom:7px; }
    .fr .fr-table td:first-child { grid-column:1 / -1; }
    .fr .fr-table td:first-child::before { display:none; }
    .fr .fr-table td:last-child { grid-column:1 / -1; border-top:1px solid #f1f3f6; padding-top:13px; }
    .fr .fr-footer { padding:14px 15px; align-items:flex-start; }
    .fr .fr-fifo { display:none; }
}
`;
