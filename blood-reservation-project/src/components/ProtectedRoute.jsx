import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {useAuth} from '../context/AuthContext';

export default function ProtectedRoute({children, allowedRoles}) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div style={{padding: 24}}>Checking session...</div>
    }

    if (!user) {
        return <Navigate to="/Login" replace state={{ from: location.pathname}} />
    }

    if (allowedRoles && !allowedRoles.includes(user.role)){
        return <Navigate to="/DonorDashboard" replace />
    }

    return children;
}