import React, { useState, useEffect } from 'react';

// Set REACT_APP_API_URL (CRA) or VITE_API_URL (Vite) if the API is somewhere else.
const API_URL =
(typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
'http://localhost:3000';

// Column order matches the reference screenshot
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const COMPONENTS = ['Packed RBC', 'Plasma', 'Platelets', 'Whole Blood', 'Cryoprecipitate'];

const TABS = [
    { id: 'overview', label: 'Inventory Overview' },
{ id: 'update', label: 'View & Update' },
{ id: 'history', label: 'Update History' },
];

// Turn the flat inventory rows into { component: { bloodType: quantity } }
function buildMatrix(rows) {
    const matrix = {};
    COMPONENTS.forEach((c) => {
        matrix[c] = {};
        BLOOD_TYPES.forEach((t) => {
            matrix[c][t] = 0;
        });
    });

    rows.forEach((r) => {
        if (matrix[r.component] && r.bloodType in matrix[r.component]) {
            matrix[r.component][r.bloodType] += r.availQuantity || 0;
        }
    });

    return matrix;
}

const cell = (n) => (n > 0 ? n : '-');

const formatDate = (d) =>
d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

function Inventory() {
    const [facilities, setFacilities] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [facility, setFacility] = useState(null);
    const [inventory, setInventory] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [loadingList, setLoadingList] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [error, setError] = useState('');

    // Load dropdown options once
    useEffect(() => {
        const controller = new AbortController();

        (async () => {
            try {
                const res = await fetch(`${API_URL}/api/facilities`, { signal: controller.signal });
                if (!res.ok) throw new Error('Could not load facilities.');
                const data = await res.json();
                setFacilities(data);
                if (data.length > 0) setSelectedId(data[0]._id);
            } catch (err) {
                if (err.name !== 'AbortError') setError(err.message);
            } finally {
                setLoadingList(false);
            }
        })();

        return () => controller.abort();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedId) return;

        setError('');
        setLoadingDetails(true);

        try {
            const [facRes, invRes] = await Promise.all([
                fetch(`${API_URL}/api/facilities/${selectedId}`),
                                                       fetch(`${API_URL}/api/facilities/${selectedId}/inventory`),
            ]);

            const facBody = await facRes.json();
            if (!facRes.ok) throw new Error(facBody.message || 'Could not load facility.');

            const invBody = await invRes.json();
            if (!invRes.ok) throw new Error(invBody.message || 'Could not load inventory.');

            setFacility(facBody);
            setInventory(invBody);
            setActiveTab('overview');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleChangeFacility = () => {
        setFacility(null);
        setInventory(null);
        setError('');
    };

    const showDashboard = facility && inventory;

    const matrix = showDashboard ? buildMatrix(inventory) : null;

    // Most recent lastUpdated across this facility's inventory entries
    let lastUpdated = null;
    if (showDashboard) {
        const times = inventory
        .map((r) => new Date(r.lastUpdated).getTime())
        .filter((n) => !Number.isNaN(n));
        if (times.length > 0) lastUpdated = new Date(Math.max(...times));
    }

    return (
        <div className="inv-page">
        <style>{`
            .inv-page {
                --accent: #c9363f;
                --accent-soft: #fbe4e4;
                --accent-faint: #fdf1f1;
                --ink: #2a2a35;
                --muted: #6f6a76;
                --line: #f0e4e4;
                --shadow: 0 2px 14px rgba(120, 60, 60, 0.08);
                min-height: 100vh;
                padding: 32px 16px;
                box-sizing: border-box;
                background: #fcf7f7;
                font-family: 'Public Sans', 'Segoe UI', Arial, sans-serif;
                color: var(--ink);
            }

            /* ---------- Facility picker ---------- */
            .inv-picker {
                display: flex;
                justify-content: center;
                padding-top: 80px;
            }
            .inv-form {
                box-sizing: border-box;
                width: 100%;
                max-width: 320px;
                padding: 28px;
                border-radius: 14px;
                background: #fff;
                box-shadow: var(--shadow);
            }
            .inv-label {
                display: block;
                margin-bottom: 8px;
                font-size: 13px;
                font-weight: 600;
                color: var(--muted);
            }
            .inv-select-wrap { position: relative; }
            .inv-select {
                appearance: none;
                -webkit-appearance: none;
                width: 100%;
                height: 42px;
                padding: 0 40px 0 14px;
                border: none;
                border-radius: 10px;
                background: var(--accent-faint);
                font: inherit;
                font-size: 14px;
                font-weight: 600;
                color: var(--ink);
                cursor: pointer;
                transition: background 0.15s ease;
            }
            .inv-select:hover:not(:disabled) { background: var(--accent-soft); }
            .inv-select:disabled { cursor: not-allowed; opacity: 0.7; }
            .inv-select:focus-visible,
            .inv-submit:focus-visible,
            .inv-tab:focus-visible,
            .inv-change:focus-visible {
                outline: 2px solid var(--accent);
                outline-offset: 2px;
            }
            .inv-chevron {
                position: absolute;
                right: 14px;
                top: 50%;
                width: 14px;
                height: 14px;
                transform: translateY(-50%);
                pointer-events: none;
                color: var(--accent);
            }
            .inv-submit {
                display: block;
                width: 100%;
                margin-top: 20px;
                padding: 11px 20px;
                border: none;
                border-radius: 10px;
                background: var(--accent);
                font: inherit;
                font-size: 14px;
                font-weight: 700;
                color: #fff;
                cursor: pointer;
                transition: background 0.15s ease, transform 0.08s ease;
            }
            .inv-submit:hover:not(:disabled) { background: #b52d36; }
            .inv-submit:active:not(:disabled) { transform: translateY(1px); }
            .inv-submit:disabled { opacity: 0.5; cursor: not-allowed; }
            .inv-error {
                margin-top: 16px;
                font-size: 13px;
                font-weight: 600;
                color: #b3261e;
                text-align: center;
            }

            /* ---------- Facility page ---------- */
            .inv-shell {
                max-width: 1060px;
                margin: 0 auto;
            }
            .inv-top {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 16px;
            }
            .inv-facility-box {
                box-sizing: border-box;
                max-width: 100%;
                padding: 12px 20px;
                border-radius: 12px;
                background: #fff;
                box-shadow: var(--shadow);
                font-size: 16px;
                font-weight: 700;
            }
            .inv-change {
                padding: 0;
                border: none;
                background: none;
                font: inherit;
                font-size: 13px;
                font-weight: 600;
                color: var(--accent);
                cursor: pointer;
            }
            .inv-change:hover { text-decoration: underline; }

            .inv-tabs {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                margin-top: 20px;
            }
            .inv-tab {
                box-sizing: border-box;
                flex: 0 1 220px;
                padding: 14px 12px;
                border: none;
                border-radius: 12px 12px 0 0;
                background: var(--accent-soft);
                font: inherit;
                font-size: 14px;
                font-weight: 600;
                color: #6b3a3e;
                cursor: pointer;
                transition: background 0.15s ease;
            }
            .inv-tab:hover { background: #f8d6d6; }
            .inv-tab[aria-selected='true'] {
                background: #fff;
                color: var(--accent);
                font-weight: 700;
            }

            .inv-panel {
                box-sizing: border-box;
                padding: 24px;
                border-radius: 0 14px 14px 14px;
                background: #fff;
                box-shadow: var(--shadow);
            }
            /* widgets row will go above .inv-updated-row later */
            .inv-updated-row {
                display: flex;
                justify-content: flex-end;
            }
            .inv-updated {
                padding: 7px 14px;
                border-radius: 999px;
                background: var(--accent-faint);
                font-size: 13px;
                font-weight: 600;
                color: var(--accent);
            }

            .inv-matrix-box {
                margin-top: 16px;
                border-radius: 10px;
                overflow-x: auto;
            }
            .inv-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
                font-variant-numeric: tabular-nums;
            }
            .inv-table th,
            .inv-table td {
                padding: 14px 12px;
                border: none;
                border-bottom: 1px solid var(--line);
                text-align: center;
                white-space: nowrap;
            }
            .inv-table thead th {
                background: #f8f1f1;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.03em;
                color: var(--muted);
            }
            .inv-table tbody th {
                padding-left: 16px;
                text-align: left;
                font-weight: 600;
            }
            .inv-table tbody tr:hover { background: var(--accent-faint); }
            .inv-table td.inv-zero { color: #c3b6b8; }
            .inv-table .inv-total { font-weight: 700; }

            .inv-empty,
            .inv-placeholder {
                padding: 48px 16px;
                text-align: center;
                font-size: 14px;
                font-weight: 600;
                color: var(--muted);
            }
            `}</style>

            {!showDashboard && (
                <div className="inv-picker">
                <form className="inv-form" onSubmit={handleSubmit}>
                <label className="inv-label" htmlFor="facility">
                *Facility
                </label>

                <div className="inv-select-wrap">
                <select
                id="facility"
                className="inv-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={loadingList || facilities.length === 0}
                required
                >
                {loadingList && <option value="">Loading…</option>}
                {!loadingList && facilities.length === 0 && (
                    <option value="">No facilities found</option>
                )}
                {facilities.map((f) => (
                    <option key={f._id} value={f._id}>
                    {f.facilityName}
                    </option>
                ))}
                </select>

                <svg
                className="inv-chevron"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                >
                <polyline points="4 8 12 16 20 8" />
                </svg>
                </div>

                <button type="submit" className="inv-submit" disabled={!selectedId || loadingDetails}>
                {loadingDetails ? 'Loading…' : 'Submit'}
                </button>

                {error && (
                    <p className="inv-error" role="alert">
                    {error}
                    </p>
                )}
                </form>
                </div>
            )}

            {showDashboard && (
                <div className="inv-shell">
                <div className="inv-top">
                <div className="inv-facility-box">{facility.facilityName}</div>
                <button type="button" className="inv-change" onClick={handleChangeFacility}>
                Change facility
                </button>
                </div>

                <div className="inv-tabs" role="tablist" aria-label="Inventory sections">
                {TABS.map((tab) => (
                    <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={activeTab === tab.id}
                    aria-controls="inv-panel"
                    className="inv-tab"
                    onClick={() => setActiveTab(tab.id)}
                    >
                    {tab.label}
                    </button>
                ))}
                </div>

                <div className="inv-panel" id="inv-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
                {activeTab === 'overview' && (
                    <>
                    {/* Widgets row goes here later */}

                    <div className="inv-updated-row">
                    <div className="inv-updated">
                    Last updated: {lastUpdated ? formatDate(lastUpdated) : '—'}
                    </div>
                    </div>

                    <div className="inv-matrix-box">
                    {inventory.length === 0 ? (
                        <p className="inv-empty">No inventory records for this facility yet.</p>
                    ) : (
                        <table className="inv-table">
                        <thead>
                        <tr>
                        <th scope="col" aria-label="Component" />
                        {BLOOD_TYPES.map((t) => (
                            <th key={t} scope="col">
                            {t}
                            </th>
                        ))}
                        <th scope="col" className="inv-total">
                        TOTAL
                        </th>
                        </tr>
                        </thead>
                        <tbody>
                        {COMPONENTS.map((c) => {
                            const total = BLOOD_TYPES.reduce((sum, t) => sum + matrix[c][t], 0);
                            return (
                                <tr key={c}>
                                <th scope="row">{c}</th>
                                {BLOOD_TYPES.map((t) => (
                                    <td key={t} className={matrix[c][t] === 0 ? 'inv-zero' : ''}>
                                    {cell(matrix[c][t])}
                                    </td>
                                ))}
                                <td className={`inv-total ${total === 0 ? 'inv-zero' : ''}`}>
                                {cell(total)}
                                </td>
                                </tr>
                            );
                        })}
                        </tbody>
                        </table>
                    )}
                    </div>
                    </>
                )}

                {activeTab === 'update' && <p className="inv-placeholder">View &amp; Update coming soon.</p>}
                {activeTab === 'history' && <p className="inv-placeholder">Update History coming soon.</p>}
                </div>
                </div>
            )}
            </div>
    );
}

export default Inventory;
