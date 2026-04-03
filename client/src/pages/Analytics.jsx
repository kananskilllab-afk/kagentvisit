import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
    Users, BarChart2, PieChart as PieChartIcon,
    Search, Filter, RefreshCcw, MapPin, Briefcase,
    Calendar as CalendarIcon, Clock, Target, Award,
    ChevronDown, ChevronUp, X, Star, Activity, Globe,
    FileText, CheckCircle2, AlertCircle, Loader2,
    AlertTriangle, CheckCheck, Eye, Lock, Download,
    TrendingUp, Building2, Phone
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
    AreaChart, Area
} from 'recharts';
import ActivityMap from '../components/charts/ActivityMap';

// ── Brand colors ──────────────────────────────────────────────────────────────
const COLORS = ['#284695', '#00A0E3', '#009846', '#E19D19', '#EF7F1A', '#9C2BE3', '#B0CB1F', '#393185'];
const STATUS_COLORS = {
    submitted: '#EF7F1A',
    reviewed: '#00A0E3',
    action_required: '#DC2626',
    closed: '#009846',
    draft: '#94A3B8'
};
const STATUS_LABELS = {
    submitted: 'Pending Review',
    reviewed: 'Reviewed',
    action_required: 'Action Required',
    closed: 'Closed',
    draft: 'Draft'
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white rounded-xl shadow-card-lg border border-slate-100 p-3 text-sm">
            <p className="font-bold text-slate-700 mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color || p.fill }} className="font-semibold">
                    {p.name}: {p.value}
                </p>
            ))}
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color, bgColor, sub }) => (
    <div className="card hover:shadow-card-lg transition-all group">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-extrabold mt-1.5 tracking-tight" style={{ color }}>{value ?? '—'}</p>
                {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
            </div>
            <div className="p-2.5 rounded-xl group-hover:scale-110 transition-transform" style={{ backgroundColor: bgColor }}>
                <Icon className="w-5 h-5" style={{ color }} />
            </div>
        </div>
    </div>
);

const ChartCard = ({ title, subtitle, icon: Icon, iconColor = '#284695', children, className = '', action }) => (
    <div className={`card ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-5">
            <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl" style={{ backgroundColor: iconColor + '15' }}>
                    <Icon className="w-4 h-4" style={{ color: iconColor }} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                    {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
                </div>
            </div>
            {action}
        </div>
        {children}
    </div>
);

const StatusPill = ({ status }) => {
    const cfg = {
        submitted:       { bg: 'bg-orange-50',  text: 'text-brand-orange' },
        reviewed:        { bg: 'bg-blue-50',    text: 'text-brand-sky' },
        action_required: { bg: 'bg-red-50',     text: 'text-red-600' },
        closed:          { bg: 'bg-green-50',   text: 'text-brand-green' },
        draft:           { bg: 'bg-slate-100',  text: 'text-slate-500' },
    }[status] || { bg: 'bg-slate-100', text: 'text-slate-500' };
    return (
        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
            {STATUS_LABELS[status] || status}
        </span>
    );
};

// ── CSV Export Utility ────────────────────────────────────────────────────────
const exportVisitsToCSV = (visits, filename) => {
    const headers = [
        'Company Name', 'BDM Name', 'RM Name', 'Visit Date', 'Meeting Start', 'Meeting End',
        'Agency Address', 'Pincode', 'Contact Number', 'Business Models', 'Infra Rating',
        'Total Staff', 'Countries Promoted', 'Avg Daily Walk-ins', 'Total Visa/Year',
        'Action Points', 'Remarks', 'Interested Services', 'Biggest Challenge', 'Status', 'Submitted By'
    ];
    const rows = visits.map(v => [
        v.meta?.companyName || '',
        v.meta?.bdmName || '',
        v.meta?.rmName || '',
        v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-IN') : '',
        v.meta?.meetingStart ? new Date(v.meta.meetingStart).toLocaleString('en-IN') : '',
        v.meta?.meetingEnd ? new Date(v.meta.meetingEnd).toLocaleString('en-IN') : '',
        v.agencyProfile?.address || '',
        v.agencyProfile?.pinCode || '',
        v.agencyProfile?.contactNumber || '',
        (v.agencyProfile?.businessModel || []).join('; '),
        v.agencyProfile?.infraRating || '',
        v.promoterTeam?.totalStaff || '',
        (v.promoterTeam?.countriesPromoted || []).join('; '),
        v.marketingOps?.avgDailyWalkins || '',
        v.marketingOps?.totalVisaYear || '',
        v.postVisit?.actionPoints || '',
        v.postVisit?.remarks || '',
        (v.support?.interestedServices || []).join('; '),
        v.support?.biggestChallenge || '',
        STATUS_LABELS[v.status] || v.status || '',
        v.submittedBy?.name || ''
    ]);
    const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

const Analytics = () => {
    const { user } = useAuth();
    const [summary, setSummary] = useState(null);
    const [performance, setPerformance] = useState([]);
    const [detailed, setDetailed] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [userVisits, setUserVisits] = useState([]);
    const [isFetchingUser, setIsFetchingUser] = useState(false);
    const [mapVisits, setMapVisits] = useState([]);
    const [pendingVisits, setPendingVisits] = useState([]);
    const [updatingVisitId, setUpdatingVisitId] = useState(null);
    const [noteVisit, setNoteVisit] = useState(null);
    const [noteText, setNoteText] = useState('');
    const [noteStepIndex, setNoteStepIndex] = useState('');
    const [visitFormSections, setVisitFormSections] = useState([]);
    const [toast, setToast] = useState(null);
    const [pincodes, setPincodes] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    // BDM Report state
    const [bdmReport, setBdmReport] = useState([]);
    const [selectedBdm, setSelectedBdm] = useState(null);
    const [bdmVisits, setBdmVisits] = useState([]);
    const [isFetchingBdm, setIsFetchingBdm] = useState(false);
    const [isExportingBdm, setIsExportingBdm] = useState(false);
    const [bdmSearchTerm, setBdmSearchTerm] = useState('');

    const [filters, setFilters] = useState({
        pinCode: '', bdmName: '', rmName: '', officerName: '', status: '',
        city: '', startDate: '', endDate: '',
        reportType: user.role === 'admin' && user.department ? user.department : ''
    });

    const activeFilterCount = Object.values(filters).filter(Boolean).length;
    const handleFilterChange = (name, value) => setFilters(prev => ({ ...prev, [name]: value }));
    const resetFilters = () => setFilters({ pinCode: '', bdmName: '', rmName: '', officerName: '', status: '', city: '', startDate: '', endDate: '', reportType: '' });

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        api.get('/pincodes').then(res => setPincodes(res.data.data || [])).catch(() => {});
    }, []);

    // Fetch all visits for the map (admin sees all)
    useEffect(() => {
        api.get('/visits').then(res => setMapVisits(res.data.data || [])).catch(() => {});
    }, []);

    // Fetch pending/action-required visits for admin action panel
    const fetchPendingVisits = useCallback(async () => {
        try {
            const [subRes, actRes, unlRes] = await Promise.all([
                api.get('/visits?status=submitted'),
                api.get('/visits?status=action_required'),
                api.get('/visits?unlockRequestSent=true')
            ]);
            const combined = [
                ...(subRes.data.data || []), 
                ...(actRes.data.data || []),
                ...(unlRes.data.data || [])
            ];
            
            // Deduplicate
            const unique = [];
            const seen = new Set();
            for (const v of combined) {
                if (!seen.has(v._id)) {
                    unique.push(v);
                    seen.add(v._id);
                }
            }

            unique.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setPendingVisits(unique);
        } catch (err) {
            console.error('Failed to fetch pending visits', err);
        }
    }, []);

    useEffect(() => { fetchPendingVisits(); }, [fetchPendingVisits]);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
            const qs = params.toString() ? `?${params.toString()}` : '';

            const requests = [
                api.get(`/analytics/summary${qs}`),
                api.get(`/analytics/performance${qs}`),
                api.get(`/analytics/detailed${qs}`)
            ];
            // BDM report only for B2B / superadmin
            const showBdm = user.role === 'superadmin' || user.department === 'B2B';
            if (showBdm) requests.push(api.get(`/analytics/bdm-report${qs}`));

            const [sumRes, perfRes, detRes, bdmRes] = await Promise.all(requests);
            setSummary(sumRes.data.data);
            setPerformance(perfRes.data.data || []);
            setDetailed(detRes.data.data);
            if (bdmRes) setBdmReport(bdmRes.data.data || []);
        } catch (err) {
            console.error('Analytics fetch error', err);
            setError(err.response?.data?.message || 'Failed to load analytics. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [filters, user.role, user.department]);

    const fetchBdmVisits = async (bdmName) => {
        setIsFetchingBdm(true);
        setBdmVisits([]);
        try {
            const res = await api.get(`/visits?bdmName=${encodeURIComponent(bdmName)}`);
            setBdmVisits(res.data.data || []);
        } catch (err) {
            console.error('Error fetching BDM visits', err);
        } finally {
            setIsFetchingBdm(false);
        }
    };

    const handleOpenBdm = (bdmRow) => {
        setSelectedBdm(bdmRow);
        fetchBdmVisits(bdmRow._id);
    };

    const handleExportBdm = async (bdmRow) => {
        setIsExportingBdm(bdmRow._id);
        try {
            const res = await api.get(`/visits?bdmName=${encodeURIComponent(bdmRow._id)}`);
            const visits = res.data.data || [];
            exportVisitsToCSV(visits, `BDM_Report_${bdmRow._id.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`);
            showToast(`Exported ${visits.length} visits for ${bdmRow._id}`);
        } catch (err) {
            showToast('Export failed', 'error');
        } finally {
            setIsExportingBdm(null);
        }
    };

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const fetchUserSpecificData = async (userId) => {
        setIsFetchingUser(true);
        setUserVisits([]);
        try {
            const res = await api.get(`/visits?submittedBy=${userId}`);
            setUserVisits(res.data.data || []);
            setSelectedUser(performance.find(p => p._id === userId));
        } catch (err) {
            console.error('Error fetching user data:', err);
        } finally {
            setIsFetchingUser(false);
        }
    };

    const handleApproveUnlock = async (visitId) => {
        setUpdatingVisitId(visitId);
        try {
            await api.put(`/visits/${visitId}/approve-unlock`, { unlock: true });
            showToast('Visit unlocked successfully');
            fetchPendingVisits();
        } catch (err) {
            showToast(err.response?.data?.message || 'Approval failed', 'error');
        } finally {
            setUpdatingVisitId(null);
        }
    };

    const handleStatusUpdate = async (visitId, newStatus) => {
        setUpdatingVisitId(visitId);
        try {
            await api.put(`/visits/${visitId}`, { status: newStatus });
            showToast(`Visit marked as ${STATUS_LABELS[newStatus]}`);
            fetchPendingVisits();
            fetchAnalytics();
        } catch (err) {
            showToast(err.response?.data?.message || 'Update failed', 'error');
        } finally {
            setUpdatingVisitId(null);
        }
    };

    const handleAddNote = async () => {
        if (!noteText.trim() || !noteVisit) return;
        setUpdatingVisitId(noteVisit._id);
        try {
            const adminNoteObj = { 
                note: noteText,
                stepIndex: noteStepIndex !== '' ? parseInt(noteStepIndex) : undefined,
                stepName: noteStepIndex !== '' ? visitFormSections[parseInt(noteStepIndex)]?.title : undefined
            };
            await api.put(`/visits/${noteVisit._id}`, { adminNoteObj });
            showToast('Note added successfully');
            setNoteVisit(null);
            setNoteText('');
            setNoteStepIndex('');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to add note', 'error');
        } finally {
            setUpdatingVisitId(null);
        }
    };

    // Load form sections for note modal
    useEffect(() => {
        if (noteVisit) {
            api.get(`/form-config?formType=${noteVisit.formType || 'generic'}`)
               .then(res => setVisitFormSections(res.data.data?.sections || []))
               .catch(() => setVisitFormSections([]));
        } else {
            setVisitFormSections([]);
        }
    }, [noteVisit]);

    const sq = searchTerm.toLowerCase();
    const filteredPerformance = !sq ? performance : performance.filter(p =>
        (p.name || '').toLowerCase().includes(sq) ||
        (p.employeeId || '').toLowerCase().includes(sq)
    );

    // Error state
    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Failed to load analytics</h2>
            <p className="text-sm text-slate-500 max-w-xs mb-5">{error}</p>
            <button onClick={fetchAnalytics} className="btn-primary flex items-center gap-2">
                <RefreshCcw className="w-4 h-4" />
                Retry
            </button>
        </div>
    );

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="h-10 w-56 bg-slate-200 rounded-xl" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1,2,3,4].map(i => <div key={i} className="h-64 bg-slate-200 rounded-2xl" />)}
            </div>
        </div>
    );

    const pieData = (summary?.statusDist || []).map(item => ({
        name: STATUS_LABELS[item._id] || item._id,
        value: item.count,
        color: STATUS_COLORS[item._id] || '#CBD5E1'
    }));

    const formTypeData = (summary?.formTypeDist || []).map(item => ({
        name: item._id === 'generic' ? 'B2B Agency' : 'B2C Home Visit',
        value: item.count,
        color: item._id === 'generic' ? '#284695' : '#E19D19'
    }));

    const dailyData = (summary?.dailyTrends || []).map(t => ({
        date: t._id.slice(5),
        visits: t.count
    }));

    const funnelData = (detailed?.funnelData || []).map(f => ({
        stage: STATUS_LABELS[f.stage] || f.stage,
        count: f.count,
        color: STATUS_COLORS[f.stage]
    }));

    const topUsers = performance.slice(0, 5);
    const activeVisitsForMap = userVisits.length > 0 ? userVisits : mapVisits;

    return (
        <div className="space-y-6 pb-12 page-enter">

            {/* Toast notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[200] px-4 py-3 rounded-xl shadow-lg font-semibold text-sm flex items-center gap-2 animate-fade-in ${
                    toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-brand-green text-white'
                }`}>
                    {toast.type === 'error'
                        ? <AlertCircle className="w-4 h-4" />
                        : <CheckCircle2 className="w-4 h-4" />
                    }
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Analytics & Insights</h1>
                    <p className="page-subtitle">Comprehensive data overview for informed decisions</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchAnalytics}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-brand-blue hover:border-brand-sky transition-all"
                        title="Refresh data"
                    >
                        <RefreshCcw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowFilters(v => !v)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border transition-all ${
                            showFilters || activeFilterCount > 0
                                ? 'bg-brand-blue text-white border-brand-blue shadow-md shadow-brand-blue/20'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-sky'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="bg-white/30 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                                {activeFilterCount}
                            </span>
                        )}
                        {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {activeFilterCount > 0 && (
                        <button
                            onClick={resetFilters}
                            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-bold text-slate-500 hover:text-red-500 bg-white border border-slate-200 rounded-xl transition-all"
                        >
                            <X className="w-3.5 h-3.5" />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="card animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {filters.reportType !== 'B2C' && (
                            <>
                                <div>
                                    <label className="label"><Users className="w-3 h-3 inline mr-1" />BDM Name</label>
                                    <input type="text" placeholder="Search BDM..." className="input-field h-9 text-sm"
                                        value={filters.bdmName} onChange={(e) => handleFilterChange('bdmName', e.target.value)} />
                                </div>
                                <div>
                                    <label className="label"><Briefcase className="w-3 h-3 inline mr-1" />RM Name</label>
                                    <input type="text" placeholder="Search RM..." className="input-field h-9 text-sm"
                                        value={filters.rmName} onChange={(e) => handleFilterChange('rmName', e.target.value)} />
                                </div>
                            </>
                        )}
                        {filters.reportType === 'B2C' && (
                            <div>
                                <label className="label"><Users className="w-3 h-3 inline mr-1" />Surveyor / Officer Name</label>
                                <input type="text" placeholder="Search Surveyor..." className="input-field h-9 text-sm"
                                    value={filters.officerName} onChange={(e) => handleFilterChange('officerName', e.target.value)} />
                            </div>
                        )}
                        <div>
                            <label className="label">Status</label>
                            <select className="input-field h-9 text-sm" value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}>
                                <option value="">All Statuses</option>
                                <option value="draft">Draft</option>
                                <option value="submitted">Pending Review</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="action_required">Action Required</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>
                        <div>
                            <label className="label"><MapPin className="w-3 h-3 inline mr-1" />Pincode</label>
                            <select className="input-field h-9 text-sm" value={filters.pinCode}
                                onChange={(e) => handleFilterChange('pinCode', e.target.value)}>
                                <option value="">All Pincodes</option>
                                {pincodes.map(pc => <option key={pc._id} value={pc.code}>{pc.code} – {pc.city}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label"><CalendarIcon className="w-3 h-3 inline mr-1" />Date From</label>
                            <input type="date" className="input-field h-9 text-sm" value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)} />
                        </div>
                        <div>
                            <label className="label"><CalendarIcon className="w-3 h-3 inline mr-1" />Date To</label>
                            <input type="date" className="input-field h-9 text-sm" value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)} />
                        </div>
                        <div>
                            <label className="label">Report Type</label>
                            <select className="input-field h-9 text-sm" value={filters.reportType}
                                onChange={(e) => handleFilterChange('reportType', e.target.value)}>
                                {user.role === 'superadmin' && <option value="">All Reports</option>}
                                {(user.role === 'superadmin' || user.department === 'B2B') && <option value="B2B">B2B Agency</option>}
                                {(user.role === 'superadmin' || user.department === 'B2C') && <option value="B2C">Home Visit</option>}
                            </select>
                        </div>
                        <div>
                            <label className="label"><Search className="w-3 h-3 inline mr-1" />City / Location</label>
                            <input type="text" placeholder="City or address..." className="input-field h-9 text-sm"
                                value={filters.city} onChange={(e) => handleFilterChange('city', e.target.value)} />
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Visits"      value={summary?.stats.totalVisits}    icon={FileText}     color="#284695" bgColor="#EEF4FF" />
                <StatCard title="Pending Review"    value={summary?.stats.pendingReview}  icon={Clock}        color="#EF7F1A" bgColor="#FFF4EA" />
                <StatCard title="Action Required"   value={summary?.stats.actionRequired} icon={AlertCircle}  color="#DC2626" bgColor="#FEF2F2" />
                <StatCard title="Closed / Resolved" value={summary?.stats.closedVisits}   icon={CheckCircle2} color="#009846" bgColor="#ECFDF5"
                    sub={summary?.stats.totalVisits ? `${Math.round((summary.stats.closedVisits / summary.stats.totalVisits) * 100)}% closure rate` : undefined}
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Reviewed"         value={summary?.stats.reviewedVisits} icon={Award}    color="#00A0E3" bgColor="#E0F5FF" />
                <StatCard title="Drafts"           value={summary?.stats.draftVisits}    icon={FileText} color="#94A3B8" bgColor="#F8FAFC" />
                <StatCard title="Active Users"     value={summary?.stats.activeUsers}    icon={Users}    color="#9C2BE3" bgColor="#F5EDFF" />
                <StatCard title="Avg Infra Rating" icon={Star} color="#E19D19" bgColor="#FFF8E6"
                    value={detailed?.avgInfraRating > 0 ? `${detailed.avgInfraRating} / 5` : '—'}
                />
            </div>

            {/* Pending Actions Panel */}
            {pendingVisits.length > 0 && (
                <ChartCard
                    title="Pending Actions"
                    subtitle={`${pendingVisits.length} visit${pendingVisits.length !== 1 ? 's' : ''} require attention`}
                    icon={AlertCircle}
                    iconColor="#DC2626"
                    action={
                        <span className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-extrabold rounded-full">
                            {pendingVisits.length} pending
                        </span>
                    }
                >
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {pendingVisits.map(visit => (
                            <div key={visit._id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-bold text-slate-800 truncate">
                                            {visit.meta?.companyName || visit.studentInfo?.name || 'Untitled'}
                                        </p>
                                        <StatusPill status={visit.status} />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        By: {visit.submittedBy?.name || '—'} · {new Date(visit.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                    {visit.status !== 'reviewed' && (
                                        <button
                                            onClick={() => handleStatusUpdate(visit._id, 'reviewed')}
                                            disabled={updatingVisitId === visit._id}
                                            className="px-3 py-1.5 bg-blue-50 text-brand-sky rounded-lg text-xs font-bold hover:bg-blue-100 transition-all disabled:opacity-50 flex items-center gap-1"
                                        >
                                            <Eye className="w-3 h-3" />
                                            Reviewed
                                        </button>
                                    )}
                                    {visit.status !== 'action_required' && (
                                        <button
                                            onClick={() => handleStatusUpdate(visit._id, 'action_required')}
                                            disabled={updatingVisitId === visit._id}
                                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all disabled:opacity-50 flex items-center gap-1"
                                        >
                                            <AlertCircle className="w-3 h-3" />
                                            Action Needed
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleStatusUpdate(visit._id, 'closed')}
                                        disabled={updatingVisitId === visit._id}
                                        className="px-3 py-1.5 bg-green-50 text-brand-green rounded-lg text-xs font-bold hover:bg-green-100 transition-all disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {updatingVisitId === visit._id
                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                            : <CheckCheck className="w-3 h-3" />
                                        }
                                        Close
                                    </button>
                                    {visit.unlockRequestSent && (
                                        <button
                                            onClick={() => handleApproveUnlock(visit._id)}
                                            disabled={updatingVisitId === visit._id}
                                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-all disabled:opacity-50 flex items-center gap-1"
                                        >
                                            {updatingVisitId === visit._id
                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                : <Lock className="w-3 h-3" />
                                            }
                                            Approve Unlock
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setNoteVisit(visit); setNoteText(''); }}
                                        className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
                                    >
                                        Add Note
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            )}

            {/* Daily Activity + Status Pie */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard
                    title="Daily Activity (Last 30 Days)"
                    subtitle="Submissions per day"
                    icon={Activity}
                    iconColor="#00A0E3"
                    className="lg:col-span-2"
                >
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00A0E3" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#00A0E3" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} interval={4} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                                <Tooltip content={CustomTooltip} />
                                <Area type="monotone" dataKey="visits" name="Visits" stroke="#00A0E3" strokeWidth={2.5} fill="url(#dailyGrad)" dot={false} activeDot={{ r: 4, fill: '#284695' }} isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Status Distribution" subtitle="By submission status" icon={PieChartIcon} iconColor="#9C2BE3">
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" isAnimationActive={false}>
                                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                                <Legend formatter={(value) => value} iconSize={8} wrapperStyle={{ fontSize: '11px', fontWeight: 600, color: '#475569' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* Day of Week + Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Visits by Day of Week" subtitle="Peak submission days" icon={CalendarIcon} iconColor="#E19D19">
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={detailed?.dayOfWeekData || []} margin={{ left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                                <Tooltip content={CustomTooltip} />
                                <Bar dataKey="count" name="Visits" fill="#E19D19" radius={[6, 6, 0, 0]} barSize={32} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title="Submission Funnel" subtitle="Visit lifecycle progression" icon={Target} iconColor="#009846">
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData} layout="vertical" margin={{ left: 10, right: 15 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                                <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} width={110} />
                                <Tooltip content={CustomTooltip} />
                                <Bar dataKey="count" name="Count" radius={[0, 6, 6, 0]} barSize={22} isAnimationActive={false}>
                                    {funnelData.map((entry, i) => <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* Form Type + Top Pincodes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Form Type Distribution" subtitle="B2B vs B2C breakdown" icon={BarChart2} iconColor="#284695">
                    <div className="space-y-3">
                        {formTypeData.map((item) => {
                            const pct = summary?.stats.totalVisits
                                ? Math.round((item.value / summary.stats.totalVisits) * 100) : 0;
                            return (
                                <div key={item.name}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                                        <span className="text-sm font-bold" style={{ color: item.color }}>
                                            {item.value} <span className="text-slate-400 font-normal">({pct}%)</span>
                                        </span>
                                    </div>
                                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                                    </div>
                                </div>
                            );
                        })}
                        {formTypeData.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No data available</p>}
                    </div>
                </ChartCard>

                <ChartCard title="Top Pincodes" subtitle="Most visited area codes" icon={MapPin} iconColor="#EF7F1A">
                    <div className="space-y-2">
                        {(detailed?.topPincodes || []).slice(0, 6).map((pc, i) => (
                            <div key={pc._id} className="flex items-center gap-3">
                                <span className="text-xs font-extrabold text-slate-400 w-5 shrink-0">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-bold text-slate-700">{pc._id}</span>
                                        <span className="text-xs font-bold text-brand-orange">{pc.count} visits</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-orange rounded-full"
                                            style={{ width: `${(pc.count / ((detailed?.topPincodes[0]?.count) || 1)) * 100}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {!detailed?.topPincodes?.length && <p className="text-sm text-slate-400 text-center py-8">No pincode data available</p>}
                    </div>
                </ChartCard>
            </div>

            {/* B2B: Business Models + Countries */}
            {(detailed?.businessModels?.length > 0 || detailed?.countriesPromoted?.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {detailed?.businessModels?.length > 0 && (
                        <ChartCard title="Business Models (B2B)" subtitle="Agency business model distribution" icon={Briefcase} iconColor="#284695">
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={detailed.businessModels.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 15 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                                        <YAxis dataKey="_id" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} width={100} />
                                        <Tooltip content={CustomTooltip} />
                                        <Bar dataKey="count" name="Agencies" fill="#284695" radius={[0, 6, 6, 0]} barSize={18} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>
                    )}
                    {detailed?.countriesPromoted?.length > 0 && (
                        <ChartCard title="Countries Promoted (B2B)" subtitle="Top destination countries being marketed" icon={Globe} iconColor="#009846">
                            <div className="h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={detailed.countriesPromoted.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 15 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10 }} />
                                        <YAxis dataKey="_id" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10, fontWeight: 600 }} width={90} />
                                        <Tooltip content={CustomTooltip} />
                                        <Bar dataKey="count" name="Count" fill="#009846" radius={[0, 6, 6, 0]} barSize={18} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>
                    )}
                </div>
            )}

            {/* B2C Visit Outcomes */}
            {detailed?.visitOutcomes?.length > 0 && (
                <ChartCard title="B2C Visit Outcomes" subtitle="Results from home visits" icon={CheckCircle2} iconColor="#009846">
                    <div className="flex flex-wrap gap-4">
                        {detailed.visitOutcomes.map((item, i) => (
                            <div key={item._id} className="flex-1 min-w-[120px] p-4 rounded-xl border border-slate-100 text-center">
                                <p className="text-2xl font-extrabold" style={{ color: COLORS[i % COLORS.length] }}>{item.count}</p>
                                <p className="text-xs font-semibold text-slate-500 mt-1 capitalize">{item._id || 'Unknown'}</p>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            )}

            {/* Activity Map */}
            <ChartCard
                title="Visit Activity Map"
                subtitle={selectedUser
                    ? `Filtered: ${userVisits.length} visits by ${selectedUser.name}`
                    : `${activeVisitsForMap.filter(v => v.gpsCoordinates?.lat || v.lat).length} visits with GPS data`
                }
                icon={MapPin}
                iconColor="#00A0E3"
                action={selectedUser && (
                    <button
                        onClick={() => { setSelectedUser(null); setUserVisits([]); }}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-all"
                    >
                        <X className="w-3 h-3" /> Clear filter
                    </button>
                )}
            >
                <ActivityMap visits={activeVisitsForMap} />
                {!selectedUser && (
                    <p className="mt-3 text-xs text-slate-400 italic">
                        Click "View" on an agent below to filter the map to their visits.
                    </p>
                )}
            </ChartCard>

            {/* Top Performers Chart */}
            <ChartCard title="Top Performers" subtitle="Agents by total visit submissions" icon={Award} iconColor="#E19D19">
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topUsers} layout="vertical" margin={{ left: 10, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} width={110} />
                            <Tooltip content={CustomTooltip} />
                            <Bar dataKey="visitsCount" name="Total Visits" fill="#E19D19" radius={[0, 6, 6, 0]} barSize={22} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </ChartCard>

            {/* BDM Visit Report Table */}
            {bdmReport.length > 0 && (
                <div className="card p-0 overflow-hidden">
                    <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-brand-blue" />
                                BDM Visit Report
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">{bdmReport.length} BDMs · Click "View" to see visit details &amp; export</p>
                        </div>
                        <div className="relative w-full sm:w-60">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search BDM..."
                                className="input-field pl-9 h-9 text-sm"
                                value={bdmSearchTerm}
                                onChange={(e) => setBdmSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="th">#</th>
                                    <th className="th">BDM Name</th>
                                    <th className="th text-center">Total</th>
                                    <th className="th text-center">Pending</th>
                                    <th className="th text-center">Action Req.</th>
                                    <th className="th text-center">Reviewed</th>
                                    <th className="th text-center">Closed</th>
                                    <th className="th text-center">Companies</th>
                                    <th className="th text-center">Last Visit</th>
                                    <th className="th text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {bdmReport
                                    .filter(b => !bdmSearchTerm || (b._id || '').toLowerCase().includes(bdmSearchTerm.toLowerCase()))
                                    .map((bdm, index) => (
                                    <tr key={bdm._id} className="hover:bg-blue-50/20 transition-colors">
                                        <td className="td">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                                                index === 0 ? 'bg-brand-gold/20 text-brand-gold' :
                                                index === 1 ? 'bg-slate-200 text-slate-600' :
                                                index === 2 ? 'bg-brand-orange/20 text-brand-orange' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                                {index + 1}
                                            </div>
                                        </td>
                                        <td className="td">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-xs font-bold">
                                                    {bdm._id?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <span className="text-sm font-bold text-slate-800">{bdm._id || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="td text-center">
                                            <span className="text-sm font-extrabold text-brand-blue">{bdm.totalVisits}</span>
                                        </td>
                                        <td className="td text-center">
                                            <span className={`text-xs font-bold ${bdm.pendingCount > 0 ? 'text-brand-orange' : 'text-slate-300'}`}>{bdm.pendingCount}</span>
                                        </td>
                                        <td className="td text-center">
                                            <span className={`text-xs font-bold ${bdm.actionRequired > 0 ? 'text-red-600' : 'text-slate-300'}`}>{bdm.actionRequired}</span>
                                        </td>
                                        <td className="td text-center">
                                            <span className="text-xs font-bold text-brand-sky">{bdm.reviewedCount}</span>
                                        </td>
                                        <td className="td text-center">
                                            <span className="text-xs font-bold text-brand-green">{bdm.closedCount}</span>
                                        </td>
                                        <td className="td text-center">
                                            <span className="text-xs text-slate-500">{(bdm.companies || []).filter(Boolean).length}</span>
                                        </td>
                                        <td className="td text-center text-xs text-slate-400">
                                            {bdm.lastVisit ? new Date(bdm.lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                                        </td>
                                        <td className="td text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                    onClick={() => handleOpenBdm(bdm)}
                                                    className="px-3 py-1.5 bg-brand-blue/5 text-brand-blue hover:bg-brand-blue/10 rounded-lg text-xs font-bold transition-all"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleExportBdm(bdm)}
                                                    disabled={isExportingBdm === bdm._id}
                                                    className="px-2.5 py-1.5 bg-brand-green/5 text-brand-green hover:bg-brand-green/10 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1"
                                                    title="Export this BDM's visits as CSV"
                                                >
                                                    {isExportingBdm === bdm._id
                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                        : <Download className="w-3 h-3" />
                                                    }
                                                    Export
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile BDM cards */}
                    <div className="sm:hidden space-y-3 p-4">
                        {bdmReport
                            .filter(b => !bdmSearchTerm || (b._id || '').toLowerCase().includes(bdmSearchTerm.toLowerCase()))
                            .map((bdm, index) => (
                            <div key={bdm._id} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                                            index === 0 ? 'bg-brand-gold text-white' :
                                            index === 1 ? 'bg-slate-300 text-slate-700' :
                                            index === 2 ? 'bg-brand-orange text-white' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>{index + 1}</div>
                                        <p className="text-sm font-bold text-slate-800">{bdm._id || '—'}</p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button onClick={() => handleOpenBdm(bdm)} className="px-3 py-1.5 bg-brand-blue/10 text-brand-blue rounded-lg text-xs font-bold">View</button>
                                        <button onClick={() => handleExportBdm(bdm)} disabled={isExportingBdm === bdm._id} className="px-2.5 py-1.5 bg-brand-green/10 text-brand-green rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1">
                                            {isExportingBdm === bdm._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-50 text-center">
                                    {[
                                        { label: 'Total', value: bdm.totalVisits, color: 'text-brand-blue' },
                                        { label: 'Pend.', value: bdm.pendingCount, color: 'text-brand-orange' },
                                        { label: 'Action', value: bdm.actionRequired, color: 'text-red-500' },
                                        { label: 'Closed', value: bdm.closedCount, color: 'text-brand-green' },
                                    ].map(({ label, value, color }) => (
                                        <div key={label}>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mb-0.5">{label}</p>
                                            <p className={`text-sm font-black ${color}`}>{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    {bdmReport.filter(b => !bdmSearchTerm || (b._id || '').toLowerCase().includes(bdmSearchTerm.toLowerCase())).length === 0 && (
                        <div className="py-12 text-center text-slate-400 text-sm">No BDMs found</div>
                    )}
                </div>
            )}

            {/* Performance Table */}
            <div className="card p-0 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Users className="w-4 h-4 text-brand-blue" />
                            Surveyor Performance Rankings
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{filteredPerformance.length} agents</p>
                    </div>
                    <div className="relative w-full sm:w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search agent..."
                            className="input-field pl-9 h-9 text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                {/* Performance Rankings: Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="th">#</th>
                                <th className="th">Agent</th>
                                <th className="th text-center">Employee ID</th>
                                <th className="th text-center">Total</th>
                                <th className="th text-center">Submitted</th>
                                <th className="th text-center">Closed</th>
                                <th className="th text-center">Last Visit</th>
                                <th className="th text-center">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredPerformance.map((item, index) => (
                                <tr key={item._id} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="td">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                                            index === 0 ? 'bg-brand-gold/20 text-brand-gold' :
                                            index === 1 ? 'bg-slate-200 text-slate-600' :
                                            index === 2 ? 'bg-brand-orange/20 text-brand-orange' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td className="td">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-xs font-bold">
                                                {item.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{item.name}</p>
                                                {item.department && <p className="text-[10px] text-slate-400">{item.department}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="td text-center">
                                        <code className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.employeeId}</code>
                                    </td>
                                    <td className="td text-center">
                                        <span className="text-sm font-extrabold text-brand-blue">{item.visitsCount}</span>
                                    </td>
                                    <td className="td text-center">
                                        <span className="text-xs font-bold text-brand-orange">{item.submittedCount}</span>
                                    </td>
                                    <td className="td text-center">
                                        <span className="text-xs font-bold text-brand-green">{item.closedCount}</span>
                                    </td>
                                    <td className="td text-center text-xs text-slate-400">
                                        {item.lastSubmission
                                            ? new Date(item.lastSubmission).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                            : '—'}
                                    </td>
                                    <td className="td text-center">
                                        <button
                                            onClick={() => fetchUserSpecificData(item._id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                selectedUser?._id === item._id
                                                    ? 'bg-brand-blue text-white'
                                                    : 'bg-brand-blue/5 text-brand-blue hover:bg-brand-blue/10'
                                            }`}
                                        >
                                            {isFetchingUser && selectedUser?._id === item._id
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : 'View'
                                            }
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Performance Rankings: Mobile Cards */}
                <div className="sm:hidden space-y-3 p-4">
                    {filteredPerformance.map((item, index) => (
                        <div key={item._id} className="p-4 rounded-2xl border border-slate-100 hover:border-brand-sky/20 transition-all bg-white shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                                        index === 0 ? 'bg-brand-gold text-white shadow-md' :
                                        index === 1 ? 'bg-slate-300 text-slate-700' :
                                        index === 2 ? 'bg-brand-orange text-white' :
                                        'bg-slate-100 text-slate-500'
                                    }`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{item.name}</p>
                                        <p className="text-[10px] text-slate-400 font-mono tracking-tight uppercase">ID: {item.employeeId}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => fetchUserSpecificData(item._id)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        selectedUser?._id === item._id
                                            ? 'bg-brand-blue text-white'
                                            : 'bg-brand-blue/10 text-brand-blue'
                                    }`}
                                >
                                    {isFetchingUser && selectedUser?._id === item._id ? '...' : 'View'}
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 py-3 border-t border-slate-50">
                                <div className="text-center">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter mb-0.5">Visits</p>
                                    <p className="text-sm font-black text-brand-blue">{item.visitsCount}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter mb-0.5">Pend.</p>
                                    <p className="text-sm font-black text-brand-orange">{item.submittedCount}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter mb-0.5">Closed</p>
                                    <p className="text-sm font-black text-brand-green">{item.closedCount}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {filteredPerformance.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-sm">No agents found</div>
                )}
            </div>

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-fade-in overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-lg">
                                    {selectedUser.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{selectedUser.name}</h3>
                                    <p className="text-xs text-slate-400">ID: {selectedUser.employeeId} {selectedUser.department && `· ${selectedUser.department}`}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setSelectedUser(null); setUserVisits([]); }}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto flex-1">
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                {[
                                    { label: 'Total Visits', value: selectedUser.visitsCount, color: '#284695', bg: '#EEF4FF' },
                                    { label: 'Submitted',    value: selectedUser.submittedCount, color: '#EF7F1A', bg: '#FFF4EA' },
                                    { label: 'Closed',       value: selectedUser.closedCount, color: '#009846', bg: '#ECFDF5' },
                                ].map(({ label, value, color, bg }) => (
                                    <div key={label} className="rounded-xl p-3 text-center" style={{ backgroundColor: bg }}>
                                        <p className="text-xl font-extrabold" style={{ color }}>{value}</p>
                                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">{label}</p>
                                    </div>
                                ))}
                            </div>
                            <h4 className="font-bold text-slate-700 mb-3 text-sm">Recent Submissions</h4>
                            {isFetchingUser ? (
                                <div className="py-8 flex items-center justify-center gap-2 text-slate-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Fetching visit history...
                                </div>
                            ) : userVisits.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-sm">No visits found</div>
                            ) : (
                                <div className="space-y-2">
                                    {userVisits.slice(0, 8).map(visit => (
                                        <div key={visit._id} className="p-3.5 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-all">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">
                                                    {visit.meta?.companyName || visit.studentInfo?.name || 'Untitled'}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                    <CalendarIcon className="w-3 h-3" />
                                                    {new Date(visit.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <StatusPill status={visit.status} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 text-right">
                            <button onClick={() => { setSelectedUser(null); setUserVisits([]); }} className="btn-ghost px-5">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* BDM Visit Detail Modal */}
            {selectedBdm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl animate-fade-in overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-lg">
                                    {selectedBdm._id?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{selectedBdm._id}</h3>
                                    <p className="text-xs text-slate-400">{selectedBdm.totalVisits} visits · {(selectedBdm.companies || []).filter(Boolean).length} companies</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        if (bdmVisits.length > 0) {
                                            exportVisitsToCSV(bdmVisits, `BDM_Report_${selectedBdm._id.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`);
                                            showToast(`Exported ${bdmVisits.length} visits`);
                                        }
                                    }}
                                    disabled={isFetchingBdm || bdmVisits.length === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40"
                                >
                                    <Download className="w-4 h-4" />
                                    Export CSV
                                </button>
                                <button
                                    onClick={() => { setSelectedBdm(null); setBdmVisits([]); }}
                                    className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Summary stats */}
                        <div className="px-5 pt-4 pb-2 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
                            {[
                                { label: 'Total',    value: selectedBdm.totalVisits,    color: '#284695', bg: '#EEF4FF' },
                                { label: 'Pending',  value: selectedBdm.pendingCount,   color: '#EF7F1A', bg: '#FFF4EA' },
                                { label: 'Action',   value: selectedBdm.actionRequired, color: '#DC2626', bg: '#FEF2F2' },
                                { label: 'Reviewed', value: selectedBdm.reviewedCount,  color: '#00A0E3', bg: '#E0F5FF' },
                                { label: 'Closed',   value: selectedBdm.closedCount,    color: '#009846', bg: '#ECFDF5' },
                            ].map(({ label, value, color, bg }) => (
                                <div key={label} className="rounded-xl p-3 text-center" style={{ backgroundColor: bg }}>
                                    <p className="text-xl font-extrabold" style={{ color }}>{value}</p>
                                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">{label}</p>
                                </div>
                            ))}
                        </div>

                        <div className="p-5 overflow-y-auto flex-1">
                            {isFetchingBdm ? (
                                <div className="py-10 flex items-center justify-center gap-2 text-slate-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading visits…
                                </div>
                            ) : bdmVisits.length === 0 ? (
                                <div className="py-10 text-center text-slate-400 text-sm">No visits found</div>
                            ) : (
                                <div className="space-y-3">
                                    {bdmVisits.map(visit => (
                                        <div key={visit._id} className="p-4 rounded-xl border border-slate-100 hover:border-brand-sky/30 hover:bg-slate-50/60 transition-all">
                                            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <p className="text-sm font-bold text-slate-800">
                                                            {visit.meta?.companyName || 'Untitled'}
                                                        </p>
                                                        <StatusPill status={visit.status} />
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                            <CalendarIcon className="w-3 h-3" />
                                                            {new Date(visit.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        {visit.meta?.rmName && (
                                                            <span className="flex items-center gap-1">
                                                                <Users className="w-3 h-3" />
                                                                RM: {visit.meta.rmName}
                                                            </span>
                                                        )}
                                                        {visit.agencyProfile?.pinCode && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" />
                                                                {visit.agencyProfile.pinCode}
                                                            </span>
                                                        )}
                                                        {visit.agencyProfile?.infraRating && (
                                                            <span className="flex items-center gap-1">
                                                                <Star className="w-3 h-3" />
                                                                Infra: {visit.agencyProfile.infraRating}/5
                                                            </span>
                                                        )}
                                                        {visit.submittedBy?.name && (
                                                            <span className="flex items-center gap-1">
                                                                <Building2 className="w-3 h-3" />
                                                                By: {visit.submittedBy.name}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {visit.postVisit?.actionPoints && (
                                                        <div className="mt-2 p-2.5 bg-orange-50 rounded-lg border-l-2 border-brand-orange">
                                                            <p className="text-[10px] font-bold text-brand-orange uppercase tracking-wide mb-0.5">Action Points</p>
                                                            <p className="text-xs text-slate-700 leading-relaxed">{visit.postVisit.actionPoints}</p>
                                                        </div>
                                                    )}
                                                    {visit.postVisit?.remarks && (
                                                        <div className="mt-2 p-2.5 bg-blue-50 rounded-lg border-l-2 border-brand-sky">
                                                            <p className="text-[10px] font-bold text-brand-sky uppercase tracking-wide mb-0.5">Remarks</p>
                                                            <p className="text-xs text-slate-700 leading-relaxed">{visit.postVisit.remarks}</p>
                                                        </div>
                                                    )}
                                                    {visit.support?.interestedServices?.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {visit.support.interestedServices.map(s => (
                                                                <span key={s} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full font-semibold">{s}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex sm:flex-col gap-1.5 shrink-0">
                                                    {visit.status !== 'reviewed' && visit.status !== 'closed' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(visit._id, 'reviewed')}
                                                            disabled={updatingVisitId === visit._id}
                                                            className="px-3 py-1.5 bg-blue-50 text-brand-sky rounded-lg text-xs font-bold hover:bg-blue-100 transition-all disabled:opacity-50 flex items-center gap-1"
                                                        >
                                                            <Eye className="w-3 h-3" />
                                                            Reviewed
                                                        </button>
                                                    )}
                                                    {visit.status !== 'action_required' && visit.status !== 'closed' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(visit._id, 'action_required')}
                                                            disabled={updatingVisitId === visit._id}
                                                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all disabled:opacity-50 flex items-center gap-1"
                                                        >
                                                            <AlertCircle className="w-3 h-3" />
                                                            Action
                                                        </button>
                                                    )}
                                                    {visit.status !== 'closed' && (
                                                        <button
                                                            onClick={async () => {
                                                                await handleStatusUpdate(visit._id, 'closed');
                                                                setBdmVisits(prev => prev.map(v => v._id === visit._id ? { ...v, status: 'closed' } : v));
                                                            }}
                                                            disabled={updatingVisitId === visit._id}
                                                            className="px-3 py-1.5 bg-green-50 text-brand-green rounded-lg text-xs font-bold hover:bg-green-100 transition-all disabled:opacity-50 flex items-center gap-1"
                                                        >
                                                            {updatingVisitId === visit._id
                                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                : <CheckCheck className="w-3 h-3" />
                                                            }
                                                            Close
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => { setNoteVisit(visit); setNoteText(''); }}
                                                        className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
                                                    >
                                                        Note
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-between items-center">
                            <p className="text-xs text-slate-400">{bdmVisits.length} visits loaded</p>
                            <button onClick={() => { setSelectedBdm(null); setBdmVisits([]); }} className="btn-ghost px-5">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Note Modal */}
            {noteVisit && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900">Add Admin Note</h3>
                            <button onClick={() => setNoteVisit(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-slate-600">
                                Visit: <strong>{noteVisit.meta?.companyName || noteVisit.studentInfo?.name || 'Untitled'}</strong>
                            </p>
                            
                            <div>
                                <label className="label mb-2 block">Which step (page) has the issue?</label>
                                <select 
                                    className="input-field text-sm"
                                    value={noteStepIndex}
                                    onChange={(e) => setNoteStepIndex(e.target.value)}
                                >
                                    <option value="">General Issue (Overall)</option>
                                    {visitFormSections.map((s, i) => (
                                        <option key={i} value={i}>
                                            Step {i + 1}: {s.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label mb-2 block">Instruction for the User</label>
                                <textarea
                                    rows={4}
                                    placeholder="e.g. Please update the promoter email address..."
                                    className="input-field text-sm resize-none w-full"
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setNoteVisit(null)} className="flex-1 btn-outline py-2.5">Cancel</button>
                            <button
                                onClick={handleAddNote}
                                disabled={!noteText.trim() || updatingVisitId === noteVisit._id}
                                className="flex-1 btn-primary py-2.5 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {updatingVisitId === noteVisit._id && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Instruction
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analytics;
