import React, {createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null)

export function AuthProvider({children}){

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        (async() => {
            try {
                const res = await fetch('/api/auth/me', {credentials: 'include'})
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) setUser(data.user);
                } else {
                    if (!cancelled) setUser(null);
                }
            } catch {
                if (!cancelled) setUser(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true }
    }, [])

    const login = async (email, password, role = 'donor') => {
        const url = role === 'donor' ? '/api/auth/login' : '/api/auth/login/staff';
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
        })
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || body.error || 'Login failed');

        const meUrl = role === 'donor' && '/api/auth/me' || '/api/auth/me/staff'

        const me = await fetch(meUrl, { credentials: 'include' });
        const meData = await me.json();
        setUser(meData.user);
        return meData.user;
    }

    const logout = async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
        {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx
}