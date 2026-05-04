import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import UpcomingVisitsWidget from '../components/UpcomingVisitsWidget';
import {
    FileText, Clock, CheckCircle2, AlertCircle,
    TrendingUp, MapPin, Calendar, ArrowRight, PlusCircle,
    Users, XCircle, Lock, Unlock, Receipt, IndianRupee, Wallet,
    Briefcase, Activity, CheckCircle, ArrowUpRight
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';

const STATUS_CFG = {
    submitted:       { label: 'Pending Review',    bg: 'bg-orange-50',  ring: 'ring-brand-orange/20', text: 'text-brand-orange', dot: 'bg-brand-orange' },
    reviewed:        { label: 'Reviewed',           bg: 'bg-blue-50',   ring: 'ring-brand-sky/20',    text: 'text-brand-sky',    dot: 'bg-brand-sky'    },
    action_required: { label: 'Action Required',   bg: 'bg-red-50',    ring: 'ring-red-400/20',       text: 'text-red-600',      dot: 'bg-red-500'      },
    closed:          { label: 'Closed',             bg: 'bg-green-50',  ring: 'ring-brand-green/20',   text: 'text-brand-green',  dot: 'bg-brand-green'  },
    draft:           { label: 'Draft',              bg: 'bg-slate-50',  ring: 'ring-slate-200',        text: 'text-slate-500',    dot: 'bg-slate-400'    },
};

const EXPENSE_STATUS_CFG = {
    submitted:           { label: 'Submitted',       bg: 'bg-orange-50',  text: 'text-orange-600' },
    under_review:        { label: 'Under Review',    bg: 'bg-blue-50',    text: 'text-blue-600' },
    needs_justification: { label: 'Needs Justification', bg: 'bg-red-50', text: 'text-red-600' },
    approved:            { label: 'Approved',        bg: 'bg-green-50',   text: 'text-green-600' },
    paid:                { label: 'Paid',            bg: 'bg-emerald-50', text: 'text-emerald-700' },
    rejected:            { label: 'Rejected',        bg: 'bg-slate-100',  text: 'text-slate-600' },
    draft:               { label: 'Draft',           bg: 'bg-slate-50',   text: 'text-slate-500' }
};

const StatusDot = ({ status, isExpense }) => {
    const cfg = isExpense ? (EXPENSE_STATUS_CFG[status] || EXPENSE_STATUS_CFG.draft) : (STATUS_CFG[status] || STATUS_CFG.draft);
    if (isExpense) {
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
                {cfg.label}
            </span>
        );
    }
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text} ring-1 ${cfg.ring}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

const KPICard = ({ title, value, subtitle, icon: Icon, color, trend, trendIcon: TrendIcon }) => (
    <div className="card-hover group flex min-h-[132px] flex-col justify-between p-5">
        <div className="flex items-start justify-between">
            <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-meridian-sub">{title}</p>
                <div className="flex items-baseline gap-2">
                    <p className="truncate text-2xl font-black tracking-normal text-meridian-text sm:text-3xl">
                        {value ?? '—'}
                    </p>
                    {subtitle && <span className="text-sm font-semibold text-meridian-sub">{subtitle}</span>}
                </div>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-meridian-border bg-meridian-bg" style={{ color }}>
                <Icon className="w-5 h-5" />
            </div>
        </div>
        {trend && (
            <div className="mt-4 flex items-center gap-1.5">
                {TrendIcon && <TrendIcon className="w-4 h-4" style={{ color }} />}
                <p className="text-[11px] font-bold" style={{ color }}>{trend}</p>
            </div>
        )}
    </div>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="z-50 rounded-lg border border-meridian-border bg-white p-3 text-sm shadow-meridian-card">
            <p className="font-bold text-slate-800 mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="text-slate-600 flex justify-between gap-4">
                    <span>{p.name || 'Count'}:</span>
                    <span className="font-bold" style={{ color: p.color || p.fill }}>{p.value}</span>
                </p>
            ))}
        </div>
    );
};

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    // Data states
    const [stats, setStats] = useState(null);
    const [visits, setVisits] = useState([]);
    const [unlockRequests, setUnlockRequests] = useState([]);
    const [expenseSummary, setExpenseSummary] = useState(null);
    const [openActionItems, setOpenActionItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const isAccountsRole = user?.role === 'accounts';
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    const isUser = user?.role === 'user' || user?.role === 'home_visit';

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const requests = [];

                if (!isAccountsRole) {
                    requests.push(api.get('/analytics/summary'));
                    requests.push(api.get('/visits?limit=6'));
                    if (isAdmin) {
                        requests.push(api.get('/visits?unlockRequestSent=true'));
                    } else {
                        requests.push(Promise.resolve(null));
                    }
                } else {
                    requests.push(Promise.resolve(null), Promise.resolve(null), Promise.resolve(null));
                }

                const results = await Promise.all(requests);

                if (!isAccountsRole) {
                    setStats(results[0]?.data?.data);
                    setVisits(results[1]?.data?.data || []);
                    if (isAdmin && results[2]) setUnlockRequests(results[2]?.data?.data || []);
                    try {
                        const actionRes = await api.get('/visits/action-items/my-open');
                        setOpenActionItems(actionRes.data.data || []);
                    } catch { /* action item widget is non-blocking */ }
                }

                // Fetch expense summary for everyone
                try {
                    const expRes = await api.get('/expenses/claims/summary');
                    setExpenseSummary(expRes.data.data);
                } catch { /* ignore if expense module not ready */ }
                
            } catch (err) {
                console.error('Dashboard fetch error', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user, isAdmin, isAccountsRole]);

    const handleApproveUnlock = async (visitId) => {
        try {
            await api.put(`/visits/${visitId}/approve-unlock`, { unlock: true });
            setUnlockRequests(prev => prev.filter(v => v._id !== visitId));
            alert('Visit unlocked successfully');
        } catch (err) {
            alert('Failed to approve: ' + (err.response?.data?.message || err.message));
        }
    };

    if (loading) return (
        <div className="space-y-6 animate-pulse p-4">
            <div className="h-20 w-full rounded-lg bg-slate-200/50" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-lg bg-slate-200/50" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-80 rounded-lg bg-slate-200/50" />
                <div className="h-80 rounded-lg bg-slate-200/50" />
            </div>
        </div>
    );

    const trendData = (stats?.trends || []).map(t => ({ month: t._id, count: t.count }));
    const attentionNeeded = visits.filter(v => v.status === 'action_required');
    const overdueActionItems = openActionItems.filter(item => item.isOverdue);

    // Expense computations
    const expClaimStats = expenseSummary?.claimStats || [];
    const pendingExpClaims = expClaimStats.filter(s => ['submitted', 'under_review'].includes(s._id)).reduce((sum, s) => sum + s.count, 0);
    const totalExpAmount = expClaimStats.reduce((sum, s) => sum + (s.total || 0), 0);
    const approvedExpCount = expClaimStats.find(s => s._id === 'approved')?.count || 0;
    const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-8 page-enter pb-12">
            {/* Header Area */}
            <div className="flex flex-col justify-between gap-5 rounded-lg border border-meridian-border bg-white p-5 shadow-meridian-card md:flex-row md:items-center sm:p-6">
                <div>
                    <h1 className="text-2xl font-black tracking-normal text-meridian-text sm:text-3xl">
                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-indigo-600">{user.name.split(' ')[0]}</span> 👋
                    </h1>
                    <p className="mt-2 flex items-center gap-2 text-sm font-medium text-meridian-sub">
                        <Calendar className="w-4 h-4 text-meridian-blue" />
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    {isUser && (
                        <button onClick={() => navigate('/new-visit')} className="btn-primary shrink-0">
                            <PlusCircle className="w-4 h-4" /> New Visit
                        </button>
                    )}
                    <button onClick={() => navigate('/expenses/claims')} className="btn-secondary shrink-0">
                        <Receipt className="w-4 h-4 text-indigo-500" /> Manage Claims
                    </button>
                </div>
            </div>

            {/* --- ADMIN & SUPERADMIN VIEW --- */}
            {isAdmin && (
                <div className="space-y-8">
                    {/* Unified KPI Section */}
                    <div>
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 ml-2 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Organization Overview
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            <KPICard title="Total Visits" value={stats?.stats?.totalVisits ?? 0} icon={Briefcase} color="#284695" />
                            <KPICard title="Pending Visit Reviews" value={stats?.stats?.pendingReview ?? 0} icon={Clock} color="#EF7F1A" trend={`${stats?.stats?.actionRequired || 0} action required`} trendIcon={AlertCircle} />
                            <KPICard title="Pending Expense Claims" value={pendingExpClaims} icon={Receipt} color="#8B5CF6" />
                            <KPICard title="Total Expense Value" value={formatCurrency(totalExpAmount)} icon={IndianRupee} color="#10B981" subtitle="LTD" />
                        </div>
                    </div>

                    {/* Unlock Requests Alert */}
                    {unlockRequests.length > 0 && (
                        <div className="card border-blue-200 bg-gradient-to-r from-blue-50/50 to-white overflow-hidden p-0">
                            <div className="px-5 py-3 border-b border-blue-100 bg-brand-blue/10 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-brand-blue font-black text-xs uppercase tracking-widest">
                                    <Lock className="w-4 h-4" />
                                    Pending Unlock Requests
                                </div>
                                <span className="text-[10px] font-bold text-white bg-brand-blue px-2.5 py-1 rounded-full shadow-sm">
                                    {unlockRequests.length} Request{unlockRequests.length > 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {unlockRequests.map(visit => (
                                    <div key={visit._id} className="p-4 bg-white rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start gap-3 mb-4">
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-800 truncate">{visit.meta?.companyName || visit.studentInfo?.name || 'Untitled Report'}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1">By: {visit.submittedBy?.name || 'Unknown'}</p>
                                            </div>
                                            <div className="p-2 bg-red-50 rounded-xl text-red-500 group-hover:scale-110 transition-transform"><Lock className="w-4 h-4" /></div>
                                        </div>
                                        <button onClick={() => handleApproveUnlock(visit._id)} className="w-full py-2.5 bg-brand-blue text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                                            <Unlock className="w-3.5 h-3.5" /> Approve Unlock
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {openActionItems.length > 0 && (
                        <div className="card border-green-200 bg-gradient-to-r from-green-50/70 to-white overflow-hidden p-0">
                            <div className="px-5 py-3 border-b border-green-100 bg-green-100/60 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-green-700 font-black text-xs uppercase tracking-widest">
                                    <CheckCircle className="w-4 h-4" />
                                    Open Action Items
                                </div>
                                <span className="text-[10px] font-bold text-white bg-green-600 px-2.5 py-1 rounded-full shadow-sm">
                                    {overdueActionItems.length} overdue / {openActionItems.length} open
                                </span>
                            </div>
                            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                                {openActionItems.slice(0, 3).map(item => (
                                    <button key={item._id} onClick={() => navigate(`/edit-visit/${item.visitId}`)} className="text-left p-4 bg-white rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-all">
                                        <p className="text-sm font-black text-slate-800 line-clamp-2">{item.text}</p>
                                        <p className="text-[11px] font-bold text-slate-400 mt-2 truncate">{item.visitTitle}</p>
                                        <p className={`text-[10px] font-black uppercase tracking-wide mt-3 ${item.isOverdue ? 'text-red-600' : 'text-green-700'}`}>
                                            {item.isOverdue ? 'Overdue' : item.dueDate ? `Due ${new Date(item.dueDate).toLocaleDateString('en-IN')}` : 'No due date'}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Charts & Lists Row */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Visit Trends */}
                        <div className="card xl:col-span-2 p-6 sm:p-8 flex flex-col">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-brand-blue" /> Visit Trends
                                    </h3>
                                    <p className="text-sm font-medium text-slate-400 mt-1">Last 6 months progression</p>
                                </div>
                            </div>
                            <div className="flex-1 min-h-[280px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                        <Area type="monotone" dataKey="count" name="Visits" stroke="#3B82F6" strokeWidth={4} fill="url(#areaGrad)" activeDot={{ r: 6, fill: '#FFFFFF', stroke: '#3B82F6', strokeWidth: 2 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="flex flex-col gap-6">
                            {/* Recent Visits Mini-list */}
                            <div className="card flex flex-col flex-1">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><MapPin className="w-4 h-4 text-brand-blue" /> Recent Visits</h3>
                                    <button onClick={() => navigate('/visits')} className="text-xs font-semibold text-brand-sky hover:underline">View all</button>
                                </div>
                                <div className="space-y-2 flex-1">
                                    {visits.slice(0,4).map(visit => (
                                        <div key={visit._id} onClick={() => navigate(`/edit-visit/${visit._id}`)} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-brand-sky/30 hover:bg-blue-50/50 cursor-pointer transition-all">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-800 truncate">{visit.meta?.companyName || visit.studentInfo?.name || 'Untitled Report'}</p>
                                                <p className="text-[10px] text-slate-400 truncate">{visit.submittedBy?.name}</p>
                                            </div>
                                            <StatusDot status={visit.status} />
                                        </div>
                                    ))}
                                    {visits.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No visits found</p>}
                                </div>
                            </div>
                            
                            {/* Recent Claims Mini-list */}
                            {expenseSummary?.recentClaims?.length > 0 && (
                                <div className="card flex flex-col flex-1">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Receipt className="w-4 h-4 text-indigo-500" /> Recent Claims</h3>
                                        <button onClick={() => navigate('/expenses/claims')} className="text-xs font-semibold text-indigo-500 hover:underline">View all</button>
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        {expenseSummary.recentClaims.slice(0,3).map(claim => (
                                            <div key={claim._id} onClick={() => navigate(`/expenses/claims/${claim._id}`)} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer transition-all">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{claim.title}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{claim.submittedBy?.name}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-extrabold text-slate-700">{formatCurrency(claim.totalAmount)}</p>
                                                    <StatusDot status={claim.status} isExpense />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- USER VIEW --- */}
            {isUser && (
                <div className="space-y-8">
                    {/* User KPIs */}
                    <div>
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 ml-2 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> My Overview
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            <KPICard title="My Total Visits" value={stats?.stats?.totalVisits ?? 0} icon={Briefcase} color="#284695" />
                            <KPICard title="Pending Review" value={stats?.stats?.pendingReview ?? 0} icon={Clock} color="#EF7F1A" />
                            <KPICard title="Action Required" value={stats?.stats?.actionRequired ?? 0} icon={AlertCircle} color="#DC2626" />
                            <KPICard title="My Drafts" value={stats?.stats?.draftVisits ?? 0} icon={FileText} color="#64748B" />
                        </div>
                    </div>

                    {/* Action Required Banner */}
                    {attentionNeeded.length > 0 && (
                        <div className="card border-red-200 bg-gradient-to-r from-red-50 to-white overflow-hidden p-0">
                            <div className="px-5 py-3 border-b border-red-100 bg-red-100/50 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-widest">
                                    <AlertCircle className="w-4 h-4" /> Action Required by You
                                </div>
                                <span className="text-[10px] font-bold text-white bg-red-500 px-2.5 py-1 rounded-full shadow-sm">
                                    {attentionNeeded.length} Task{attentionNeeded.length > 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {attentionNeeded.map(visit => {
                                    const latestNote = visit.adminNotes?.[visit.adminNotes.length - 1];
                                    return (
                                        <div key={visit._id} onClick={() => navigate(`/edit-visit/${visit._id}${latestNote?.stepIndex !== undefined ? `?step=${latestNote.stepIndex}` : ''}`)} className="p-4 bg-white rounded-2xl border border-red-100 shadow-sm hover:shadow-md hover:border-red-300 transition-all cursor-pointer group">
                                            <div className="flex justify-between items-start gap-3 mb-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-slate-800 truncate group-hover:text-red-600 transition-colors">
                                                        {visit.meta?.companyName || visit.studentInfo?.name || 'Untitled Report'}
                                                    </p>
                                                    {latestNote?.stepName && <p className="text-[10px] font-bold text-red-500 uppercase tracking-tighter mt-1">Issue in {latestNote.stepName}</p>}
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                                    <ArrowRight className="w-4 h-4 text-red-500 group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-600 font-medium line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                "{latestNote?.note || 'Review required'}"
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {openActionItems.length > 0 && (
                        <div className="card border-green-200 bg-gradient-to-r from-green-50 to-white overflow-hidden p-0">
                            <div className="px-5 py-3 border-b border-green-100 bg-green-100/50 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-green-700 font-black text-xs uppercase tracking-widest">
                                    <CheckCircle className="w-4 h-4" /> My Open Action Items
                                </div>
                                <span className="text-[10px] font-bold text-white bg-green-600 px-2.5 py-1 rounded-full shadow-sm">
                                    {overdueActionItems.length} overdue
                                </span>
                            </div>
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {openActionItems.slice(0, 3).map(item => (
                                    <button key={item._id} onClick={() => navigate(`/edit-visit/${item.visitId}`)} className="p-4 bg-white rounded-2xl border border-green-100 shadow-sm hover:shadow-md hover:border-green-300 transition-all text-left">
                                        <p className="text-sm font-black text-slate-800 line-clamp-2">{item.text}</p>
                                        <p className="text-xs text-slate-500 font-bold mt-2 truncate">{item.visitTitle}</p>
                                        <p className={`text-[10px] font-black uppercase tracking-wide mt-3 ${item.isOverdue ? 'text-red-600' : 'text-green-700'}`}>
                                            {item.isOverdue ? 'Overdue' : item.dueDate ? `Due ${new Date(item.dueDate).toLocaleDateString('en-IN')}` : 'No due date'}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Two Column Layout for User */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Upcoming Visits */}
                        <div className="lg:col-span-2">
                            <UpcomingVisitsWidget />
                        </div>
                        {/* Recent Visits list */}
                        <div className="card flex flex-col">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-extrabold text-slate-800">Recent Submissions</h3>
                                <button onClick={() => navigate('/visits')} className="text-xs font-bold text-brand-sky hover:underline">View all</button>
                            </div>
                            <div className="space-y-3 flex-1">
                                {visits.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                                        <FileText className="w-10 h-10 text-slate-200 mb-3" />
                                        <p className="text-sm text-slate-400 font-medium">No visits yet</p>
                                    </div>
                                ) : visits.map(visit => (
                                    <div key={visit._id} onClick={() => navigate(`/edit-visit/${visit._id}`)} className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-brand-blue/30 hover:shadow-md cursor-pointer transition-all group">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate group-hover:text-brand-blue transition-colors">
                                                {visit.meta?.companyName || visit.studentInfo?.name || 'Untitled Report'}
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> {new Date(visit.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <StatusDot status={visit.status} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ACCOUNTS VIEW --- */}
            {isAccountsRole && (
                <div className="space-y-8">
                    <div>
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 ml-2 flex items-center gap-2">
                            <Wallet className="w-4 h-4" /> Financial Overview
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                            <KPICard title="Pending Claims" value={pendingExpClaims} icon={Clock} color="#EF7F1A" />
                            <KPICard title="Approved" value={approvedExpCount} icon={CheckCircle2} color="#10B981" />
                            <KPICard title="Total Claims" value={expClaimStats.reduce((sum, s) => sum + s.count, 0)} icon={Receipt} color="#284695" />
                            <KPICard title="Total Value" value={formatCurrency(totalExpAmount)} icon={IndianRupee} color="#8B5CF6" />
                        </div>
                    </div>

                    {expenseSummary?.recentClaims?.length > 0 && (
                        <div className="card max-w-4xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-extrabold text-lg text-slate-800 flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-indigo-500" /> Recent Expense Claims
                                </h3>
                                <button onClick={() => navigate('/expenses/claims')} className="btn-outline text-xs">
                                    View All Claims
                                </button>
                            </div>
                            <div className="space-y-3">
                                {expenseSummary.recentClaims.map(claim => (
                                    <div key={claim._id} onClick={() => navigate(`/expenses/claims/${claim._id}`)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-md cursor-pointer transition-all bg-slate-50/50 hover:bg-white">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                <Wallet className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-base font-bold text-slate-800">{claim.title}</p>
                                                <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-2">
                                                    <span>By {claim.submittedBy?.name}</span>
                                                    <span>&bull;</span>
                                                    <span>{claim.claimNumber}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                                            <p className="text-lg font-black text-slate-800">{formatCurrency(claim.totalAmount)}</p>
                                            <StatusDot status={claim.status} isExpense />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Shared Charts for Admin & Users (Status Overview) */}
            {!isAccountsRole && stats?.statusDist && stats.statusDist.length > 0 && (
                <div className="card p-6 sm:p-8">
                    <h3 className="font-extrabold text-lg text-slate-800 mb-8 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand-blue" /> Pipeline Status
                    </h3>
                    <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.statusDist.map(s => ({ name: STATUS_CFG[s._id]?.label || s._id, count: s.count }))} margin={{ left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={48}>
                                    {stats.statusDist.map((entry, index) => {
                                        const cfg = STATUS_CFG[entry._id] || STATUS_CFG.draft;
                                        // Simple color mapping based on status
                                        const color = entry._id === 'action_required' ? '#EF4444' : 
                                                      entry._id === 'submitted' ? '#F97316' : 
                                                      entry._id === 'reviewed' ? '#3B82F6' :
                                                      entry._id === 'closed' ? '#10B981' : '#94A3B8';
                                        return <Cell key={`cell-${index}`} fill={color} />;
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
