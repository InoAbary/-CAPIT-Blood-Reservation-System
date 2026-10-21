import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
    const navigate = useNavigate();
    const [loggingOut, setLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState('');

    async function handleLogout() {
        if (loggingOut) return;
        setLoggingOut(true);
        setLogoutError('');
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${API_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Logout failed. Please try again.');
            navigate('/logintest', { replace: true });
        } catch (error) {
            setLogoutError(error.message || 'Unable to log out.');
        } finally {
            setLoggingOut(false);
        }
    }

    return (
        <main className="dashboard-page">
        <div className="dashboard-container">
        <header className="dashboard-header">
        <div className="dashboard-brand"><span className="dashboard-brand-icon">✚</span> BLOOD RESERVATION SYSTEM</div>
        <div className="dashboard-header-actions">
        <span className="dashboard-tag">Dashboard</span>
        <button type="button" className="dashboard-logout" onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? 'Logging out…' : 'Log out'}
        </button>
        </div>
        </header>

        {logoutError && <p className="dashboard-logout-error" role="alert">{logoutError}</p>}
        <section className="dashboard-welcome">
        <p className="dashboard-eyebrow">WELCOME BACK</p>
        <h1>What would you like to do?</h1>
        <p>Select a section below to continue.</p>
        </section>

        <section className="dashboard-grid" aria-label="Dashboard navigation">
        <button type="button" className="dashboard-card" onClick={() => navigate('/BloodBankMap')}>
        <span className="dashboard-card-icon" aria-hidden="true">⌖</span>
        <span className="dashboard-card-title">Blood Bank Map</span>
        <span className="dashboard-card-desc">View blood bank locations on the map.</span>
        <span className="dashboard-card-link">Open map <span aria-hidden="true">→</span></span>
        </button>
        <button type="button" className="dashboard-card" onClick={() => navigate('/Inventory')}>
        <span className="dashboard-card-icon" aria-hidden="true">▤</span>
        <span className="dashboard-card-title">Inventory Management</span>
        <span className="dashboard-card-desc">View and manage blood inventory.</span>
        <span className="dashboard-card-link">Open inventory <span aria-hidden="true">→</span></span>
        </button>
        </section>
        </div>
        </main>
    );
}
