import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorBoundary from './ErrorBoundary';
import {
    LayoutDashboard, PlusCircle, Users, BarChart3,
    Settings, LogOut, Menu, X, User as UserIcon,
    ChevronRight, List, Bell, Building2
} from 'lucide-react';

const SidebarLink = ({ icon: Icon, label, path, active, onClick }) => (
    <Link
        to={path}
        onClick={onClick}
        className={`sidebar-link ${active ? 'active' : ''}`}
    >
        <span className={`p-1.5 rounded-lg transition-all ${active ? 'bg-white/20' : 'group-hover:bg-white/10'}`}>
            <Icon className="w-4 h-4" />
        </span>
        <span className="flex-1">{label}</span>
        {active && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
    </Link>
);

const RolePill = ({ role }) => {
    const styles = {
        superadmin: 'bg-brand-purple/20 text-purple-300',
        admin:      'bg-brand-sky/20 text-sky-300',
        home_visit: 'bg-brand-orange/20 text-orange-300',
        user:       'bg-brand-lime/20 text-lime-300',
    };
    const labels = { superadmin: 'Super Admin', admin: 'Admin', home_visit: 'Field Officer', user: 'User' };
    return (
        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${styles[role] || styles.user}`}>
            {labels[role] || role}
        </span>
    );
};

const Layout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isAdmin   = user.role === 'admin' || user.role === 'superadmin';
    const isB2C     = user.department === 'B2C' || user.role === 'home_visit';

    const isActive = (path) => {
        const fullPath = location.pathname + location.search;
        if (path === '/') return location.pathname === '/' && !location.search;
        return fullPath.startsWith(path.split('?')[0]) && (!path.includes('?') || fullPath === path);
    };

    const menuItems = [
        { label: 'Dashboard',    icon: LayoutDashboard, path: '/',         roles: ['user','admin','superadmin','home_visit'] },
        ...(isAdmin ? [
            ...(user.role === 'superadmin' || user.department === 'B2B' ? [
                { label: 'B2B Visits',    icon: List, path: '/visits?formType=generic',     roles: ['admin','superadmin'] },
            ] : []),
            ...(user.role === 'superadmin' || isB2C ? [
                { label: 'Home Visits',   icon: List, path: '/visits?formType=home_visit',  roles: ['admin','superadmin'] },
            ] : []),
            { label: 'Manage Agent',  icon: Building2,      path: '/agents',       roles: ['admin', 'superadmin'] },
        ] : [
            { label: 'New Visit',     icon: PlusCircle, path: '/new-visit', roles: ['user','home_visit'] },
            { label: 'Visit History', icon: List,       path: '/visits',    roles: ['user','home_visit'] },
        ]),
        { label: 'Analytics',     icon: BarChart3,      path: '/analytics',    roles: ['admin','superadmin'] },
        { label: 'Users',         icon: Users,          path: '/users',        roles: ['superadmin'] },
        { label: 'Form Builder',  icon: Settings,       path: '/form-builder', roles: ['superadmin'] },
    ].filter(item => item.roles.includes(user.role));

    const Sidebar = ({ onClose }) => (
        <div className="flex flex-col h-full bg-sidebar-gradient">
            {/* Logo */}
            <div className="px-5 py-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <img src="/logo.png" alt="Kanan" className="h-9 w-auto object-contain brightness-0 invert" />
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto no-scrollbar">
                <p className="px-3 mb-3 text-[9px] font-bold uppercase tracking-widest text-white/30">Navigation</p>
                {menuItems.map(item => (
                    <SidebarLink
                        key={item.path}
                        {...item}
                        active={isActive(item.path)}
                        onClick={onClose}
                    />
                ))}
            </nav>

            {/* User Footer */}
            <div className="px-3 py-4 border-t border-white/10 space-y-1">
                <Link
                    to="/profile"
                    onClick={onClose}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all group"
                >
                    <div className="w-9 h-9 rounded-xl bg-brand-gold/20 flex items-center justify-center text-brand-gold font-bold text-sm shrink-0 ring-2 ring-brand-gold/20">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                        <RolePill role={user.role} />
                    </div>
                </Link>
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-page)' }}>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 xl:w-72 flex-col fixed left-0 top-0 h-screen z-30 shadow-sidebar">
                <Sidebar />
            </aside>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile drawer */}
            <aside className={`lg:hidden fixed left-0 top-0 h-screen w-72 z-50 shadow-sidebar transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Sidebar onClose={() => setMobileOpen(false)} />
            </aside>

            {/* Mobile Topbar */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-100 z-30 flex items-center justify-between px-4 shadow-sm">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <img src="/logo.png" alt="Kanan" className="h-7 w-auto object-contain" />
                <Link to="/profile" className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all">
                    <UserIcon className="w-5 h-5" />
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 xl:ml-72 min-h-screen">
                <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 pt-20 lg:pt-8">
                    <ErrorBoundary key={location.pathname}>
                        <Outlet />
                    </ErrorBoundary>
                </div>
            </main>
        </div>
    );
};

export default Layout;
