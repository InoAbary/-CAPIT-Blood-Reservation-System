// src/pages/RegisterSuccess.jsx
import React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import '../styles/Register.css';

function RegisterSuccess() {
    const { state } = useLocation();
    const email = state?.email;

    if (!state) return <Navigate to="/Register" replace />

    return (
        <div className="register-page">
            <div className="register-success-card">
                <div className="register-success-icon" aria-hidden="true">✓</div>

                <h1>Registration Successful</h1>
                <p>
                    Thank you for signing up{email ? <> — a confirmation was sent to <strong>{email}</strong></> : null}.
                </p>
                <p>Your donor account is ready to use.</p>

                <div className="register-actions">
                    <Link to="/login" className="register-submit-btn">
                        Go to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default RegisterSuccess;