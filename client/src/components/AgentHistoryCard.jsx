import React, { useEffect, useState } from 'react';
import { Calendar, ClipboardList, Loader2, Star, History, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import AgentVisitsDrawer from './AgentVisitsDrawer';

const fmt = value => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';

const Kpi = ({ label, value, icon: Icon }) => (
    <div className="rounded-xl bg-slate-50 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <Icon className="h-3.5 w-3.5" />
            {label}
        </div>
        <p className="text-base font-black text-slate-800">{value ?? '-'}</p>
    </div>
);

const AgentHistoryCard = ({ agentId, agentName, compact = false, onOpenItems }) => {
    const { user } = useAuth();
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        const loadHistory = async () => {
            if (!agentId || user?.role === 'home_visit') return;
            setLoading(true);
            setError('');
            try {
                const res = await api.get(`/agents/${agentId}/history`);
                setHistory(res.data.data);
                onOpenItems?.(res.data.data?.openItems || []);
            } catch (err) {
                setError(err.response?.data?.message || 'History unavailable');
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, [agentId, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!agentId || user?.role === 'home_visit') return null;

    return (
        <div className={`rounded-2xl border border-slate-100 bg-white shadow-sm ${compact ? 'p-3' : 'p-4'} space-y-3`}>
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <h4 className="truncate text-sm font-black text-slate-800">{agentName || history?.agent?.name || 'Agent History'}</h4>
                    <p className="text-[11px] font-bold text-slate-400">Prior visits and open follow-ups</p>
                </div>
                <button type="button" onClick={() => setDrawerOpen(true)} className="btn-outline px-3 py-2 text-xs" disabled={!history}>
                    <History className="h-3.5 w-3.5" />
                    View all
                </button>
            </div>

            {loading ? (
                <div className="py-5 text-center text-xs font-bold text-slate-400">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-brand-blue" />
                    Loading history...
                </div>
            ) : error ? (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            ) : history && (
                <>
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                        <Kpi label="Visits" value={history.kpis?.totalVisits || 0} icon={ClipboardList} />
                        <Kpi label="Last Visit" value={fmt(history.kpis?.lastVisitDate)} icon={Calendar} />
                        <Kpi label="Open Items" value={history.kpis?.openActionItems || 0} icon={AlertCircle} />
                        <Kpi label="Avg Rating" value={history.kpis?.avgRating ? `${history.kpis.avgRating}/5` : '-'} icon={Star} />
                    </div>

                    <div className="space-y-2">
                        {(history.visits || []).slice(0, compact ? 3 : 5).map(visit => (
                            <div key={visit._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-black text-slate-800">{visit.title}</p>
                                    <p className="text-[11px] font-bold text-slate-400">{fmt(visit.submittedAt || visit.createdAt)}</p>
                                </div>
                                <span className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">{visit.status}</span>
                            </div>
                        ))}
                        {(!history.visits || history.visits.length === 0) && (
                            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs font-bold text-slate-400">No prior visits.</div>
                        )}
                    </div>
                </>
            )}

            {drawerOpen && (
                <AgentVisitsDrawer
                    agentId={agentId}
                    agentName={agentName || history?.agent?.name}
                    onClose={() => setDrawerOpen(false)}
                />
            )}
        </div>
    );
};

export default AgentHistoryCard;
