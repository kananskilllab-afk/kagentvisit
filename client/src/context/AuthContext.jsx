import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

// Global loading spinner shown during initial auth check
const AppLoader = () => (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <div className="w-12 h-12 rounded-2xl bg-brand-navy flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-6 h-6 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
        </div>
        <p className="text-sm font-semibold text-slate-500">Loading…</p>
    </div>
);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUserLoggedIn();
    }, []);

    const checkUserLoggedIn = async () => {
        try {
            const { data } = await api.get('/auth/me');
            if (data.success) setUser(data.data);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        if (data.success) setUser(data.data);
        return data;
    };

    const logout = async () => {
        try { await api.post('/auth/logout'); } catch { /* ignore */ }
        setUser(null);
        window.location.href = '/login';
    };

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    const isSuperAdmin = user?.role === 'superadmin';

    if (loading) return <AppLoader />;

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, checkUserLoggedIn, isAdmin, isSuperAdmin }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
