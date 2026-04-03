import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
    FileText, Clock, CheckCircle2, AlertCircle,
    TrendingUp, MapPin, Calendar, ArrowRight, PlusCircle,
    Users, XCircle, Lock, Unlock
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

const STATUS_CFG = {
    submitted:       { label: 'Pending Review',    bg: 'bg-orange-50',  ring: 'ring-brand-orange/20', text: 'text-brand-orange', dot: 'bg-brand-orange' },
    reviewed:        { label: 'Reviewed',           bg: 'bg-blue-50',   ring: 'ring-brand-sky/20',    text: 'text-brand-sky',    dot: 'bg-brand-sky'    },
    action_required: { label: 'Action Required',   bg: 'bg-red-50',    ring: 'ring-red-400/20',       text: 'text-red-600',      dot: 'bg-red-500'      },
    closed:          { label: 'Closed',             bg: 'bg-green-50',  ring: 'ring-brand-green/20',   text: 'text-brand-green',  dot: 'bg-brand-green'  },
    draft:           { label: 'Draft',              bg: 'bg-slate-50',  ring: 'ring-slate-200',        text: 'text-slate-500',    dot: 'bg-slate-400'    },
};

const StatusDot = ({ status }) => {
    const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text} ring-1 ${cfg.ring}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

const KPICard = ({ title, value, icon: Icon, color, bgColor, trend }) => (
    <div className="card hover:shadow-card-lg transition-all duration-200 group">
        <div className="flex items-start justify-between">
            <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-extrabold tracking-tight" style={{ color }}>{value ?? '—'}</p>
            </div>
            <div className="p-2.5 rounded-xl group-hover:scale-110 transition-transform" style={{ backgroundColor: bgColor }}>
                <Icon className="w-5 h-5" style={{ color }} />
            </div>
        </div>
        {trend !== undefined && (
            <p className="mt-3 text-[11px] font-medium text-slate-400">{trend}</p>
        )}
    </div>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white rounded-xl shadow-card-lg border border-slate-100 p-3 text-sm">
            <p className="font-bold text-slate-800 mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="text-slate-600">
                    <span className="font-semibold" style={{ color: p.color }}>{p.value}</span> visits
                </p>
            ))}
        </div>
    );
};

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);

    const [unlockRequests, setUnlockRequests] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
                const requests = [
                    api.get('/analytics/summary'),
                    api.get('/visits?limit=6')
                ];

                if (isAdmin) {
                    requests.push(api.get('/visits?unlockRequestSent=true'));
                }

                const [sRes, vRes, uRes] = await Promise.all(requests);
                
                setStats(sRes.data.data);
                setVisits(vRes.data.data || []);
                if (uRes) setUnlockRequests(uRes.data.data || []);
            } catch (err) {
                console.error('Dashboard fetch error', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [user]);

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
        <div className="space-y-6 animate-pulse">
            <div className="h-10 w-72 bg-slate-200 rounded-xl" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-80 bg-slate-200 rounded-2xl" />
                <div className="h-80 bg-slate-200 rounded-2xl" />
            </div>
        </div>
    );

    const isUser = user.role === 'user' || user.role === 'home_visit';
    const trendData = (stats?.trends || []).map(t => ({ month: t._id, count: t.count }));
    const attentionNeeded = visits.filter(v => v.status === 'action_required');

    const kpis = [
        {
            title:   isUser ? 'My Total Visits' : 'Total Visits',
            value:   stats?.stats?.totalVisits ?? 0,
            icon:    FileText,
            color:   '#284695',
            bgColor: '#EEF4FF',
        },
        {
            title:   'Pending Review',
            value:   stats?.stats?.pendingReview ?? 0,
            icon:    Clock,
            color:   '#EF7F1A',
            bgColor: '#FFF4EA',
        },
        {
            title:   'Action Required',
            value:   stats?.stats?.actionRequired ?? 0,
            icon:    AlertCircle,
            color:   '#DC2626',
            bgColor: '#FEF2F2',
        },
        isUser
            ? { title: 'My Drafts', value: stats?.statusDist?.find(s => s._id === 'draft')?.count ?? 0, icon: XCircle,      color: '#64748B', bgColor: '#F8FAFC' }
            : { title: 'Active Users', value: stats?.stats?.activeUsers ?? 0,                            icon: Users,       color: '#009846', bgColor: '#ECFDF5' },
    ];

    return (
        <div className="space-y-6 page-enter">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">
                        Hello, {user.name.split(' ')[0]} 👋
                    </h1>
                    <p className="page-subtitle flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                {isUser && (
                    <button
                        onClick={() => navigate('/new-visit')}
                        className="btn-primary shrink-0"
                    >
                        <PlusCircle className="w-4 h-4" />
                        New Visit Report
                    </button>
                )}
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {kpis.map(k => <KPICard key={k.title} {...k} />)}
            </div>

            {/* Admin: Unlock Requests Section */}
            {(user?.role === 'admin' || user?.role === 'superadmin') && unlockRequests.length > 0 && (
                <div className="card border-blue-100 bg-brand-blue/5 overflow-hidden">
                    <div className="px-5 py-3 border-b border-blue-100 bg-brand-blue/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-brand-blue font-black text-xs uppercase tracking-widest">
                            <Lock className="w-4 h-4" />
                            Pending Unlock Requests
                        </div>
                        <span className="text-[10px] font-bold text-brand-blue bg-white px-2 py-0.5 rounded-full border border-blue-100">
                            {unlockRequests.length} Request{unlockRequests.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {unlockRequests.map(visit => (
                            <div 
                                key={visit._id}
                                className="p-4 bg-white rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex justify-between items-start gap-3 mb-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-slate-800 truncate">
                                            {visit.meta?.companyName || visit.studentInfo?.name || 'Untitled Report'}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                            By: {visit.submittedBy?.name || 'Unknown'}
                                        </p>
                                    </div>
                                    <div className="p-2 bg-red-50 rounded-lg text-red-500">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleApproveUnlock(visit._id)}
                                    className="w-full py-2 bg-brand-blue text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-brand-blue-dark transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20"
                                >
                                    <Unlock className="w-3.5 h-3.5" />
                                    Approve Unlock
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Attention Needed Section (Surveyor Only) */}
            {isUser && attentionNeeded.length > 0 && (
                <div className="card border-red-100 bg-red-50/20 overflow-hidden">
                    <div className="px-5 py-3 border-b border-red-100 bg-red-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-widest">
                            <AlertCircle className="w-4 h-4" />
                            Action Required by You
                        </div>
                        <span className="text-[10px] font-bold text-red-400 bg-white px-2 py-0.5 rounded-full border border-red-100">
                            {attentionNeeded.length} Task{attentionNeeded.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {attentionNeeded.map(visit => {
                            const latestNote = visit.adminNotes?.[visit.adminNotes.length - 1];
                            return (
                                <div 
                                    key={visit._id}
                                    onClick={() => navigate(`/edit-visit/${visit._id}${latestNote?.stepIndex !== undefined ? `?step=${latestNote.stepIndex}` : ''}`)}
                                    className="p-4 bg-white rounded-2xl border border-red-100 shadow-sm hover:shadow-md hover:border-red-200 transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start gap-3 mb-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-800 truncate group-hover:text-red-600 transition-colors">
                                                {visit.meta?.companyName || visit.studentInfo?.name || 'Untitled Report'}
                                            </p>
                                            {latestNote?.stepName && (
                                                <p className="text-[10px] font-black text-red-500 uppercase tracking-tighter mt-0.5">
                                                    Issue in {latestNote.stepName}
                                                </p>
                                            )}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-red-300 group-hover:translate-x-1 transition-all" />
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                                        "{latestNote?.note || 'No specific instruction provided'}"
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Charts + Recent */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Trend Chart */}
                <div className="lg:col-span-2 card">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-brand-sky" />
                                Visit Trends
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">Last 6 months</p>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#00A0E3" stopOpacity={0.15}/>
                                        <stop offset="95%" stopColor="#00A0E3" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} dy={6} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="count" stroke="#00A0E3" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ fill: '#00A0E3', r: 4 }} activeDot={{ r: 5, fill: '#284695' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Visits */}
                <div className="card flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800">Recent Submissions</h3>
                        <button onClick={() => navigate('/visits')} className="text-xs font-semibold text-brand-sky hover:underline flex items-center gap-1">
                            View all <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="space-y-3 flex-1">
                        {visits.length === 0 && (
                            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                                <FileText className="w-10 h-10 text-slate-200 mb-3" />
                                <p className="text-sm text-slate-400">No visits yet</p>
                            </div>
                        )}
                        {visits.map(visit => (
                            <div
                                key={visit._id}
                                onClick={() => navigate(`/edit-visit/${visit._id}`)}
                                className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:border-brand-sky/30 hover:bg-blue-50/30 cursor-pointer transition-all group"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-brand-blue transition-colors">
                                        {visit.meta?.companyName || visit.studentInfo?.name || 'Untitled Report'}
                                    </p>
                                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                                        <MapPin className="w-3 h-3 shrink-0" />
                                        {(visit.location?.city || visit.location?.address || visit.agencyProfile?.address || 'No address')?.substring(0, 28)}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right space-y-1">
                                    <StatusDot status={visit.status} />
                                    <p className="text-[10px] text-slate-400">{new Date(visit.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {!isUser && (
                        <button
                            onClick={() => navigate('/visits')}
                            className="mt-4 w-full py-2.5 text-sm font-semibold text-brand-sky bg-brand-sky/5 rounded-xl hover:bg-brand-sky/10 transition-all border border-brand-sky/10"
                        >
                            View All History
                        </button>
                    )}
                </div>
            </div>

            {/* Status Distribution Bar */}
            {stats?.statusDist && stats.statusDist.length > 0 && (
                <div className="card">
                    <h3 className="font-bold text-slate-800 mb-5">Status Overview</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.statusDist.map(s => ({ name: STATUS_CFG[s._id]?.label || s._id, count: s.count }))} margin={{ left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" fill="#284695" radius={[6, 6, 0, 0]} barSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
