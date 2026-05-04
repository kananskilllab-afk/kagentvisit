import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, MapPin, Calendar, Users, IndianRupee, FileText,
    Clock, CheckCircle2, XCircle, AlertCircle, Upload, Pencil,
    Plus, Trash2, Loader2, ChevronDown, ChevronUp, ExternalLink,
    Camera, RefreshCw, Building2, Image
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '/api';

const STATUS_COLORS = {
    draft:       'bg-gray-100 text-gray-600',
    scheduled:   'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed:   'bg-green-100 text-green-700',
    cancelled:   'bg-red-100 text-red-600',
    closed:      'bg-gray-200 text-gray-700',
};

const SCHEDULE_STATUS_COLORS = {
    pending:   'bg-blue-50 text-blue-700',
    attended:  'bg-green-50 text-green-700',
    missed:    'bg-red-50 text-red-600',
    cancelled: 'bg-gray-50 text-gray-500',
};

const CLAIM_STATUS_COLORS = {
    draft:              'bg-gray-100 text-gray-600',
    submitted:          'bg-blue-100 text-blue-700',
    under_review:       'bg-yellow-100 text-yellow-700',
    approved:           'bg-green-100 text-green-700',
    rejected:           'bg-red-100 text-red-600',
    needs_justification:'bg-orange-100 text-orange-700',
    paid:               'bg-purple-100 text-purple-700',
};

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(d) {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtAmount(n) {
    return (n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}
function fmtLocations(plan) {
    if (plan?.cities?.length) {
        return plan.cities.map(c => [c.city, c.state].filter(Boolean).join(', ')).join(' | ');
    }
    return `${plan.city}${plan.state ? `, ${plan.state}` : ''}`;
}
function fmtPlanType(plan) {
    if (plan.planType === 'multi_city_same_state') return 'Multi-city';
    if (plan.planType === 'multi_same_city') return 'Multi-visit';
    return 'Single visit';
}

// ── Balance Progress Card ─────────────────────────────────────────────────────
function BalanceCard({ balance, claimCount }) {
    if (!balance) {
        return (
            <div className="rounded-lg border border-meridian-border bg-white p-4 text-sm text-meridian-text shadow-meridian-card">
                <div className="font-medium mb-1">No advance approved yet</div>
                <div className="text-xs text-blue-600">Create and submit an advance claim to get pre-approved funds.</div>
            </div>
        );
    }

    const pct = Math.min(100, ((balance.spentAmount || 0) / (balance.grantedAmount || 1)) * 100);
    const remaining = (balance.grantedAmount || 0) - (balance.spentAmount || 0);
    const isOver = remaining < 0;

    return (
        <div className="rounded-lg border border-meridian-border bg-white p-4 space-y-3 shadow-meridian-card">
            <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">Advance Balance</span>
                <span className={`text-sm font-bold ${isOver ? 'text-red-600' : 'text-green-700'}`}>
                    {isOver ? `Over by ${fmtAmount(Math.abs(remaining))}` : `${fmtAmount(remaining)} remaining`}
                </span>
            </div>
            <progress
                className={`h-2.5 w-full overflow-hidden rounded-full ${pct > 100 ? 'accent-red-500' : pct > 70 ? 'accent-yellow-500' : 'accent-green-500'}`}
                value={Math.min(balance.spentAmount || 0, balance.grantedAmount || 1)}
                max={balance.grantedAmount || 1}
            />
            <div className="flex justify-between text-xs text-gray-500">
                <span>Spent: {fmtAmount(balance.spentAmount)}</span>
                <span>Granted: {fmtAmount(balance.grantedAmount)}</span>
            </div>
            {balance.advanceClaimRef && (
                <div className="text-xs text-gray-400">Claim #{balance.advanceClaimRef.claimNumber}</div>
            )}
        </div>
    );
}

function ScheduleRow({ schedule, planId, uploads, onRefresh, canManage }) {
    const [uploading, setUploading] = useState(false);
    const fileRef = React.useRef();

    const scheduleUploads = uploads?.filter(u => u.refModel === 'VisitSchedule' && u.refId === schedule._id && u.context === 'client_photo') || [];

    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploading(true);
        try {
            let isFirst = scheduleUploads.length === 0;
            for (const file of files) {
                // 1. Upload binary
                const fd = new FormData();
                fd.append('photo', file);
                const ur = await fetch(`${API}/upload`, { method: 'POST', credentials: 'include', body: fd });
                const ud = await ur.json();
                if (!ud.success) throw new Error(ud.message);

                // 2. Register upload record
                const rr = await fetch(`${API}/uploads/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        url: ud.data.url, publicId: ud.data.publicId,
                        provider: ud.data.provider, context: 'client_photo',
                        mimeType: ud.data.mimeType, sizeBytes: ud.data.sizeBytes,
                        originalName: ud.data.originalName,
                        refModel: 'VisitSchedule', refId: schedule._id
                    })
                });
                const rd = await rr.json();
                if (!rd.success) throw new Error(rd.message);

                // 3. Attach to schedule (for verification status tracking)
                if (isFirst) {
                    await fetch(`${API}/visit-plans/${planId}/schedules/${schedule._id}/client-photo`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ uploadId: rd.data._id })
                    });
                    isFirst = false;
                }
            }
            onRefresh();
        } catch (err) {
            alert(err.message);
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const photo = schedule.clientPhoto;
    const photoStatus = photo?.verificationStatus;

    return (
        <div className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SCHEDULE_STATUS_COLORS[schedule.status || 'pending']}`}>
                        {schedule.status || 'pending'}
                    </span>
                    <span className="text-sm font-medium text-gray-800 truncate">{schedule.title}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(schedule.scheduledDate)} · {fmtTime(schedule.scheduledDate)}</span>
                    {schedule.agentId && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{schedule.agentId.name}</span>}
                    {schedule.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{schedule.location}</span>}
                </div>
            </div>

            {/* Client photos */}
            <div className="flex-shrink-0 flex flex-col items-end gap-1">
                <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[150px]">
                    {scheduleUploads.map(u => (
                        <a key={u._id} href={u.url} target="_blank" rel="noreferrer" className="block hover:opacity-80 transition-opacity">
                            <img src={u.url} alt="Client" className="w-8 h-8 rounded object-cover border border-gray-200" />
                        </a>
                    ))}
                    
                    {canManage && (
                        <>
                            <input type="file" multiple accept="image/*" ref={fileRef} className="hidden" onChange={handlePhotoUpload} />
                            <button onClick={() => fileRef.current?.click()}
                                disabled={uploading}
                                className="flex items-center justify-center w-8 h-8 bg-gray-50 text-gray-500 hover:text-orange-600 border border-gray-200 hover:border-orange-200 rounded transition-colors"
                                title="Upload Photo">
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </button>
                        </>
                    )}
                    {!canManage && scheduleUploads.length === 0 && (
                        <span className="text-xs text-orange-500">Photo required</span>
                    )}
                </div>
                {photoStatus && scheduleUploads.length > 0 && (
                    <span className={`text-[10px] font-medium ${
                        photoStatus === 'verified' ? 'text-green-600' :
                        photoStatus === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                    }`}>{photoStatus}</span>
                )}
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function VisitPlanDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState('overview');
    const [cancelling, setCancelling] = useState(false);

    const isOwner = data && (user._id === String(data.plan.owner?._id) || user._id === String(data.plan.owner));
    const canManage = isOwner || ['admin', 'hod', 'accounts', 'superadmin'].includes(user?.role);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`${API}/visit-plans/${id}`, { credentials: 'include' });
            const d = await r.json();
            if (!d.success) throw new Error(d.message);
            setData(d.data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCancel = async () => {
        if (!window.confirm('Cancel this visit plan? All pending schedules will also be cancelled.')) return;
        setCancelling(true);
        try {
            const r = await fetch(`${API}/visit-plans/${id}/cancel`, { method: 'POST', credentials: 'include' });
            const d = await r.json();
            if (!d.success) throw new Error(d.message);
            fetchData();
        } catch (e) {
            alert(e.message);
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
        );
    }
    if (error) {
        return (
            <div className="p-6 text-red-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" /> {error}
            </div>
        );
    }

    const { plan, schedules, balance, claims, uploads } = data;

    const TABS = [
        { key: 'overview', label: 'Overview' },
        { key: 'schedules', label: `Schedules (${schedules?.length || 0})` },
        { key: 'financials', label: 'Financials' },
        { key: 'documents', label: `Documents (${uploads?.length || 0})` },
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
            {/* ── Header ── */}
            <div className="card flex items-start gap-3">
                <button onClick={() => navigate('/calendar')} className="mt-0.5 text-meridian-sub hover:text-meridian-text">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-black text-meridian-text truncate">{plan.title}</h1>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[plan.status]}`}>
                            {plan.status}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-meridian-sub">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{fmtLocations(plan)}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(plan.plannedStartAt)} – {fmtDate(plan.plannedEndAt)}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{plan.agents?.length || 0} agent{plan.agents?.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                {/* Actions */}
                {canManage && !['completed','closed','cancelled'].includes(plan.status) && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => navigate(`/expenses/claims/new?planId=${plan._id}&type=advance`)}
                            className="btn-primary px-3 py-1.5 text-xs">
                            Create claim
                        </button>
                        <button onClick={handleCancel} disabled={cancelling}
                            className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50 border border-red-200">
                            {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cancel plan'}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Balance bar (always visible) ── */}
            <BalanceCard balance={balance} claimCount={claims?.length || 0} />

            {/* ── Tabs ── */}
            <div className="rounded-lg border border-meridian-border bg-white p-1 shadow-meridian-card">
                <div className="flex gap-1 overflow-x-auto">
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`rounded-md px-4 py-2 text-sm font-bold transition-colors whitespace-nowrap
                                ${tab === t.key ? 'bg-meridian-navy text-white' : 'text-meridian-sub hover:bg-meridian-bg hover:text-meridian-text'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Overview ── */}
            {tab === 'overview' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                            { label: 'Plan type', value: fmtPlanType(plan) },
                            { label: 'City tier', value: plan.cityTier?.replace('_', ' ') || '—' },
                            { label: 'Purpose', value: plan.purpose || '—' },
                        ].map(({ label, value }) => (
                            <div key={label} className="rounded-lg border border-meridian-border bg-white p-3 shadow-meridian-card">
                                <div className="text-xs text-meridian-sub mb-0.5">{label}</div>
                                <div className="text-sm font-bold text-meridian-text">{value}</div>
                            </div>
                        ))}
                    </div>

                    {plan.agents?.length > 0 && (
                        <div>
                            <div className="text-xs font-semibold text-gray-500 mb-2">Assigned agents</div>
                            <div className="flex flex-wrap gap-2">
                                {plan.agents.map(a => (
                                    <div key={a._id} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
                                        <div className="w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-xs flex items-center justify-center font-bold">
                                            {(a.name || '?').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium text-gray-800">{a.name}</div>
                                            {a.city && <div className="text-[10px] text-gray-500">{a.city}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {plan.notes && (
                        <div className="text-sm text-gray-600 italic border-l-2 border-gray-200 pl-3">{plan.notes}</div>
                    )}
                </div>
            )}

            {/* ── Schedules ── */}
            {tab === 'schedules' && (
                <div className="space-y-3">
                    {!schedules || schedules.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No schedules yet.</p>
                        </div>
                    ) : (
                        schedules.map(s => (
                            <ScheduleRow key={s._id} schedule={s} planId={plan._id} uploads={uploads} onRefresh={fetchData} canManage={canManage} />
                        ))
                    )}
                </div>
            )}

            {/* ── Financials ── */}
            {tab === 'financials' && (
                <div className="space-y-4">
                    {claims && claims.length > 0 ? (
                        <div className="space-y-2">
                            {claims.map(c => (
                                <div key={c._id}
                                    onClick={() => navigate(`/expenses/claims/${c._id}`)}
                                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:shadow-sm cursor-pointer transition-shadow">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CLAIM_STATUS_COLORS[c.status]}`}>
                                                {c.status}
                                            </span>
                                            <span className="text-xs text-gray-500 font-medium">{c.claimType}</span>
                                            {c.claimNumber && <span className="text-xs text-gray-400">#{c.claimNumber}</span>}
                                        </div>
                                        <div className="text-sm font-medium text-gray-800 mt-1 truncate">{c.title}</div>
                                    </div>
                                    <div className="text-sm font-bold text-gray-900 flex-shrink-0">
                                        {fmtAmount(c.approvedAmount ?? c.totalAmount)}
                                    </div>
                                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-400 text-sm">No claims yet.</div>
                    )}

                    {canManage && !['completed','closed','cancelled'].includes(plan.status) && (
                        <div className="flex gap-2">
                            <button onClick={() => navigate(`/expenses/claims/new?planId=${plan._id}&type=advance`)}
                                className="flex-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg py-2 hover:bg-blue-100 transition-colors">
                                + Advance claim
                            </button>
                            <button onClick={() => navigate(`/expenses/claims/new?planId=${plan._id}&type=reimbursement`)}
                                className="flex-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg py-2 hover:bg-green-100 transition-colors">
                                + Reimbursement
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Documents ── */}
            {tab === 'documents' && (
                <div className="space-y-3">
                    {!uploads || uploads.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">
                            <Upload className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            No documents attached.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {uploads.map(u => (
                                <a key={u._id} href={u.url} target="_blank" rel="noreferrer"
                                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
                                    {u.mimeType?.startsWith('image/') ? (
                                        <img src={u.url} alt={u.originalName} className="w-full h-28 object-cover" />
                                    ) : (
                                        <div className="w-full h-28 bg-gray-50 flex items-center justify-center text-gray-400">
                                            <FileText className="w-8 h-8" />
                                        </div>
                                    )}
                                    <div className="p-2">
                                        <div className="text-xs font-medium text-gray-700 truncate">{u.originalName || u.context}</div>
                                        <div className="text-[10px] text-gray-400">{u.context?.replace('_', ' ')}</div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
