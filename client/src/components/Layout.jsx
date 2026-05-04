import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorBoundary from './ErrorBoundary';
import {
    LayoutDashboard, PlusCircle, Users, BarChart3,
    Settings, LogOut, Menu, X, User as UserIcon,
    ChevronRight, List, Building2, Receipt, FileText, CalendarDays, ClipboardList
} from 'lucide-react';
import { NotifBell } from '../design';

const SidebarLink = ({ icon: Icon, label, path, active, onClick }) => (
    <Link
        to={path}
        onClick={onClick}
        className={`group relative flex items-center gap-3 rounded-lg pl-4 pr-3 py-2.5 text-[13px] font-semibold tracking-tight transition-all duration-200 ${
            active
                ? 'bg-white/[0.08] text-white'
                : 'text-white/65 hover:bg-white/[0.04] hover:text-white'
        }`}
    >
        <span
            aria-hidden="true"
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200 ${
                active
                    ? 'h-7 bg-gradient-to-b from-brand-gold to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                    : 'h-0 bg-white/0 group-hover:h-4 group-hover:bg-white/20'
            }`}
        />
        <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-200 ${
                active
                    ? 'bg-gradient-to-br from-brand-gold/25 to-amber-500/10 text-brand-gold ring-1 ring-brand-gold/25'
                    : 'text-white/60 group-hover:bg-white/[0.06] group-hover:text-white'
            }`}
        >
            <Icon className="w-[15px] h-[15px]" strokeWidth={2.2} />
        </span>
        <span className="flex-1 truncate">{label}</span>
        {active && <ChevronRight className="w-3.5 h-3.5 text-brand-gold/70" />}
    </Link>
);

const RolePill = ({ role }) => {
    const styles = {
        superadmin:   'bg-brand-purple/20 text-purple-300',
        admin:        'bg-brand-sky/20 text-sky-300',
        home_visit:   'bg-brand-orange/20 text-orange-300',
        user:         'bg-brand-lime/20 text-lime-300',
        accounts:     'bg-brand-gold/20 text-yellow-300',
        regional_bdm: 'bg-brand-green/20 text-green-300',
    };
    const labels = { superadmin: 'Super Admin', admin: 'Admin', home_visit: 'Field Officer', user: 'User', accounts: 'Accounts', regional_bdm: 'Regional BDM' };
    return (
        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${styles[role] || styles.user}`}>
            {labels[role] || role}
        </span>
    );
};

// Defined OUTSIDE Layout so its reference is stable — prevents unmount/remount on route change
// CSS filter that flips the brand-colored PNG to pure white. `brightness(0)` collapses
// all color to black, then `invert(1)` lifts it to white — preserves the alpha channel
// so the logo silhouette stays clean against the dark sidebar.
const WHITE_LOGO_FILTER = { filter: 'brightness(0) invert(1)' };
const KANAN_LOGO_SRC = '/kanan-logo.png';

// Compact mark — used in the collapsed icon rail.
const BrandMark = ({ onClick }) => (
    <Link
        to="/"
        onClick={onClick}
        aria-label="Kanan.co dashboard"
        className="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-white"
    >
        <img
            src={KANAN_LOGO_SRC}
            alt=""
            aria-hidden="true"
            style={WHITE_LOGO_FILTER}
            className="h-9 w-9 object-contain transition-transform duration-200 group-hover:scale-105"
        />
    </Link>
);

// Full brand block — used in the expanded sidebar and mobile topbar.
const BrandLogo = ({ small = false, onClick }) => (
    <Link
        to="/"
        onClick={onClick}
        aria-label="Kanan.co dashboard"
        className={`group relative flex items-center justify-start rounded-xl transition-all duration-200 focus-visible:outline-white ${
            small ? 'py-1' : 'py-1.5'
        }`}
    >
        <img
            src={KANAN_LOGO_SRC}
            alt="Kanan.co"
            style={WHITE_LOGO_FILTER}
            className={`object-contain object-left transition-transform duration-200 group-hover:scale-[1.02] ${
                small ? 'h-7' : 'h-10'
            }`}
        />
    </Link>
);

const Sidebar = ({ menuItems, isActive, user, logout, onClose }) => (
    <div className="relative flex flex-col h-full bg-gradient-to-b from-meridian-navy via-[#1B1842] to-[#15102F] text-white overflow-hidden">
        {/* Ambient accent glow */}
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_50%_-20%,rgba(245,158,11,0.10),transparent_60%)]"
        />
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"
        />

        {/* Logo */}
        <div className="relative shrink-0 px-4 pt-5 pb-4">
            <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                    <BrandLogo onClick={onClose} />
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        aria-label="Close menu"
                        className="shrink-0 rounded-lg p-2 text-white/60 transition-all hover:bg-white/[0.08] hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>

        <div aria-hidden="true" className="relative mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Nav */}
        <nav className="relative flex-1 px-3 py-5 space-y-0.5 overflow-y-auto no-scrollbar">
            <p className="px-4 mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                Workspace
            </p>
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
        <div className="relative shrink-0 p-3">
            <div className="rounded-xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-sm overflow-hidden">
                <Link
                    to="/profile"
                    onClick={onClose}
                    className="flex items-center gap-3 p-2.5 transition-all hover:bg-white/[0.04]"
                >
                    <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-brand-gold via-amber-400 to-orange-500 ring-1 ring-white/20 shadow-md shadow-amber-500/20 flex items-center justify-center text-white font-black text-sm shrink-0">
                        <span className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-white/30 to-transparent" />
                        <span className="relative drop-shadow-sm">{user?.name?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-white truncate leading-tight">{user?.name}</p>
                        <div className="mt-1">
                            <RolePill role={user?.role} />
                        </div>
                    </div>
                </Link>
                <div aria-hidden="true" className="h-px bg-white/10" />
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[12px] font-bold text-white/60 hover:bg-red-500/10 hover:text-red-200 transition-all"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                </button>
            </div>
        </div>
    </div>
);

const IconRail = ({ menuItems, isActive }) => (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[72px] flex-col items-center bg-gradient-to-b from-meridian-navy via-[#1B1842] to-[#15102F] py-4 text-white shadow-sidebar md:flex lg:hidden">
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_50%_-30%,rgba(245,158,11,0.12),transparent_60%)]"
        />
        <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"
        />
        <div className="relative mb-4">
            <BrandMark />
        </div>
        <div aria-hidden="true" className="relative mx-2 mb-3 h-px w-10 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <nav className="relative flex flex-1 flex-col items-center gap-1 overflow-y-auto no-scrollbar w-full px-2">
            {menuItems.map(item => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                    <Link
                        key={item.path}
                        to={item.path}
                        title={item.label}
                        aria-label={item.label}
                        className={`group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
                            active
                                ? 'bg-white/[0.08] text-brand-gold ring-1 ring-brand-gold/25'
                                : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                        }`}
                    >
                        <span
                            aria-hidden="true"
                            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200 ${
                                active
                                    ? 'h-6 bg-gradient-to-b from-brand-gold to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.55)]'
                                    : 'h-0 group-hover:h-3 group-hover:bg-white/20'
                            }`}
                        />
                        <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                    </Link>
                );
            })}
        </nav>
    </aside>
);

const Layout = () => {
    const { user, logout, isAdmin } = useAuth();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isB2C      = user?.department === 'B2C' || user?.role === 'home_visit';
    const isAccounts = user?.role === 'accounts';
    const hasFormAccess = (key) => user?.formAccess?.includes(key);
    const hasB2BVisitAccess = hasFormAccess('b2b_visit');
    const hasB2CVisitAccess = hasFormAccess('b2c_visit');
    const hasAssignedVisitForm = hasB2BVisitAccess || hasB2CVisitAccess;
    const canViewB2BVisits = user?.role === 'superadmin' || user?.department === 'B2B' || hasB2BVisitAccess;
    const canViewB2CVisits = user?.role === 'superadmin' || isB2C || hasB2CVisitAccess;
    const preferredVisitFormType =
        hasB2CVisitAccess && !hasB2BVisitAccess ? 'home_visit' :
        hasB2BVisitAccess && !hasB2CVisitAccess ? 'generic' :
        isB2C ? 'home_visit' : 'generic';
    const newVisitPath = `/new-visit?formType=${preferredVisitFormType}`;

    const isActive = (path) => {
        const fullPath = location.pathname + location.search;
        if (path === '/') return location.pathname === '/' && !location.search;
        return fullPath.startsWith(path.split('?')[0]) && (!path.includes('?') || fullPath === path);
    };

    const menuItems = [
        { label: 'Dashboard',        icon: LayoutDashboard, path: '/',                      roles: ['user','admin','superadmin','home_visit','accounts','regional_bdm'] },
        { label: 'Calendar',          icon: CalendarDays,    path: '/calendar',              roles: ['user','admin','superadmin','home_visit'] },
        { label: 'Expenses',          icon: Receipt,         path: '/expenses',              roles: ['user','admin','superadmin','home_visit','accounts'] },
        { label: 'Claims',            icon: FileText,        path: '/expenses/claims',       roles: ['user','admin','superadmin','home_visit','accounts'] },
        { label: 'Expense Analytics', icon: BarChart3,       path: '/expenses/analytics',    roles: ['admin','superadmin','accounts'] },
        ...(isAdmin ? [
            ...(canViewB2BVisits ? [
                { label: 'B2B Visits',  icon: List, path: '/visits?formType=generic',    roles: ['admin','superadmin'] },
            ] : []),
            ...(canViewB2CVisits ? [
                { label: 'Home Visits', icon: List, path: '/visits?formType=home_visit', roles: ['admin','superadmin'] },
            ] : []),
            ...(hasAssignedVisitForm ? [
                { label: 'Visit History', icon: List, path: '/visits', roles: ['admin','superadmin'] },
                { label: 'New Visit', icon: PlusCircle, path: newVisitPath, roles: ['admin','superadmin'] },
            ] : []),
            { label: 'Manage Agent',  icon: Building2,   path: '/agents',      roles: ['admin','superadmin'] },
            { label: 'Form Reports',  icon: ClipboardList, path: '/forms-admin', roles: ['admin','superadmin'] },
        ] : isAccounts ? [] : [
            // Visit History always visible — users may have visits assigned to them regardless of formAccess
            { label: 'Visit History', icon: List, path: '/visits', roles: ['user','home_visit','regional_bdm','hod'] },
            // New Visit only shown when user has B2B/B2C visit form access (or no formAccess restriction at all)
            ...(!user?.formAccess?.length || hasFormAccess('b2b_visit') || hasFormAccess('b2c_visit') ? [
                { label: 'New Visit', icon: PlusCircle, path: newVisitPath, roles: ['user','home_visit','regional_bdm'] },
            ] : []),
        ]),
        { label: 'Forms',     icon: ClipboardList, path: '/forms',       roles: ['user','admin','superadmin','home_visit','accounts','regional_bdm'] },
        { label: 'Analytics', icon: BarChart3,     path: '/analytics',   roles: ['admin','superadmin'] },
        { label: 'Users',     icon: Users,         path: '/users',       roles: ['superadmin'] },
        { label: 'Form Builder', icon: Settings,   path: '/form-builder', roles: ['superadmin'] },
    ].filter(item => item.roles.includes(user?.role));

    return (
        <div className="min-h-screen flex bg-meridian-bg">

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-[236px] flex-col fixed left-0 top-0 h-screen z-30">
                <div className="h-full w-full shadow-sidebar overflow-hidden">
                    <Sidebar
                        menuItems={menuItems}
                        isActive={isActive}
                        user={user}
                        logout={logout}
                    />
                </div>
            </aside>

            <IconRail menuItems={menuItems} isActive={isActive} />

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile drawer */}
            <aside className={`md:hidden fixed left-0 top-0 h-screen w-72 z-50 shadow-sidebar transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Sidebar
                    menuItems={menuItems}
                    isActive={isActive}
                    user={user}
                    logout={logout}
                    onClose={() => setMobileOpen(false)}
                />
            </aside>

            {/* Mobile Topbar */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-meridian-navy border-b border-white/10 z-30 flex items-center justify-between px-4 shadow-sm">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 rounded-xl text-white hover:bg-white/10 transition-all"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div className="w-40">
                    <BrandLogo small />
                </div>
                <Link to="/profile" className="p-2 rounded-xl text-white hover:bg-white/10 transition-all">
                    <UserIcon className="w-5 h-5" />
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex-1 md:ml-[72px] lg:ml-[236px] min-h-screen">
                <header className="hidden md:flex h-[58px] sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-meridian-border items-center justify-between px-6 lg:px-8">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-meridian-sub">Workspace</p>
                        <p className="text-sm font-bold text-meridian-text">{user?.department || user?.role || 'Team'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotifBell count={0} />
                        <Link to="/profile" className="flex items-center gap-2 rounded-lg border border-meridian-border px-3 py-2 text-xs font-bold text-meridian-text hover:bg-meridian-bg">
                            <UserIcon className="w-4 h-4 text-meridian-blue" />
                            {user?.name}
                        </Link>
                    </div>
                </header>
                <div
                    key={location.pathname}
                    className="page-transition max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 pt-20 md:pt-6 w-full transition-all duration-300"
                >
                    <ErrorBoundary key={location.pathname}>
                        <Outlet />
                    </ErrorBoundary>
                </div>
            </main>
        </div>
    );
};

export default Layout;
