import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorBoundary from './ErrorBoundary';
import {
    LayoutDashboard, PlusCircle, Users, BarChart3,
    Settings, LogOut, Menu, X, User as UserIcon,
    ChevronRight, List, Bell, Building2, Receipt, FileText, CalendarDays
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
        accounts:   'bg-brand-gold/20 text-yellow-300',
    };
    const labels = { superadmin: 'Super Admin', admin: 'Admin', home_visit: 'Field Officer', user: 'User', accounts: 'Accounts' };
    return (
        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${styles[role] || styles.user}`}>
            {labels[role] || role}
        </span>
    );
};

const Layout = () => {
    const { user, logout, isAdmin, isSuperAdmin } = useAuth();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isB2C      = user?.department === 'B2C' || user?.role === 'home_visit';
    const isAccounts = user?.role === 'accounts';

    const isActive = (path) => {
        const fullPath = location.pathname + location.search;
        if (path === '/') return location.pathname === '/' && !location.search;
        return fullPath.startsWith(path.split('?')[0]) && (!path.includes('?') || fullPath === path);
    };

    const menuItems = [
        { label: 'Dashboard',    icon: LayoutDashboard, path: '/',         roles: ['user','admin','superadmin','home_visit','accounts'] },
        { label: 'Calendar',      icon: CalendarDays,   path: '/calendar',         roles: ['user','admin','superadmin','home_visit'] },
        { label: 'Expenses',      icon: Receipt,        path: '/expenses',             roles: ['user','admin','superadmin','home_visit','accounts'] },
        { label: 'Claims',        icon: FileText,       path: '/expenses/claims',      roles: ['user','admin','superadmin','home_visit','accounts'] },
        { label: 'Expense Analytics', icon: BarChart3,  path: '/expenses/analytics',   roles: ['admin','superadmin','accounts'] },
        ...(isAdmin ? [
            ...(user.role === 'superadmin' || user.department === 'B2B' ? [
                { label: 'B2B Visits',    icon: List, path: '/visits?formType=generic',     roles: ['admin','superadmin'] },
            ] : []),
            ...(user.role === 'superadmin' || isB2C ? [
                { label: 'Home Visits',   icon: List, path: '/visits?formType=home_visit',  roles: ['admin','superadmin'] },
            ] : []),
            { label: 'Manage Agent',  icon: Building2,      path: '/agents',       roles: ['admin', 'superadmin'] },
        ] : isAccounts ? [] : [
            { label: 'New Visit',     icon: PlusCircle, path: '/new-visit', roles: ['user','home_visit'] },
            { label: 'Visit History', icon: List,       path: '/visits',    roles: ['user','home_visit'] },
        ]),
        { label: 'Analytics',     icon: BarChart3,      path: '/analytics',    roles: ['admin','superadmin'] },
        { label: 'Users',         icon: Users,          path: '/users',        roles: ['superadmin'] },
        { label: 'Form Builder',  icon: Settings,       path: '/form-builder', roles: ['superadmin'] },
    ].filter(item => item.roles.includes(user?.role));

    const Sidebar = ({ onClose }) => (
        <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl border-r border-slate-200/50">
            {/* Logo */}
            <div className="px-6 py-8">
                <div className="flex items-center justify-between">
                    <img src="/logo.png" alt="Kanan" className="h-10 w-auto object-contain" />
                    {onClose && (
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100/50 text-slate-400 hover:text-slate-600 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto no-scrollbar">
                <p className="px-4 mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Navigation</p>
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
            <div className="p-4 m-4 rounded-3xl bg-slate-50/50 border border-slate-100/60 backdrop-blur-sm space-y-2">
                <Link
                    to="/profile"
                    onClick={onClose}
                    className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white transition-all group"
                >
                    <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold text-sm shrink-0 ring-2 ring-brand-blue/5">
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
                        <RolePill role={user?.role} />
                    </div>
                </Link>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex bg-transparent">

            {/* Desktop Sidebar - Detached floating effect */}
            <aside className="hidden lg:flex w-72 flex-col fixed left-0 top-0 h-screen z-30 p-4">
                <div className="h-full w-full rounded-[2rem] shadow-glass overflow-hidden">
                    <Sidebar />
                </div>
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
            <main className="flex-1 lg:ml-72 min-h-screen">
                <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 pt-20 lg:pt-8 w-full transition-all duration-300">
                    <ErrorBoundary key={location.pathname}>
                        <Outlet />
                    </ErrorBoundary>
                </div>
            </main>
        </div>
    );
};

export default Layout;
