import React, { useState, useEffect } from 'react';

// Set REACT_APP_API_URL (CRA) or VITE_API_URL (Vite) if the API is on another origin.
const API_URL =
(typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
'http://localhost:3000';

const TYPE_LABELS = {
    bsf: 'BSF',
    hospital: 'Hospital',
    'blood bank': 'Blood bank',
    'donation center': 'Donation center',
};

function Inventory() {
    const [facilities, setFacilities] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [facility, setFacility] = useState(null);
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
        setFacility(null);
        setLoadingDetails(true);

        try {
            const res = await fetch(`${API_URL}/api/facilities/${selectedId}`);
            const body = await res.json();
            if (!res.ok) throw new Error(body.message || 'Could not load facility.');
            setFacility(body);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingDetails(false);
        }
    };

    return (
        <div className="inv-page">
        <style>{`
            .inv-page {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #fff;
                font-family: 'Public Sans', 'Segoe UI', Arial, sans-serif;
            }
            .inv-form {
                width: 100%;
                max-width: 260px;
                padding: 24px 20px;
                box-sizing: content-box;
            }
            .inv-label {
                display: block;
                margin-bottom: 8px;
                font-size: 14px;
                font-weight: 600;
                color: #111;
            }
            .inv-select-wrap { position: relative; }
            .inv-select {
                appearance: none;
                -webkit-appearance: none;
                width: 100%;
                height: 40px;
                padding: 0 40px 0 12px;
                border: none;
                border-radius: 0;
                background: #c8d0da;
                font: inherit;
                font-size: 14px;
                font-weight: 700;
                color: #111;
                cursor: pointer;
            }
            .inv-select:disabled { cursor: not-allowed; opacity: 0.7; }
            .inv-select:focus-visible,
            .inv-submit:focus-visible {
                outline: 2px solid #111;
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
            }
            .inv-submit {
                display: block;
                margin: 20px auto 0;
                padding: 8px 34px;
                border: 1.5px solid #111;
                border-bottom-width: 4px;
                border-radius: 999px;
                background: #fff;
                font: inherit;
                font-size: 14px;
                font-weight: 700;
                color: #111;
                cursor: pointer;
                transition: transform 0.08s ease, border-bottom-width 0.08s ease;
            }
            .inv-submit:disabled { opacity: 0.5; cursor: not-allowed; }
            .inv-submit:not(:disabled):active {
                transform: translateY(2px);
                border-bottom-width: 2px;
            }
            .inv-error {
                margin-top: 16px;
                font-size: 13px;
                font-weight: 600;
                color: #b3261e;
            }
            .inv-details {
                margin: 24px 0 0;
                padding-top: 16px;
                border-top: 1.5px solid #111;
                font-size: 14px;
                color: #111;
            }
            .inv-details dt {
                margin-top: 12px;
                font-size: 12px;
                font-weight: 600;
                color: #55606e;
            }
            .inv-details dd {
                margin: 2px 0 0;
                font-weight: 700;
                word-break: break-word;
            }
            .inv-details .inv-name { font-size: 16px; }
            .inv-status {
                display: inline-block;
                padding: 2px 10px;
                border-radius: 999px;
                background: #c8d0da;
                font-size: 12px;
            }
            .inv-status.inactive { background: #f1d3d0; }
            `}</style>

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
            stroke="#111"
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

            {facility && (
                <dl className="inv-details" aria-live="polite">
                <dd className="inv-name">{facility.facilityName}</dd>

                <dt>Type</dt>
                <dd>{TYPE_LABELS[facility.facilityType] || facility.facilityType}</dd>

                <dt>Address</dt>
                <dd>{facility.address}</dd>

                <dt>Contact number</dt>
                <dd>{facility.contactNumber}</dd>

                <dt>Status</dt>
                <dd>
                <span className={`inv-status ${facility.isActive ? '' : 'inactive'}`}>
                {facility.isActive ? 'Active' : 'Inactive'}
                </span>
                </dd>
                </dl>
            )}
            </form>
            </div>
    );
}

export default Inventory;
