import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
    FileText, Plus, Search, X, Loader2, IndianRupee,
    Clock, CheckCircle2, XCircle, AlertTriangle, Eye,
    Receipt, Banknote, ArrowLeft, Filter, SlidersHorizontal,
    ChevronDown, ChevronUp, ShieldCheck, ShieldAlert, ShieldX,
    BarChart3, User as UserIcon, ChevronRight
} from 'lucide-react';

const STATUS_CFG = {
    draft:               { label: 'Draft',              icon: FileText,       bg: 'bg-slate-50',   text: 'text-slate-500',       ring: 'ring-slate-200' },
    submitted:           { label: 'Submitted',          icon: Clock,          bg: 'bg-orange-50',  text: 'text-orange-600',      ring: 'ring-orange-200' },
    under_review:        { label: 'Under Review',       icon: Eye,            bg: 'bg-blue-50',    text: 'text-blue-600',        ring: 'ring-blue-200' },
    approved:            { label: 'Approved',           icon: CheckCircle2,   bg: 'bg-green-50',   text: 'text-green-600',       ring: 'ring-green-200' },
    rejected:            { label: 'Rejected',           icon: XCircle,        bg: 'bg-red-50',     text: 'text-red-600',         ring: 'ring-red-200' },
    needs_justification: { label: 'Needs Justification', icon: AlertTriangle, bg: 'bg-amber-50',   text: 'text-amber-600',       ring: 'ring-amber-200' },
    paid:                { label: 'Paid',               icon: Banknote,       bg: 'bg-emerald-50', text: 'text-emerald-600',     ring: 'ring-emerald-200' },
};

const AUDIT_BADGE = {
    compliant: { label: 'Compliant', icon: ShieldCheck, color: 'bg-green-50 text-green-600 ring-green-200' },
    warning:   { label: 'Warning',   icon: ShieldAlert, color: 'bg-amber-50 text-amber-600 ring-amber-200' },
    violation: { label: 'Violation', icon: ShieldX,     color: 'bg-red-50 text-red-600 ring-red-200' },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    );
};

const AuditBadge = ({ status, score }) => {
    const cfg = AUDIT_BADGE[status];
    if (!cfg) return null;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ring-1 ${cfg.color}`}>
            <Icon className="w-3 h-3" />
            {score}%
        </span>
    );
};

const DATE_PRESETS = [
    { label: 'This Week', getValue: () => { const now = new Date(); const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return { start: d.toISOString().split('T')[0], end: now.toISOString().split('T')[0] }; } },
    { label: 'This Month', getValue: () => { const now = new Date(); return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, end: now.toISOString().split('T')[0] }; } },
    { label: 'This Quarter', getValue: () => { const now = new Date(); const qm = Math.floor(now.getMonth() / 3) * 3; return { start: `${now.getFullYear()}-${String(qm + 1).padStart(2, '0')}-01`, end: now.toISOString().split('T')[0] }; } },
    { label: 'Last 3 Months', getValue: () => { const now = new Date(); const d = new Date(now); d.setMonth(d.getMonth() - 3); return { start: d.toISOString().split('T')[0], end: now.toISOString().split('T')[0] }; } },
];

function getInitials(name = '') {
    return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
}

const statusColors = {
    draft: 'bg-slate-100 text-slate-500',
    submitted: 'bg-orange-100 text-orange-600',
    under_review: 'bg-blue-100 text-blue-600',
    approved: 'bg-green-100 text-green-600',
    rejected: 'bg-red-100 text-red-600',
    needs_justification: 'bg-amber-100 text-amber-600',
    paid: 'bg-emerald-100 text-emerald-600',
};

const UserClaimCard = ({ group, isSelected, onClick }) => {
    const pendingCount = group.claims.filter(c => ['submitted', 'under_review'].includes(c.status)).length;
    const justifCount = group.claims.filter(c => c.status === 'needs_justification').length;

    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                isSelected
                    ? 'border-brand-blue bg-brand-blue/5 shadow-sm'
                    : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
            }`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                    isSelected ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                    {getInitials(group.user.name)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{group.user.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <p className="text-xs text-slate-400">{group.claims.length} claim{group.claims.length !== 1 ? 's' : ''}</p>
                        {pendingCount > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">{pendingCount} pending</span>
                        )}
                        {justifCount > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">{justifCount} needs justif.</span>
                        )}
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className={`font-extrabold text-sm flex items-center gap-0.5 ${isSelected ? 'text-brand-blue' : 'text-slate-800'}`}>
                        <IndianRupee className="w-3 h-3" />
                        {group.totalAmount.toLocaleString('en-IN')}
                    </p>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'rotate-90 text-brand-blue' : 'text-slate-300'}`} />
            </div>
        </button>
    );
};

const ClaimsList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        employee: '',
    });

    const isPrivileged = ['admin', 'superadmin', 'accounts'].includes(user?.role);

    useEffect(() => { fetchClaims(); }, [filterStatus, filters]);
    useEffect(() => { if (isPrivileged) fetchEmployees(); }, []);

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/users');
            setEmployees(res.data.data || res.data || []);
        } catch (err) {
            console.error('Failed to fetch employees', err);
        }
    };

    const fetchClaims = async () => {
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            if (filters.employee) params.submittedBy = filters.employee;
            const res = await api.get('/expenses/claims', { params });
            setClaims(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch claims', err);
        } finally {
            setLoading(false);
        }
    };

    const applyPreset = (preset) => {
        const { start, end } = preset.getValue();
        setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
    };

    const clearFilters = () => {
        setFilters({ startDate: '', endDate: '', employee: '' });
        setFilterStatus('');
        setSelectedUserId(null);
    };

    const sq = search.toLowerCase();
    let filtered = !sq ? claims : claims.filter(c =>
        (c.title || '').toLowerCase().includes(sq) ||
        (c.claimNumber || '').toLowerCase().includes(sq) ||
        (c.submittedBy?.name || '').toLowerCase().includes(sq) ||
        (c.travelPurpose || '').toLowerCase().includes(sq) ||
        (c.travelFrom?.city || '').toLowerCase().includes(sq) ||
        (c.travelTo?.city || '').toLowerCase().includes(sq)
    );

    if (filters.startDate) {
        filtered = filtered.filter(c => new Date(c.createdAt) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(c => new Date(c.createdAt) <= end);
    }

    const activeFilterCount = [filterStatus, filters.startDate, filters.employee].filter(Boolean).length;

    // Group by user
    const groupedByUser = Object.values(
        filtered.reduce((acc, claim) => {
            const uId = claim.submittedBy?._id || 'unassigned';
            if (!acc[uId]) {
                acc[uId] = {
                    user: claim.submittedBy || { name: 'Unknown User', _id: 'unassigned' },
                    claims: [],
                    totalAmount: 0
                };
            }
            acc[uId].claims.push(claim);
            acc[uId].totalAmount += (claim.totalAmount || 0);
            return acc;
        }, {})
    );

    const displayedClaims = isPrivileged
        ? (selectedUserId
            ? filtered.filter(c => (c.submittedBy?._id || 'unassigned') === selectedUserId)
            : filtered)
        : filtered;

    const selectedGroup = selectedUserId ? groupedByUser.find(g => (g.user._id || 'unassigned') === selectedUserId) : null;

    // Stats
    const stats = {
        total: claims.length,
        pending: claims.filter(c => ['submitted', 'under_review'].includes(c.status)).length,
        approved: claims.filter(c => c.status === 'approved').length,
        totalAmount: claims.reduce((sum, c) => sum + (c.totalAmount || 0), 0),
        audited: claims.filter(c => c.aiAudit?.overallStatus).length,
        compliant: claims.filter(c => c.aiAudit?.overallStatus === 'compliant').length,
    };

    return (
        <div className="space-y-5 page-enter">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/expenses')} className="p-2 rounded-xl hover:bg-slate-100 transition-all">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="page-title">Expense Claims</h1>
                        <p className="page-subtitle">{stats.total} claim{stats.total !== 1 ? 's' : ''}, {stats.pending} pending review</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {isPrivileged && (
                        <Link to="/expenses/analytics" className="btn-outline shrink-0 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Analytics
                        </Link>
                    )}
                    <Link to="/expenses" className="btn-outline shrink-0 flex items-center gap-2">
                        <Receipt className="w-4 h-4" />
                        Expenses
                    </Link>
                    <button onClick={() => navigate('/expenses/claims/new')} className="btn-primary shrink-0 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        New Claim
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="card p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Claims</p>
                    <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.total}</p>
                </div>
                <div className="card p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending</p>
                    <p className="text-2xl font-extrabold text-orange-600 mt-1">{stats.pending}</p>
                </div>
                <div className="card p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Approved</p>
                    <p className="text-2xl font-extrabold text-green-600 mt-1">{stats.approved}</p>
                </div>
                <div className="card p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Value</p>
                    <p className="text-xl font-extrabold text-slate-800 mt-1 flex items-center gap-0.5">
                        <IndianRupee className="w-4 h-4" />
                        {stats.totalAmount.toLocaleString('en-IN')}
                    </p>
                </div>
            </div>

            {/* AI Audit Stats */}
            {isPrivileged && stats.audited > 0 && (
                <div className="card p-4 flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                        <p className="text-xs font-bold text-slate-600">
                            <span className="text-green-600">{stats.compliant}</span> / {stats.audited} audited claims compliant
                        </p>
                    </div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                            style={{ width: `${stats.audited > 0 ? (stats.compliant / stats.audited * 100) : 0}%` }}
                        />
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                        {stats.audited > 0 ? Math.round(stats.compliant / stats.audited * 100) : 0}%
                    </p>
                </div>
            )}

            {/* Search & Filter */}
            <div className="card p-3 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by title, number, name, city..."
                            className="input-field pl-10 h-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <select
                        className="input-field h-10 w-full sm:w-48"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="">All Status</option>
                        {Object.entries(STATUS_CFG).map(([val, cfg]) => (
                            <option key={val} value={val}>{cfg.label}</option>
                        ))}
                    </select>
                    {isPrivileged && (
                        <button
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={`flex items-center gap-2 px-4 h-10 rounded-xl border-2 text-sm font-bold transition-all shrink-0 ${
                                showAdvancedFilters || activeFilterCount > 0
                                    ? 'border-brand-blue text-brand-blue bg-brand-blue/5'
                                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="w-5 h-5 rounded-full bg-brand-blue text-white text-[10px] flex items-center justify-center font-bold">{activeFilterCount}</span>
                            )}
                            {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                    )}
                </div>

                {isPrivileged && showAdvancedFilters && (
                    <div className="border-t border-slate-100 pt-4 space-y-4 animate-fade-in">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quick Date</p>
                            <div className="flex flex-wrap gap-2">
                                {DATE_PRESETS.map(p => (
                                    <button key={p.label} onClick={() => applyPreset(p)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:border-brand-blue hover:text-brand-blue hover:bg-brand-blue/5 transition-all">
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From Date</label>
                                <input type="date" className="input-field h-9 mt-1" value={filters.startDate} onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To Date</label>
                                <input type="date" className="input-field h-9 mt-1" value={filters.endDate} onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee</label>
                                <select className="input-field h-9 mt-1" value={filters.employee} onChange={e => setFilters(p => ({ ...p, employee: e.target.value }))}>
                                    <option value="">All Employees</option>
                                    {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name} ({emp.employeeId})</option>)}
                                </select>
                            </div>
                        </div>
                        {activeFilterCount > 0 && (
                            <button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-700 transition-all">
                                Clear All Filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Claims List */}
            {loading ? (
                <div className="card p-8 flex items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading claims...
                </div>
            ) : filtered.length === 0 ? (
                <div className="card p-12 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-bold">No claims found</p>
                    <p className="text-sm text-slate-400 mt-1">Create your first expense claim</p>
                </div>
            ) : isPrivileged ? (
                <div className="space-y-5">
                    {/* User Cards */}
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <UserIcon className="w-3 h-3" /> Team Members
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {groupedByUser.map(group => (
                                <UserClaimCard
                                    key={group.user._id || 'unassigned'}
                                    group={group}
                                    isSelected={(group.user._id || 'unassigned') === selectedUserId}
                                    onClick={() => setSelectedUserId(prev =>
                                        prev === (group.user._id || 'unassigned') ? null : (group.user._id || 'unassigned')
                                    )}
                                />
                            ))}
                        </div>
                        {selectedUserId && (
                            <button
                                onClick={() => setSelectedUserId(null)}
                                className="mt-2 text-xs font-bold text-brand-blue hover:underline flex items-center gap-1"
                            >
                                <X className="w-3 h-3" /> Show all employees
                            </button>
                        )}
                    </div>

                    {/* Claims for selected user or all */}
                    <div className="space-y-2">
                        {selectedGroup && (
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                                    {selectedGroup.user.name}
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                                        {selectedGroup.claims.length} claim{selectedGroup.claims.length !== 1 ? 's' : ''}
                                    </span>
                                </h3>
                                <p className="font-extrabold text-brand-blue flex items-center gap-0.5">
                                    <IndianRupee className="w-4 h-4" />
                                    {selectedGroup.totalAmount.toLocaleString('en-IN')}
                                </p>
                            </div>
                        )}
                        {displayedClaims.map(claim => (
                            <ClaimCard key={claim._id} claim={claim} isPrivileged={isPrivileged} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(claim => (
                        <ClaimCard key={claim._id} claim={claim} isPrivileged={isPrivileged} />
                    ))}
                </div>
            )}
        </div>
    );
};

const ClaimCard = ({ claim, isPrivileged }) => (
    <Link
        to={`/expenses/claims/${claim._id}`}
        className="card p-4 hover:shadow-md transition-all block"
    >
        <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue shrink-0">
                <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-800 text-sm">{claim.title}</p>
                    <code className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                        {claim.claimNumber}
                    </code>
                    <StatusBadge status={claim.status} />
                    {claim.aiAudit?.overallStatus && (
                        <AuditBadge status={claim.aiAudit.overallStatus} score={claim.aiAudit.complianceScore} />
                    )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                    {isPrivileged && claim.submittedBy && (
                        <span className="font-medium flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            {claim.submittedBy.name}
                        </span>
                    )}
                    {claim.travelFrom?.city && claim.travelTo?.city && (
                        <span>{claim.travelFrom.city} → {claim.travelTo.city}</span>
                    )}
                    <span>{new Date(claim.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>{claim.expenses?.length || 0} expense{(claim.expenses?.length || 0) !== 1 ? 's' : ''}</span>
                </div>
                {claim.travelPurpose && (
                    <p className="text-xs text-slate-400 mt-1 truncate">{claim.travelPurpose}</p>
                )}
            </div>
            <div className="text-right shrink-0">
                <p className="font-extrabold text-slate-800 flex items-center gap-0.5">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {claim.totalAmount?.toLocaleString('en-IN')}
                </p>
                {claim.approvedAmount != null && claim.approvedAmount !== claim.totalAmount && (
                    <p className="text-[10px] text-green-600 font-bold mt-0.5">
                        Approved: {claim.approvedAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </p>
                )}
            </div>
        </div>
    </Link>
);

export default ClaimsList;
