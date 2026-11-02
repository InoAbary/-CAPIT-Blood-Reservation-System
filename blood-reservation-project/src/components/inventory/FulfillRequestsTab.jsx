import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../utils/api';

const ENDPOINT = '/api/inventory-fulfillment';
const formatDate = value => value && !Number.isNaN(new Date(value).getTime()) ? new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short'
}).format(new Date(value)) : '—';
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
const statusTone = status => ({ Approved: 'ready', 'Partially Fulfilled': 'partial', Pending: 'pending', Fulfilled: 'done' }[status] || 'neutral');
function StatusBadge({ status }) {
    return <span className={`fr-status fr-status--${statusTone(status)}`}><span className="fr-status-dot" />{status}</span>;
}

export default function FulfillRequestsTab({ facilityID, onFulfilled }) {
    const [confirmation, setConfirmation] = useState(null);
    const dialogRef = useRef(null);
    const [requests, setRequests] = useState([]);
    const [quantities, setQuantities] = useState({});
    const [loading, setLoading] = useState(true);
    const [busyID, setBusyID] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [needsRefresh, setNeedsRefresh] = useState(true);
    const [showCompleted, setShowCompleted] = useState(false);
    const inFlight = useRef(false);

    const loadRequests = useCallback(async signal => {
        setLoading(true);
        try {
            const response = await apiFetch(ENDPOINT, { signal });
            const body = await response.json().catch(() => { throw new Error('The server returned an unreadable response. Refresh to check request progress.'); });
            if (!response.ok) throw new Error(body.message || 'Could not load fulfillment requests.');
            if (!Array.isArray(body.requests)) throw new Error('Invalid request list.');
            if (signal?.aborted) return false;
            setRequests(body.requests.filter(row => !facilityID || String(row.receivingFacilityID?._id || row.receivingFacilityID) === String(facilityID))); setQuantities({}); setNeedsRefresh(false);
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
            const units = Number(quantities[row._id] ?? maximum);
            if (!Number.isSafeInteger(units) || units < 1 || units > maximum) {
                setError(`Enter a whole number from 1 to ${maximum}.`); return;
            }
            setError(''); setConfirmation({ row, units });
        }

        async function fulfill(row, units) {
            if (inFlight.current || needsRefresh) return;
            const maximum = Math.min(row.remainingUnits, row.availableUnits);
            if (!['Approved', 'Partially Fulfilled'].includes(row.requestStatus) || !Number.isSafeInteger(units) || units < 1 || units > maximum) return;
            dialogRef.current?.close(); setConfirmation(null);
            inFlight.current = true; setBusyID(row._id); setError(''); setMessage('');
            try {
                const response = await apiFetch(`${ENDPOINT}/${row._id}/fulfill`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ units, expectedFulfilledUnits: row.fulfilledUnits })
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

        const visible = requests.filter(row => showCompleted || row.requestStatus !== 'Fulfilled');
        const readyCount = requests.filter(row => ['Approved', 'Partially Fulfilled'].includes(row.requestStatus) && Math.min(row.remainingUnits, row.availableUnits) > 0).length;
        const pendingCount = requests.filter(row => row.requestStatus === 'Pending').length;
        const outstanding = requests.reduce((total, row) => total + (row.requestStatus === 'Fulfilled' ? 0 : Math.max(0, Number(row.remainingUnits) || 0)), 0);
        return <section className="fr" aria-label="Release blood units to requests" aria-busy={loading}>
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
        <div className="fr-stat"><div><span className="fr-stat-label">Ready to release</span><strong>{loading || needsRefresh ? '—' : readyCount}</strong><small>Approved requests with eligible stock</small></div><span className="fr-stat-icon fr-stat-icon--green"><Icon name="check" /></span></div>
        <div className="fr-stat"><div><span className="fr-stat-label">Awaiting approval</span><strong>{loading || needsRefresh ? '—' : pendingCount}</strong><small>Pending requests in your queue</small></div><span className="fr-stat-icon fr-stat-icon--amber"><Icon name="clock" /></span></div>
        <div className="fr-stat"><div><span className="fr-stat-label">Units outstanding</span><strong>{loading || needsRefresh ? '—' : outstanding}</strong><small>Units remaining across open requests</small></div><span className="fr-stat-icon fr-stat-icon--red"><Icon name="drop" /></span></div>
        </div>

        {message && <div role="status" className="fr-alert fr-alert--success"><Icon name="check" /><span>{message}</span></div>}
        {error && <div role="alert" className="fr-alert fr-alert--error"><Icon name="info" /><span>{error}</span></div>}
        {!loading && needsRefresh && <div className="fr-alert fr-alert--warning"><Icon name="info" /><span>Refresh successfully before releasing any units.</span></div>}

        <div className="fr-queue">
        <div className="fr-toolbar">
        <div className="fr-queue-heading"><h3>Request queue <span className="fr-count">{visible.length}</span></h3><p>Patient requests assigned to this facility</p></div>
        <label className="fr-toggle"><input type="checkbox" checked={showCompleted} onChange={event => setShowCompleted(event.target.checked)} /><span className="fr-toggle-track" aria-hidden="true" /><span>Show fulfilled</span></label>
        </div>
        {loading && <div className="fr-loading" role="status"><Icon name="refresh" className="fr-spin" />Updating requests and eligible stock…</div>}
        {!loading && !needsRefresh && visible.length === 0 && <div className="fr-empty"><span><Icon name="list" /></span><h3>Your queue is clear</h3><p>No {showCompleted ? '' : 'open '}requests to display for this facility.</p></div>}
        {visible.length > 0 && <div className="fr-table-wrap"><table className="fr-table">
            <thead><tr>{['Patient / Submitted', 'Hospital', 'Blood product', 'Release progress', 'Eligible stock', 'Status', 'Action'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>{visible.map(row => {
                const maximum = Math.min(row.remainingUnits, row.availableUnits);
                const allowed = ['Approved', 'Partially Fulfilled'].includes(row.requestStatus) && maximum > 0;
                const disabled = !allowed || busyID !== null || loading || needsRefresh;
                const progress = row.units > 0 ? Math.min(100, Math.max(0, row.fulfilledUnits / row.units * 100)) : 0;
                const name = [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ') || 'Unnamed patient';
                const initials = [row.firstName, row.lastName].filter(Boolean).map(part => part[0]).join('').slice(0, 2) || 'P';
            return <tr key={row._id}>
            <td data-label="Patient"><div className="fr-patient"><span className="fr-avatar" aria-hidden="true">{initials}</span><div><strong>{name}</strong><small>{formatDate(row.createdAt)}</small></div></div></td>
            <td data-label="Hospital"><span className="fr-hospital">{row.hospital || '—'}</span></td>
            <td data-label="Blood product"><div className="fr-product"><span className="fr-blood-type">{row.bloodType}</span><span>{row.component}</span></div></td>
            <td data-label="Progress"><div className="fr-progress"><div><strong>{row.fulfilledUnits}<span> / {row.units}</span></strong><small>{Math.round(progress)}%</small></div><progress value={row.fulfilledUnits} max={Math.max(1, row.units)} aria-label={`Release progress for ${name}`} /><small>{row.remainingUnits} unit{row.remainingUnits === 1 ? '' : 's'} remaining</small></div></td>
            <td data-label="Eligible stock"><div className={`fr-stock ${row.availableUnits > 0 ? 'fr-stock--available' : 'fr-stock--empty'}`}><span className="fr-stock-dot" /><strong>{row.availableUnits}</strong><span>unit{row.availableUnits === 1 ? '' : 's'}</span></div></td>
            <td data-label="Status"><StatusBadge status={row.requestStatus} /></td>
            <td data-label="Action">{row.requestStatus === 'Pending' ? <span className="fr-action-note"><Icon name="clock" />Awaiting approval</span> : row.remainingUnits <= 0 ? <span className="fr-action-note fr-action-note--done"><Icon name="check" />Completed</span> : !maximum ? <span className="fr-action-note">No eligible stock</span> : <div className="fr-release-controls">
                <div className="fr-release-row"><input type="number" min={1} max={maximum} step={1} aria-label={`Units to release for ${name}, ${row.component}`} value={quantities[row._id] ?? maximum} onChange={event => setQuantities(previous => ({ ...previous, [row._id]: event.target.value }))} disabled={disabled} />
                <button type="button" className="fr-button fr-button--primary" onClick={() => prepareRelease(row)} disabled={disabled}>{busyID === row._id ? 'Releasing…' : 'Release'}<Icon name="arrow" /></button></div>
                <small>Up to {maximum} unit{maximum === 1 ? '' : 's'} this release</small>
                </div>}</td>
                </tr>;
            })}</tbody>
            </table></div>}
            <footer className="fr-footer"><Icon name="info" /><p><strong>Oldest eligible units first.</strong> Blood type and component must match. Partial releases are supported.</p><span className="fr-fifo">FIFO</span></footer>
            </div>

            <dialog className="fr-dialog" ref={dialogRef} aria-labelledby="release-confirm-title" onCancel={() => setConfirmation(null)} onClose={() => setConfirmation(null)}>
            {confirmation && <>
                <div className="fr-dialog-header"><span className="fr-dialog-icon"><Icon name="drop" /></span><button type="button" className="fr-icon-button" aria-label="Close confirmation" onClick={() => { dialogRef.current?.close(); setConfirmation(null); }}><Icon name="close" /></button></div>
                <span className="fr-eyebrow">REVIEW HANDOVER</span><h2 id="release-confirm-title">Confirm release</h2><p className="fr-dialog-subtitle">Review the details before releasing these units.</p>
                <div className="fr-release-summary"><span className="fr-blood-type">{confirmation.row.bloodType}</span><div><strong>{confirmation.units} unit{confirmation.units === 1 ? '' : 's'}</strong><span>{confirmation.row.component}</span></div></div>
                <dl className="fr-details"><div><dt>Patient</dt><dd>{[confirmation.row.firstName, confirmation.row.middleName, confirmation.row.lastName].filter(Boolean).join(' ') || 'Unnamed patient'}</dd></div><div><dt>Hospital</dt><dd>{confirmation.row.hospital || '—'}</dd></div><div><dt>Remaining after release</dt><dd>{confirmation.row.remainingUnits - confirmation.units} unit(s)</dd></div></dl>
                <div className="fr-dialog-info"><Icon name="info" /><p>The oldest eligible units will be assigned to this request and marked <strong>Released</strong>.</p></div>
                <div className="fr-dialog-actions"><button type="button" className="fr-button fr-button--secondary" onClick={() => { dialogRef.current?.close(); setConfirmation(null); }}>Cancel</button><button type="button" className="fr-button fr-button--primary" disabled={busyID !== null || loading || needsRefresh} onClick={() => fulfill(confirmation.row, confirmation.units)}>Confirm release<Icon name="arrow" /></button></div>
                </>}
                </dialog>
                </section>;
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
.fr .fr-title-icon, .fr .fr-dialog-icon { display:grid; place-items:center; width:52px; height:56px; border-radius:16px; background:#faedf0; color:var(--fr-red); flex-shrink:0; }
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
.fr .fr-toggle { display:flex; align-items:center; gap:9px; color:#596576; cursor:pointer; font-size:12px; white-space:nowrap; position:relative; }
.fr .fr-toggle input { position:absolute; width:34px; height:20px; opacity:0; margin:0; cursor:pointer; }
.fr .fr-toggle-track { width:34px; height:20px; border-radius:20px; background:#d5dce5; transition:background .15s; }
.fr .fr-toggle-track::after { content:''; display:block; width:14px; height:14px; background:white; border-radius:50%; margin:3px; box-shadow:0 1px 3px #0002; transition:transform .15s; }
.fr .fr-toggle input:checked + .fr-toggle-track { background:var(--fr-red); }
.fr .fr-toggle input:checked + .fr-toggle-track::after { transform:translateX(14px); }
.fr .fr-toggle input:focus-visible + .fr-toggle-track { outline:3px solid #dd91a2; outline-offset:3px; }
.fr .fr-table-wrap { overflow-x:auto; }
.fr .fr-table { width:100%; min-width:1050px; border-collapse:collapse; border:0; margin:0; }
.fr .fr-table th { background:#f8f9fb; border-top:1px solid var(--fr-line); border-bottom:1px solid var(--fr-line); color:#7a8594; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.065em; padding:13px 16px; text-align:left; white-space:nowrap; }
.fr .fr-table th:first-child, .fr .fr-table td:first-child { padding-left:23px; }
.fr .fr-table td { padding:21px 16px; border-bottom:1px solid #f0f2f5; vertical-align:middle; font-size:12px; text-align:left; }
.fr .fr-table tr:last-child td { border-bottom:0; }
.fr .fr-table tbody tr { transition:background .15s; }
.fr .fr-table tbody tr:hover { background:#fcfcfe; }
.fr .fr-patient { display:flex; gap:10px; align-items:center; min-width:170px; }
.fr .fr-avatar { display:grid; place-items:center; width:34px; height:34px; border:1px solid #e7eaf0; background:#f3f5f9; border-radius:50%; color:#718099; font-size:10px; font-weight:700; flex-shrink:0; text-transform:uppercase; }
.fr .fr-patient strong { display:block; max-width:200px; overflow-wrap:anywhere; font-size:12px; line-height:1.5; font-weight:700; }
.fr .fr-patient small { display:block; color:#8a94a3; font-size:10px; margin-top:4px; line-height:1.5; }
.fr .fr-hospital { display:block; max-width:150px; min-width:95px; line-height:1.6; color:#667286; overflow-wrap:anywhere; }
.fr .fr-product { display:flex; align-items:center; gap:8px; color:#677386; font-size:11px; line-height:1.5; }
.fr .fr-blood-type { display:inline-flex; align-items:center; justify-content:center; min-width:36px; height:36px; padding:0 7px; background:#fceef1; color:var(--fr-red); border:1px solid #f7dde3; border-radius:9px; font-size:13px; font-weight:800; white-space:nowrap; }
.fr .fr-progress { min-width:114px; max-width:160px; }
.fr .fr-progress > div { display:flex; align-items:center; justify-content:space-between; gap:15px; margin-bottom:7px; }
.fr .fr-progress strong { font-size:12px; font-weight:750; }
.fr .fr-progress strong span { color:#9aa3b0; font-weight:400; }
.fr .fr-progress small { font-size:10px; color:#8a94a3; white-space:nowrap; }
.fr .fr-progress progress { appearance:none; -webkit-appearance:none; border:0; border-radius:20px; overflow:hidden; background:#eff1f5; width:100%; height:5px; display:block; margin:0 0 7px; color:var(--fr-red); }
.fr .fr-progress progress::-webkit-progress-bar { background:#eff1f5; border-radius:20px; }
.fr .fr-progress progress::-webkit-progress-value { background:var(--fr-red); border-radius:20px; }
.fr .fr-progress progress::-moz-progress-bar { background:var(--fr-red); border-radius:20px; }
.fr .fr-stock { display:flex; align-items:center; gap:5px; white-space:nowrap; color:#7a8594; font-size:10px; }
.fr .fr-stock strong { font-size:15px; color:#354258; font-variant-numeric:tabular-nums; }
.fr .fr-stock-dot { width:6px; height:6px; background:#24a575; border-radius:50%; margin-right:2px; }
.fr .fr-stock--empty .fr-stock-dot { background:#c2c9d3; }
.fr .fr-stock--empty strong { color:#9aa3b0; }
.fr .fr-status { display:inline-flex; align-items:center; gap:6px; border-radius:6px; padding:6px 8px; font-size:10px; font-weight:650; white-space:nowrap; line-height:1.4; background:#f1f3f6; color:#697587; }
.fr .fr-status-dot { width:5px; height:5px; border-radius:50%; background:currentColor; }
.fr .fr-status--ready, .fr .fr-status--done { color:#218260; background:#edf8f2; }
.fr .fr-status--partial { color:#477ac2; background:#eef4fd; }
.fr .fr-status--pending { color:#a57720; background:#fff7e7; }
.fr .fr-release-controls { min-width:161px; }
.fr .fr-release-row { display:flex; align-items:center; gap:7px; }
.fr .fr-release-row input { width:57px; height:36px; border:1px solid #dfe4ec; border-radius:7px; padding:7px; background:white; text-align:center; font-size:12px; color:#364256; }
.fr .fr-release-row .fr-button { min-height:36px; padding:8px 11px; font-size:11px; border-radius:7px; }
.fr .fr-release-controls > small { display:block; color:#929bab; font-size:10px; margin-top:6px; }
.fr .fr-action-note { display:flex; align-items:center; gap:6px; color:#939dab; font-size:11px; line-height:1.5; }
.fr .fr-action-note svg { width:15px; height:15px; }
.fr .fr-action-note--done { color:#218260; }
.fr .fr-footer { display:flex; gap:9px; align-items:center; padding:15px 23px; background:#fafbfd; border-top:1px solid var(--fr-line); color:#8792a2; }
.fr .fr-footer svg { width:15px; height:15px; }
.fr .fr-footer p { margin:0; font-size:11px; line-height:1.7; flex:1; }
.fr .fr-footer strong { color:#647186; font-weight:650; }
.fr .fr-fifo { border:1px solid #e2e7ef; border-radius:5px; padding:3px 7px; font-size:9px; letter-spacing:.07em; color:#778398; font-weight:700; }
.fr .fr-loading { display:flex; align-items:center; justify-content:center; gap:9px; padding:18px; background:#f9fafc; color:#738095; font-size:12px; }
.fr .fr-empty { padding:50px 20px; text-align:center; }
.fr .fr-empty > span { display:grid; place-items:center; width:50px; height:50px; border-radius:15px; background:#f5f7fa; color:#8e9bb0; margin:0 auto 15px; }
.fr .fr-empty p { color:#8a94a3; font-size:12px; margin:9px 0 0; }
.fr .fr-dialog { width:min(460px,calc(100vw - 32px)); max-height:calc(100dvh - 40px); overflow-y:auto; border:1px solid #e7eaf0; border-radius:20px; padding:28px; color:var(--fr-ink); background:#fff; box-shadow:0 24px 90px #101d3240; }
.fr .fr-dialog::backdrop { background:#17223980; backdrop-filter:blur(3px); }
.fr .fr-dialog-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; }
.fr .fr-dialog-icon { width:48px; height:48px; border-radius:14px; }
.fr .fr-dialog-icon svg { width:25px; height:25px; }
.fr .fr-icon-button { display:grid; place-items:center; border:0; background:#f5f6f8; border-radius:50%; width:30px; height:30px; color:#8a94a3; }
.fr .fr-icon-button:hover { background:#e9edf2; color:#4b5a70; }
.fr .fr-icon-button svg { width:15px; height:15px; }
.fr .fr-dialog h2 { font-size:25px; margin-top:5px; }
.fr .fr-dialog-subtitle { font-size:12px; color:#8792a2; line-height:1.7; margin:10px 0 22px; }
.fr .fr-release-summary { display:flex; align-items:center; gap:13px; border:1px solid #f0e0e4; border-radius:12px; padding:17px; background:#fffbfc; }
.fr .fr-release-summary .fr-blood-type { height:46px; min-width:46px; font-size:16px; }
.fr .fr-release-summary strong { display:block; font-size:20px; letter-spacing:-.5px; }
.fr .fr-release-summary div > span { display:block; font-size:11px; color:#8b7681; margin-top:4px; }
.fr .fr-details { margin:20px 0; }
.fr .fr-details > div { display:flex; justify-content:space-between; gap:18px; padding:11px 0; border-bottom:1px solid #f0f2f5; font-size:12px; line-height:1.6; }
.fr .fr-details dt { color:#8892a2; }
.fr .fr-details dd { margin:0; font-weight:600; text-align:right; max-width:60%; overflow-wrap:anywhere; }
.fr .fr-dialog-info { display:flex; align-items:flex-start; gap:9px; padding:13px; background:#f5f7fb; border-radius:9px; color:#7c899b; }
.fr .fr-dialog-info svg { width:16px; height:16px; margin-top:1px; }
.fr .fr-dialog-info p { font-size:11px; line-height:1.7; margin:0; }
.fr .fr-dialog-actions { display:flex; justify-content:flex-end; gap:9px; margin-top:24px; }
.fr .fr-dialog-actions .fr-button { min-height:42px; }
@keyframes fr-rotate { to { transform:rotate(360deg); } }
.fr .fr-spin { animation:fr-rotate 1.2s linear infinite; }
@media (prefers-reduced-motion:reduce) { .fr .fr-spin { animation:none; } .fr * { transition:none !important; } }
@media (max-width:900px) { .fr .fr-stat { padding:16px; } .fr .fr-stat-icon { display:none; } .fr .fr-title-icon { display:none; } }
@media (max-width:640px) {
    .fr .fr-header { align-items:flex-start; gap:15px; flex-direction:column; margin-bottom:20px; }
    .fr h2 { font-size:23px; }
    .fr .fr-stats { gap:8px; margin-bottom:20px; }
    .fr .fr-stat { padding:13px 10px; border-radius:10px; }
    .fr .fr-stat-label { font-size:10px; min-height:28px; line-height:1.4; }
    .fr .fr-stat strong { font-size:26px; margin:6px 0 0; }
    .fr .fr-stat small { display:none; }
    .fr .fr-toolbar { padding:18px 15px; align-items:flex-start; gap:12px; }
    .fr .fr-queue-heading p { font-size:10px; }
    .fr .fr-toggle { font-size:10px; gap:6px; padding-top:2px; }
    .fr .fr-table { display:block; min-width:0; }
    .fr .fr-table thead { position:absolute; width:1px; height:1px; padding:0; overflow:hidden; clip-path:inset(50%); }
    .fr .fr-table tbody { display:block; }
    .fr .fr-table tr { display:grid; grid-template-columns:1fr 1fr; gap:17px 15px; padding:20px 15px; border-top:1px solid var(--fr-line); }
    .fr .fr-table td, .fr .fr-table td:first-child { display:block; border:0; padding:0; min-width:0; }
    .fr .fr-table td::before { content:attr(data-label); display:block; color:#929bab; font-size:9px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; margin-bottom:7px; }
    .fr .fr-table td:first-child { grid-column:1 / -1; }
    .fr .fr-table td:first-child::before { display:none; }
    .fr .fr-table td:last-child { grid-column:1 / -1; border-top:1px solid #f1f3f6; padding-top:13px; }
    .fr .fr-release-controls { display:flex; justify-content:space-between; align-items:center; gap:12px; }
    .fr .fr-release-controls > small { margin:0; text-align:right; }
    .fr .fr-patient strong { max-width:none; }
    .fr .fr-hospital { max-width:none; }
    .fr .fr-footer { padding:14px 15px; align-items:flex-start; }
    .fr .fr-fifo { display:none; }
    .fr .fr-dialog { padding:23px; }
}
`;
