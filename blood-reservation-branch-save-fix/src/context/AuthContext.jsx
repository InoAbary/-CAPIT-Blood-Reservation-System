import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [donor, setDonor] = useState(null);
    const [staff, setStaff] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                // Both endpoints are role-scoped server-side — safe to fire both
                const [donorRes, staffRes] = await Promise.all([
                    fetch('/api/auth/me', { credentials: 'include' }),
                    fetch('/api/auth/me/staff', { credentials: 'include' }),
                ]);

                if (cancelled) return;

                setDonor(donorRes.ok ? (await donorRes.json()).user : null);
                setStaff(staffRes.ok ? (await staffRes.json()).user : null);
            } catch {
                if (!cancelled) { setDonor(null); setStaff(null); }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    const loginDonor = async (email, password) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || body.error || 'Login failed');

        const me = await fetch('/api/auth/me', { credentials: 'include' });
        const { user } = await me.json();
        if (!user) throw new Error('Profile fetch failed');
        setDonor(user);
        return user;
    };

    const loginStaff = async (email, password) => {
        const res = await fetch('/api/auth/login/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || body.error || 'Login failed');

        const me = await fetch('/api/auth/me/staff', { credentials: 'include' });
        const { user } = await me.json();
        if (!user) throw new Error('Profile fetch failed');
        setStaff(user);
        return user;
    };

    const logoutDonor = async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        setDonor(null);
    };

    const logoutStaff = async () => {
        await fetch('/api/auth/logout/staff', { method: 'POST', credentials: 'include' });
        setStaff(null);
    };

    return (
        <AuthContext.Provider
            value={{ donor, staff, loading, loginDonor, loginStaff, logoutDonor, logoutStaff }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}