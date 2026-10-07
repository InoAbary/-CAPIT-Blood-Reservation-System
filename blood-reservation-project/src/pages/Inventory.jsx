import React, { useState, useEffect } from 'react';
import BloodUnitsTab from '../components/inventory/BloodUnitsTab';
import InventoryOverview from '../components/inventory/InventoryOverview';
import './Inventory.css';

// Set REACT_APP_API_URL (CRA) or VITE_API_URL (Vite) if the API is somewhere else.
const API_URL =
(typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
(typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
'http://localhost:3000';

const TABS = [
    { id: 'overview', label: 'Inventory Overview' },
{ id: 'update', label: 'View & Update' },
{ id: 'history', label: 'Update History' },
];

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

    const handleInventoryUpdated = (updatedRecords) => {
        setInventory((currentInventory) =>
            currentInventory.map((item) => {
                const updatedItem = updatedRecords.find(
                    (updated) => updated._id === item._id
                );
    
                return updatedItem || item;
            })
        );
    };

    const showDashboard = facility && inventory;

    return (
        <div className="inv-page">
    
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
                
                <div className="inv-header">

                    <div className="inv-heading">
                        <h1>Blood Inventory</h1>

                        <p>
                            Monitor and manage blood stock.
                        </p>
                    </div>


                    <div className="inv-facility-card">

                        <div className="inv-facility-info">

                            <div className="inv-facility-heading">

                                <h2>{facility.facilityName}</h2>

                                {facility.facilityType && (
                                    <span className="inv-facility-type">
                                        {facility.facilityType.toUpperCase()}
                                    </span>
                                )}

                            </div>


                            <p className="inv-facility-address">
                                {facility.address}
                            </p>


                            {facility.facilityID && (
                                <p className="inv-facility-id">
                                    Facility ID: {facility.facilityID}
                                </p>
                            )}

                        </div>


                        <button
                            type="button"
                            className="inv-change"
                            onClick={handleChangeFacility}
                        >
                            Change Facility
                        </button>

                    </div>

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
                    <InventoryOverview inventory={inventory} />
                )}
                    {activeTab === 'update' &&
                (
                    <BloodUnitsTab facilityID={selectedId}/>
                )
                 }


                {activeTab === 'history' && <p className="inv-placeholder">Update History coming soon.</p>}
                </div>
                </div>
            )}
            </div>
    );
}

export default Inventory;
