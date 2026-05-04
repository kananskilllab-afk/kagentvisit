import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
    FileText, Search, MapPin, Calendar, Building2, Trash2, Edit, PlusCircle,
    Filter, X, Lock, Bell, Eye, SlidersHorizontal, ChevronDown, ChevronUp,
    User as UserIcon, Download
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import VisitDetailModal from '../components/VisitDetailModal';

const STATUS_CFG = {
    submitted:       { label: 'Pending Review',  bg: 'bg-orange-50',  text: 'text-brand-orange', dot: 'bg-brand-orange', ring: 'ring-brand-orange/20' },
    reviewed:        { label: 'Reviewed',          bg: 'bg-blue-50',   text: 'text-brand-sky',    dot: 'bg-brand-sky',    ring: 'ring-brand-sky/20'    },
    action_required: { label: 'Action Required',  bg: 'bg-red-50',    text: 'text-red-600',       dot: 'bg-red-500',      ring: 'ring-red-400/20'      },
    closed:          { label: 'Closed',            bg: 'bg-green-50',  text: 'text-brand-green',  dot: 'bg-brand-green',  ring: 'ring-brand-green/20'  },
    draft:           { label: 'Draft',             bg: 'bg-slate-50',  text: 'text-slate-500',    dot: 'bg-slate-400',    ring: 'ring-slate-200'       },
};

const DATE_PRESETS = [
    { label: 'Today', getValue: () => { const d = new Date().toISOString().split('T')[0]; return { start: d, end: d }; } },
    { label: 'This Week', getValue: () => { const now = new Date(); const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return { start: d.toISOString().split('T')[0], end: now.toISOString().split('T')[0] }; } },
    { label: 'This Month', getValue: () => { const now = new Date(); return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, end: now.toISOString().split('T')[0] }; } },
    { label: 'Last 3 Months', getValue: () => { const now = new Date(); const d = new Date(now); d.setMonth(d.getMonth() - 3); return { start: d.toISOString().split('T')[0], end: now.toISOString().split('T')[0] }; } },
];

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text} ring-1 ${cfg.ring}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

const VisitsList = () => {
    const { user, isAdmin } = useAuth();
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [visitToDelete, setVisitToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlFormType = searchParams.get('formType');

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        city: '',
        companyName: '',
        submittedBy: '',
    });

    const isHomeVisit = urlFormType === 'home_visit' || user?.department === 'B2C' || user?.role === 'home_visit';
    const isPrivileged = ['admin', 'superadmin'].includes(user?.role);

    const activeFilterCount = [statusFilter, ...Object.values(filters)].filter(Boolean).length;

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/users');
            setEmployees(res.data.data || res.data || []);
        } catch (err) {
            console.error('Failed to fetch employees', err);
        }
    };

    const fetchVisits = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (urlFormType) params.formType = urlFormType;
            if (statusFilter) params.status = statusFilter;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.city) params.city = filters.city;
            if (filters.companyName) params.companyName = filters.companyName;
            if (filters.submittedBy && isPrivileged) params.submittedBy = filters.submittedBy;
            const res = await api.get('/visits', { params });
            setVisits(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch visits', err);
        } finally {
            setLoading(false);
        }
    }, [urlFormType, statusFilter, filters]);

    useEffect(() => { fetchVisits(); }, [fetchVisits]);
    useEffect(() => { if (isPrivileged) fetchEmployees(); }, [isPrivileged]);

    const applyPreset = (preset) => {
        const { start, end } = preset.getValue();
        setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
    };

    const clearFilters = () => {
        setFilters({ startDate: '', endDate: '', city: '', companyName: '', submittedBy: '' });
        setStatusFilter('');
        setSearchTerm('');
    };

    const handleVisitUpdated = (updatedVisit) => {
        setVisits(prev => prev.map(v => v._id === updatedVisit._id ? { ...v, ...updatedVisit } : v));
        setSelectedVisit(prev => prev?._id === updatedVisit._id ? { ...prev, ...updatedVisit } : prev);
    };

    const handleApproveUnlock = async (visitId) => {
        setIsSubmitting(true);
        try {
            await api.put(`/visits/${visitId}/approve-unlock`, { unlock: true });
            fetchVisits();
            alert('Visit unlocked successfully');
        } catch (err) {
            alert('Failed to approve unlock: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteVisit = async () => {
        if (!visitToDelete) return;
        setIsSubmitting(true);
        try {
            await api.delete(`/visits/${visitToDelete._id}`);
            fetchVisits();
            setVisitToDelete(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete visit');
        } finally {
            setIsSubmitting(false);
        }
    };

    const exportVisits = () => {
        const headers = ['Title', 'Status', 'Location', 'Submitted By', 'Created At'];
        const rows = filteredVisits.map(visit => [
            visit?.studentInfo?.name || visit?.meta?.companyName || 'Untitled',
            STATUS_CFG[visit.status]?.label || visit.status || '',
            visit?.location?.city || visit?.gpsLocation || visit?.agencyProfile?.address || '',
            visit?.submittedBy?.name || '',
            visit?.createdAt ? new Date(visit.createdAt).toLocaleString('en-IN') : '',
        ]);
        const csv = [headers, ...rows]
            .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
            .join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `visits-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const q = searchTerm.toLowerCase();
    const filteredVisits = visits.filter(visit => {
        if (!q) return true;
        return (
            (visit?.meta?.companyName || '').toLowerCase().includes(q) ||
            (visit?.studentInfo?.name || '').toLowerCase().includes(q) ||
            (visit?.agencyProfile?.address || '').toLowerCase().includes(q) ||
            (visit?.location?.address || '').toLowerCase().includes(q) ||
            (visit?.location?.city || '').toLowerCase().includes(q) ||
            (visit?.submittedBy?.name || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-5 page-enter">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Visit History</h1>
                    <p className="page-subtitle">
                        {filteredVisits.length} of {visits.length} {isHomeVisit ? 'home visits' : 'visit records'}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                <button
                    onClick={exportVisits}
                    className="btn-secondary shrink-0 flex items-center gap-2 px-5"
                >
                    <Download className="w-4 h-4" />
                    Export
                </button>
                {user.role !== 'accounts' && (
                    <button
                        onClick={() => navigate(`/new-visit${urlFormType ? `?formType=${urlFormType}` : ''}`)}
                        className="btn-primary shrink-0 flex items-center gap-2 px-5"
                    >
                        <PlusCircle className="w-4 h-4" />
                        New Report
                    </button>
                )}
                </div>
            </div>

            {/* Search + Filter Bar */}
            <div className="card space-y-3 p-4">
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={`Search by name, company, location...`}
                            className="input-field pl-10 h-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 w-full lg:w-auto">
                        <Filter className="hidden sm:block w-4 h-4 text-slate-400 shrink-0" />
                        <select
                            className="input-field h-10 w-full lg:w-44 text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="submitted">Pending Review</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="action_required">Action Required</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`flex items-center justify-center gap-2 px-4 h-10 rounded-lg border text-sm font-bold transition-all shrink-0 w-full lg:w-auto ${
                            showAdvancedFilters || activeFilterCount > 0
                                ? 'border-meridian-blue text-meridian-blue bg-blue-50'
                                : 'border-meridian-border text-meridian-sub hover:border-slate-300'
                        }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-brand-blue text-white text-[10px] flex items-center justify-center font-bold">{activeFilterCount}</span>
                        )}
                        {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                </div>

                {/* Advanced Filters Panel */}
                {showAdvancedFilters && (
                    <div className="border-t border-meridian-border pt-4 space-y-4 animate-fade-in">
                        {/* Date Presets */}
                        <div className="rounded-2xl border border-slate-100 bg-white/70 p-3">
                            <div className="flex items-center justify-between gap-3 mb-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Date</p>
                                {activeFilterCount > 0 && (
                                    <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 transition-all">
                                        <X className="w-3 h-3" />
                                        Clear
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                                {DATE_PRESETS.map(p => (
                                    <button
                                        key={p.label}
                                        onClick={() => applyPreset(p)}
                                        className="px-3 py-2 sm:py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:border-brand-blue hover:text-brand-blue hover:bg-brand-blue/5 transition-all bg-white"
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                            <div className="min-w-0">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From Date</label>
                                <input
                                    type="date"
                                    className="input-field h-9 mt-1"
                                    value={filters.startDate}
                                    onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To Date</label>
                                <input
                                    type="date"
                                    className="input-field h-9 mt-1"
                                    value={filters.endDate}
                                    onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))}
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {isHomeVisit ? 'Student Name' : 'Company Name'}
                                </label>
                                <input
                                    type="text"
                                    className="input-field h-9 mt-1"
                                    placeholder={isHomeVisit ? 'Student name...' : 'Company name...'}
                                    value={filters.companyName}
                                    onChange={e => setFilters(p => ({ ...p, companyName: e.target.value }))}
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">City / Place</label>
                                <input
                                    type="text"
                                    className="input-field h-9 mt-1"
                                    placeholder="City or area..."
                                    value={filters.city}
                                    onChange={e => setFilters(p => ({ ...p, city: e.target.value }))}
                                />
                            </div>
                        </div>

                        {isPrivileged && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                                <div className="min-w-0">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <UserIcon className="w-3 h-3" /> Team Member
                                    </label>
                                    <select
                                        className="input-field h-9 mt-1"
                                        value={filters.submittedBy}
                                        onChange={e => setFilters(p => ({ ...p, submittedBy: e.target.value }))}
                                    >
                                        <option value="">All Members</option>
                                        {employees.map(emp => (
                                            <option key={emp._id} value={emp._id}>
                                                {emp.name}{emp.employeeId ? ` (${emp.employeeId})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {activeFilterCount > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {statusFilter && <span className="px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-black uppercase tracking-wide">Status</span>}
                                {filters.startDate && <span className="px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-black uppercase tracking-wide">From date</span>}
                                {filters.endDate && <span className="px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-black uppercase tracking-wide">To date</span>}
                                {filters.companyName && <span className="px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-black uppercase tracking-wide">{isHomeVisit ? 'Student' : 'Company'}</span>}
                                {filters.city && <span className="px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-black uppercase tracking-wide">City</span>}
                                {filters.submittedBy && <span className="px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-black uppercase tracking-wide">Team member</span>}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="card p-8 space-y-3 animate-pulse">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-16 bg-slate-100 rounded-xl" />
                    ))}
                </div>
            ) : filteredVisits.length === 0 ? (
                <div className="card flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="font-bold text-slate-600 text-lg">No visits found</p>
                    <p className="text-sm text-slate-400 mt-1">
                        {searchTerm || activeFilterCount > 0 ? 'Try adjusting your filters' : 'Start by creating a new visit report'}
                    </p>
                    {!searchTerm && activeFilterCount === 0 && (user.role === 'user' || user.role === 'home_visit') && (
                        <button onClick={() => navigate('/new-visit')} className="btn-primary mt-5">
                            Create First Report
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block card p-0 overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="th">{isHomeVisit ? 'Student / Visit' : 'Agent / Company Name'}</th>
                                    <th className="th">Status</th>
                                    <th className="th">Location</th>
                                    <th className="th">Date</th>
                                    {isPrivileged && <th className="th">Submitted By</th>}
                                    <th className="th text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredVisits.map((visit) => (
                                    <tr
                                        key={visit._id}
                                        onClick={() => setSelectedVisit(visit)}
                                        className="hover:bg-meridian-row-hov cursor-pointer transition-colors group"
                                    >
                                        <td className="td">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold shrink-0 group-hover:bg-brand-blue/20 transition-colors">
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-brand-blue transition-colors flex items-center gap-1.5">
                                                        {visit?.studentInfo?.name || visit?.meta?.companyName || 'Untitled'}
                                                        {visit.isLocked && <Lock className="w-3 h-3 text-red-400" title="Locked" />}
                                                        {isAdmin && visit.unlockRequestSent && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter bg-red-100 text-red-600 animate-pulse">
                                                                Unlock Req
                                                            </span>
                                                        )}
                                                        {!isAdmin && visit.status === 'action_required' && (
                                                            <Bell className="w-3 h-3 text-red-500 animate-bounce" title="Action Required By Admin" />
                                                        )}
                                                        {!isAdmin && visit.forUser && visit.submittedBy?.name && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-black bg-brand-purple/10 text-brand-purple shrink-0">
                                                                By {visit.submittedBy.name}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="td">
                                            <StatusBadge status={visit.status} />
                                        </td>
                                        <td className="td">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 max-w-[200px]">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate">
                                                    {visit?.location?.city || visit?.gpsLocation?.substring(0, 25) || visit?.agencyProfile?.address?.substring(0, 25) || '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="td">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                {new Date(visit.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        </td>
                                        {isPrivileged && (
                                            <td className="td">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate max-w-[120px]">{visit?.submittedBy?.name || '—'}</span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="td text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1.5">
                                                <button
                                                    onClick={() => setSelectedVisit(visit)}
                                                    className="p-1.5 rounded-lg border border-brand-sky/20 text-brand-sky hover:bg-brand-sky/5 transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                                {isAdmin && visit.unlockRequestSent && (
                                                    <button
                                                        onClick={() => handleApproveUnlock(visit._id)}
                                                        disabled={isSubmitting}
                                                        className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center gap-1.5 text-[10px] font-black uppercase pointer-events-auto"
                                                        title="Approve Unlock"
                                                    >
                                                        <Lock className="w-3.5 h-3.5" />
                                                        Unlock
                                                    </button>
                                                )}
                                                {(isAdmin || visit.submittedBy?._id === user?._id || visit.forUser?._id === user?._id) && (
                                                    <button
                                                        onClick={() => navigate(`/edit-visit/${visit._id}`)}
                                                        className="p-1.5 rounded-lg border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5 transition-all"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {(user?.role === 'superadmin' || visit.submittedBy?._id === user?._id || visit.forUser?._id === user?._id) && (
                                                    <button
                                                        onClick={() => setVisitToDelete(visit)}
                                                        className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-4">
                        {filteredVisits.map((visit) => (
                            <div
                                key={visit._id}
                                onClick={() => setSelectedVisit(visit)}
                                className="card cursor-pointer p-5 hover:border-meridian-blue/30 hover:bg-meridian-row-hov"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
                                                {visit?.studentInfo?.name || visit?.meta?.companyName || 'Untitled'}
                                                {visit.isLocked && <Lock className="w-3 h-3 text-red-400" />}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <p className="text-xs text-slate-400">
                                                    {new Date(visit.createdAt).toLocaleDateString()}
                                                </p>
                                                {isPrivileged && visit?.submittedBy?.name && (
                                                    <p className="text-xs text-slate-400 flex items-center gap-1">
                                                        <UserIcon className="w-3 h-3" />
                                                        {visit.submittedBy.name}
                                                    </p>
                                                )}
                                                {!isAdmin && visit.forUser && visit.submittedBy?.name && (
                                                    <span className="px-1.5 py-0.5 rounded bg-brand-purple/10 text-brand-purple text-[8px] font-black">
                                                        By {visit.submittedBy.name}
                                                    </span>
                                                )}
                                                {isAdmin && visit.unlockRequestSent && (
                                                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[8px] font-black uppercase">
                                                        Unlock Req
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {isAdmin && visit.unlockRequestSent && (
                                            <button
                                                onClick={() => handleApproveUnlock(visit._id)}
                                                disabled={isSubmitting}
                                                className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center gap-1.5 text-[10px] font-black uppercase"
                                                title="Approve Unlock"
                                            >
                                                <Lock className="w-4 h-4" />
                                                Unlock
                                            </button>
                                        )}
                                        {(isAdmin || visit.submittedBy?._id === user?._id || visit.forUser?._id === user?._id) && (
                                            <button
                                                onClick={() => navigate(`/edit-visit/${visit._id}`)}
                                                className="p-2 rounded-lg border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        )}
                                        {(user?.role === 'superadmin' || visit.submittedBy?._id === user?._id || visit.forUser?._id === user?._id) && (
                                            <button
                                                onClick={() => setVisitToDelete(visit)}
                                                className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                                    <StatusBadge status={visit.status} />
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <MapPin className="w-3 h-3" />
                                        <span className="truncate max-w-[140px]">
                                            {visit?.location?.city || visit?.gpsLocation?.substring(0, 22) || visit?.agencyProfile?.address?.substring(0, 22) || 'No location'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Visit Detail Modal */}
            {selectedVisit && (
                <VisitDetailModal
                    visit={selectedVisit}
                    onClose={() => setSelectedVisit(null)}
                    onEdit={() => {
                        setSelectedVisit(null);
                        navigate(`/edit-visit/${selectedVisit._id}`);
                    }}
                    onVisitUpdated={handleVisitUpdated}
                />
            )}

            {/* Delete Modal */}
            {visitToDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-7 h-7 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Visit?</h3>
                            <p className="text-sm text-slate-500">
                                Permanently delete <strong className="text-slate-800">{visitToDelete.meta?.companyName || visitToDelete.studentInfo?.name || 'this visit'}</strong>? This cannot be undone.
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 flex gap-3">
                            <button onClick={() => setVisitToDelete(null)} className="flex-1 btn-outline py-2.5">Cancel</button>
                            <button
                                onClick={handleDeleteVisit}
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 transition-all"
                            >
                                {isSubmitting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisitsList;
