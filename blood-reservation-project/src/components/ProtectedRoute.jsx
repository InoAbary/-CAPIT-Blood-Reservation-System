import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {useAuth} from '../context/AuthContext';

export default function ProtectedRoute({children, require: required = 'any', allowedRoles}) {
    const { donor, staff, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div style={{padding: 24}}>Checking session...</div>
    }

    const isDonor = !!donor && (required === 'donor' || required === 'any');
    const isStaff = !!staff && (required === 'staff' || required === 'any');

    if (!isDonor && !isStaff) {
        const loginPath = required === 'staff' ? '/Login/Staff' : '/Login';
        return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
    }

    const activeUser = required === 'staff' ? staff : required === 'donor' ? donor : (staff || donor);

    if (allowedRoles && !allowedRoles.includes(activeUser.role)) {
        const home = staff ? '/StaffDashboard' : '/DonorDashboard';
        return <Navigate to={home} replace />;
    }

    return children;
}