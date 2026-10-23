
import React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import '../styles/Register.css';

function LoginSuccess() {
    const { state } = useLocation();
    const email = state?.email;
    const firstName = state?.firstName;

    if (!state) return <Navigate to="/Login" replace />

    return (
        <div className="register-page">
            <div className="register-success-card">
                <div className="register-success-icon" aria-hidden="true">✓</div>

                
                <p>
                    User {firstName} has logged in successfully.
                </p>
                

                
            </div>
        </div>
    );
}

export default LoginSuccess;