import React, { useEffect, useState } from 'react';
import { X, Loader2, Calendar, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';

const fmt = value => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date';

const AgentVisitsDrawer = ({ agentId, agentName, onClose }) => {
    const [visits, setVisits] = useState([]);
    const [status, setStatus] = useState('');
    const [offset, setOffset] = useState(0);
    const [pagination, setPagination] = useState({ total: 0, hasMore: false });
    const [loading, setLoading] = useState(false);
    const limit = 10;

    useEffect(() => {
        const loadVisits = async () => {
            if (!agentId) return;
            setLoading(true);
            try {
                const res = await api.get(`/agents/${agentId}/visits`, { params: { limit, offset, status: status || undefined } });
                setVisits(res.data.data || []);
                setPagination(res.data.pagination || { total: 0, hasMore: false });
            } catch (err) {
                console.error('Failed to load agent visits', err);
            } finally {
                setLoading(false);
            }
        };
        loadVisits();
    }, [agentId, offset, status]);

    return (
        <div className="fixed inset-0 z-[120] flex justify-end bg-slate-900/50 p-0 backdrop-blur-sm sm:p-3" onClick={onClose}>
            <div className="flex h-dvh w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl sm:h-full sm:rounded-2xl" onClick={e => e.stopPropagation()}>
                <div className="shrink-0 flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
                    <div>
                        <h3 className="text-lg font-black text-slate-800">Visit History</h3>
                        <p className="text-xs font-bold text-slate-400">{agentName}</p>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="shrink-0 border-b border-slate-100 p-4">
                    <select
                        value={status}
                        onChange={e => { setStatus(e.target.value); setOffset(0); }}
                        className="input-field h-10"
                    >
                        <option value="">All statuses</option>
                        <option value="submitted">Pending Review</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="action_required">Action Required</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="py-16 text-center text-sm font-bold text-slate-400">
                            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-brand-blue" />
                            Loading visits...
                        </div>
                    ) : visits.length === 0 ? (
                        <div className="py-16 text-center text-sm font-bold text-slate-400">No visits found.</div>
                    ) : (
                        <div className="space-y-3">
                            {visits.map(visit => (
                                <div key={visit._id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-black text-slate-800">{visit.title}</p>
                                            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-400">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {fmt(visit.submittedAt || visit.createdAt)}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-brand-blue/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-brand-blue">
                                            {visit.status}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                                        <span className="rounded-full bg-slate-50 px-2 py-1">{visit.submittedBy?.name || 'Unknown submitter'}</span>
                                        <span className="rounded-full bg-orange-50 px-2 py-1 text-brand-orange">{visit.actionItemsOpen} open items</span>
                                        {visit.rating && <span className="rounded-full bg-green-50 px-2 py-1 text-green-700">{visit.rating}/5 rating</span>}
                                    </div>
                                    {visit.reviewComment && (
                                        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">{visit.reviewComment}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="shrink-0 flex items-center justify-between border-t border-slate-100 p-4 text-xs font-bold text-slate-400">
                    <span>{pagination.total} total visits</span>
                    <div className="flex items-center gap-2">
                        <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="btn-outline px-3 py-2 text-xs disabled:opacity-40">Prev</button>
                        <button disabled={!pagination.hasMore} onClick={() => setOffset(offset + limit)} className="btn-outline px-3 py-2 text-xs disabled:opacity-40">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentVisitsDrawer;
