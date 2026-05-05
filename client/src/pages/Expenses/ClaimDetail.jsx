import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
    ArrowLeft, FileText, Loader2, MapPin, Calendar, IndianRupee,
    CheckCircle2, XCircle, AlertTriangle, Eye, Clock, Banknote,
    Send, MessageSquare, User as UserIcon, Plane, Train, Bus, Car,
    Hotel, UtensilsCrossed, Users, Wifi, ParkingCircle, Stamp,
    Package, PenLine, Navigation, Receipt,
    ShieldCheck, ShieldAlert, ShieldX, Brain, Sparkles, RefreshCw,
    Info, Building2, ExternalLink
} from 'lucide-react';

const STATUS_CFG = {
    draft:               { label: 'Draft',              icon: FileText,       color: 'text-slate-500',   bg: 'bg-slate-50',   ring: 'ring-slate-200',   line: 'bg-slate-300' },
    submitted:           { label: 'Submitted',          icon: Clock,          color: 'text-orange-600',  bg: 'bg-orange-50',  ring: 'ring-orange-200',  line: 'bg-orange-400' },
    under_review:        { label: 'Under Review',       icon: Eye,            color: 'text-blue-600',    bg: 'bg-blue-50',    ring: 'ring-blue-200',    line: 'bg-blue-400' },
    approved:            { label: 'Approved',           icon: CheckCircle2,   color: 'text-green-600',   bg: 'bg-green-50',   ring: 'ring-green-200',   line: 'bg-green-500' },
    rejected:            { label: 'Rejected',           icon: XCircle,        color: 'text-red-600',     bg: 'bg-red-50',     ring: 'ring-red-200',     line: 'bg-red-500' },
    needs_justification: { label: 'Needs Justification', icon: AlertTriangle, color: 'text-amber-600',   bg: 'bg-amber-50',   ring: 'ring-amber-200',   line: 'bg-amber-400' },
    paid:                { label: 'Paid',               icon: Banknote,       color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200', line: 'bg-emerald-500' },
};

const CATEGORY_META = {
    flight: { label: 'Flight', icon: Plane }, train: { label: 'Train', icon: Train },
    bus: { label: 'Bus', icon: Bus }, cab: { label: 'Cab', icon: Car },
    metro: { label: 'Metro', icon: Train }, hotel: { label: 'Hotel', icon: Hotel },
    food: { label: 'Food', icon: UtensilsCrossed }, agent_entertainment: { label: 'Agent', icon: Users },
    internet_phone: { label: 'Internet', icon: Wifi }, parking_toll: { label: 'Parking', icon: ParkingCircle },
    visa_passport: { label: 'Visa', icon: Stamp }, office_supplies: { label: 'Supplies', icon: Package },
    other: { label: 'Other', icon: PenLine },
};

const SEVERITY_CFG = {
    info:     { icon: Info,            color: 'text-blue-600',  bg: 'bg-blue-50',  ring: 'ring-blue-200',  label: 'Info' },
    warning:  { icon: AlertTriangle,   color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200', label: 'Warning' },
    critical: { icon: XCircle,         color: 'text-red-600',   bg: 'bg-red-50',   ring: 'ring-red-200',   label: 'Critical' },
};

const AUDIT_STATUS_CFG = {
    compliant: { icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50', ring: 'ring-green-200', label: 'Compliant', gradient: 'from-green-500 to-emerald-400' },
    warning:   { icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200', label: 'Warning',   gradient: 'from-amber-400 to-yellow-400' },
    violation: { icon: ShieldX,     color: 'text-red-600',   bg: 'bg-red-50',   ring: 'ring-red-200',   label: 'Violation', gradient: 'from-red-500 to-rose-400' },
};

function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPlanLocations(plan) {
    if (!plan) return '-';
    if (plan.cities?.length) {
        return plan.cities.map(c => [c.city, c.state].filter(Boolean).join(', ')).join(' | ');
    }
    return [plan.city, plan.state].filter(Boolean).join(', ') || '-';
}

const ClaimDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [claim, setClaim] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusForm, setStatusForm] = useState({ status: '', comment: '', approvedAmount: '' });
    const [justification, setJustification] = useState('');
    const [auditLoading, setAuditLoading] = useState(false);

    // Only accounts + superadmin can approve/reject/change status
    const canApprove = ['accounts', 'superadmin'].includes(user?.role);
    const canAudit = ['admin', 'accounts', 'superadmin'].includes(user?.role);
    const isPrivileged = ['admin', 'superadmin', 'accounts'].includes(user?.role);
    const isOwner = claim?.submittedBy?._id === user?._id;

    useEffect(() => { fetchClaim(); }, [id]);

    const fetchClaim = async () => {
        try {
            const res = await api.get(`/expenses/claims/${id}`);
            setClaim(res.data.data);
        } catch (err) {
            console.error('Failed to fetch claim', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitClaim = async () => {
        setActionLoading(true);
        try {
            await api.post(`/expenses/claims/${id}/submit`, { justificationNote: justification || undefined });
            fetchClaim();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStatusUpdate = async (e) => {
        e.preventDefault();
        if (!statusForm.status) return;
        setActionLoading(true);
        try {
            await api.put(`/expenses/claims/${id}/status`, {
                status: statusForm.status,
                comment: statusForm.comment,
                approvedAmount: statusForm.approvedAmount ? parseFloat(statusForm.approvedAmount) : undefined
            });
            setShowStatusModal(false);
            setStatusForm({ status: '', comment: '', approvedAmount: '' });
            fetchClaim();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update status');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAudit = async () => {
        setAuditLoading(true);
        try {
            const res = await api.post(`/expenses/claims/${id}/audit`);
            setClaim(prev => ({ ...prev, aiAudit: res.data.data }));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to run audit');
        } finally {
            setAuditLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading claim...
            </div>
        );
    }

    if (!claim) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-500 font-bold">Claim not found</p>
                <button onClick={() => navigate('/expenses/claims')} className="mt-3 text-brand-blue font-bold text-sm hover:underline">
                    Back to Claims
                </button>
            </div>
        );
    }

    const statusCfg = STATUS_CFG[claim.status] || STATUS_CFG.draft;
    const StatusIcon = statusCfg.icon;
    const audit = claim.aiAudit;
    const auditCfg = audit?.overallStatus ? AUDIT_STATUS_CFG[audit.overallStatus] : null;
    const plan = claim.visitPlanRef;

    return (
        <div className="space-y-6 page-enter max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start gap-4">
                <button onClick={() => navigate('/expenses/claims')} className="p-2 rounded-xl hover:bg-slate-100 transition-all mt-1">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="page-title">{claim.title}</h1>
                        <code className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">{claim.claimNumber}</code>
                    </div>
                    <p className="page-subtitle mt-1">{claim.travelPurpose || 'No travel purpose specified'}</p>
                </div>
            </div>

            {/* Status Banner */}
            <div className={`card p-5 ${statusCfg.bg} ring-1 ${statusCfg.ring}`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-white/80 ${statusCfg.color}`}>
                            <StatusIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className={`text-lg font-extrabold ${statusCfg.color}`}>{statusCfg.label}</p>
                            {claim.reviewedBy && (
                                <p className="text-xs text-slate-500">
                                    by {claim.reviewedBy.name} on {new Date(claim.reviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Claim Amount</p>
                        <p className="text-2xl font-extrabold text-slate-800 flex items-center gap-0.5">
                            <IndianRupee className="w-5 h-5" />
                            {claim.totalAmount?.toLocaleString('en-IN')}
                        </p>
                        {claim.approvedAmount != null && claim.approvedAmount !== claim.totalAmount && (
                            <p className="text-sm text-green-600 font-bold">
                                Approved: {claim.approvedAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {plan && (
                <div className="card p-5 border border-blue-100 bg-blue-50/30">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">Planned Visit</p>
                            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-blue-600" />
                                {plan.title}
                            </h2>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {formatPlanLocations(plan)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(plan.plannedStartAt)} - {formatDate(plan.plannedEndAt)}
                                </span>
                                <span className="capitalize">{plan.status?.replace('_', ' ')}</span>
                                <span className="capitalize">{claim.claimType}</span>
                            </div>
                            {plan.purpose && <p className="text-xs text-slate-500 mt-2">{plan.purpose}</p>}
                        </div>
                        {isPrivileged && (
                            <button
                                onClick={() => navigate(`/visit-plans/${plan._id}`)}
                                className="btn-outline flex items-center gap-2 text-xs"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Open Plan
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Needs Justification notice for owner */}
            {isOwner && claim.status === 'needs_justification' && (
                <div className="card p-4 bg-amber-50 border border-amber-200 space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-amber-100">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="font-bold text-amber-800">Justification Required</p>
                            <p className="text-xs text-amber-700 mt-0.5">Your claim has been returned. Please review the reviewer's message below and resubmit with justification.</p>
                        </div>
                    </div>
                    {claim.statusHistory?.slice().reverse().find(h => h.status === 'needs_justification')?.comment && (
                        <div className="p-3 rounded-xl bg-white border border-amber-200">
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Reviewer's Message</p>
                            <p className="text-sm text-slate-700 leading-relaxed">
                                {claim.statusHistory.slice().reverse().find(h => h.status === 'needs_justification').comment}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
                {isOwner && ['draft', 'needs_justification'].includes(claim.status) && (
                    <>
                        {claim.status === 'needs_justification' && (
                            <div className="w-full mb-2">
                                <label className="label">Your Justification *</label>
                                <textarea
                                    className="input-field min-h-[80px]"
                                    placeholder="Address each point raised by the reviewer. e.g. 'The hotel receipt is attached. The food expense was a team lunch for 4 people — receipts attached.'"
                                    value={justification}
                                    onChange={(e) => setJustification(e.target.value)}
                                />
                            </div>
                        )}
                        <button
                            onClick={handleSubmitClaim}
                            disabled={actionLoading}
                            className="btn-primary flex items-center gap-2"
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {claim.status === 'needs_justification' ? 'Resubmit with Justification' : 'Submit for Review'}
                        </button>
                        <button
                            onClick={() => navigate(`/expenses/claims/${id}`)}
                            className="btn-outline flex items-center gap-2"
                        >
                            Edit Claim
                        </button>
                    </>
                )}
                {canApprove && ['submitted', 'under_review'].includes(claim.status) && (
                    <>
                        {claim.status === 'submitted' && (
                            <button onClick={() => { setStatusForm({ status: 'under_review', comment: '', approvedAmount: '' }); setShowStatusModal(true); }} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2">
                                <Eye className="w-4 h-4" /> Mark Under Review
                            </button>
                        )}
                        <button onClick={() => { setStatusForm({ status: 'approved', comment: '', approvedAmount: String(claim.totalAmount) }); setShowStatusModal(true); }} className="px-4 py-2 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-all flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Approve
                        </button>
                        <button onClick={() => { setStatusForm({ status: 'rejected', comment: '', approvedAmount: '' }); setShowStatusModal(true); }} className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-all flex items-center gap-2">
                            <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button onClick={() => { setStatusForm({ status: 'needs_justification', comment: '', approvedAmount: '' }); setShowStatusModal(true); }} className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 transition-all flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Request Justification
                        </button>
                    </>
                )}
                {canApprove && claim.status === 'approved' && (
                    <button onClick={() => { setStatusForm({ status: 'paid', comment: '', approvedAmount: '' }); setShowStatusModal(true); }} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all flex items-center gap-2">
                        <Banknote className="w-4 h-4" /> Mark as Paid
                    </button>
                )}
            </div>

            {/* ── AI POLICY AUDIT SECTION ── */}
            {canAudit && (
                <div className="card overflow-hidden">
                    <div className="p-5 flex items-center justify-between border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10">
                                <Brain className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-700">AI Policy Audit</h3>
                                <p className="text-[10px] text-slate-400">Automated compliance check against travel policy</p>
                            </div>
                        </div>
                        <button
                            onClick={handleAudit}
                            disabled={auditLoading}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                audit
                                    ? 'border-2 border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600'
                                    : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-sm'
                            }`}
                        >
                            {auditLoading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Auditing...</>
                            ) : audit ? (
                                <><RefreshCw className="w-4 h-4" /> Re-Audit</>
                            ) : (
                                <><Sparkles className="w-4 h-4" /> Run Audit</>
                            )}
                        </button>
                    </div>

                    {audit && auditCfg && (
                        <div className="p-5 space-y-5">
                            {/* Score & Status */}
                            <div className="flex items-center gap-5 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-2xl ${auditCfg.bg} ring-1 ${auditCfg.ring}`}>
                                        <auditCfg.icon className={`w-8 h-8 ${auditCfg.color}`} />
                                    </div>
                                    <div>
                                        <p className={`text-2xl font-extrabold ${auditCfg.color}`}>{audit.complianceScore}%</p>
                                        <p className={`text-xs font-bold uppercase tracking-wide ${auditCfg.color}`}>{auditCfg.label}</p>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <progress
                                        className={`h-3 w-full overflow-hidden rounded-full ${
                                            audit.complianceScore >= 80 ? 'accent-green-500' : audit.complianceScore >= 50 ? 'accent-amber-500' : 'accent-red-500'
                                        }`}
                                        value={audit.complianceScore}
                                        max="100"
                                    />
                                </div>
                            </div>

                            {/* Summary */}
                            {audit.summary && (
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                    <p className="text-sm text-slate-600 leading-relaxed">{audit.summary}</p>
                                </div>
                            )}

                            {/* Flags */}
                            {audit.flags && audit.flags.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Audit Findings ({audit.flags.length})</h4>
                                    {audit.flags.map((flag, idx) => {
                                        const sev = SEVERITY_CFG[flag.severity] || SEVERITY_CFG.info;
                                        const SevIcon = sev.icon;
                                        return (
                                            <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl ${sev.bg} ring-1 ${sev.ring}`}>
                                                <SevIcon className={`w-4 h-4 mt-0.5 shrink-0 ${sev.color}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${sev.bg} ${sev.color} ring-1 ${sev.ring}`}>
                                                            {sev.label}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-slate-400">{flag.type?.replace(/_/g, ' ')}</span>
                                                    </div>
                                                    <p className={`text-sm font-medium mt-1 ${sev.color}`}>{flag.message}</p>
                                                    {flag.policyRef && (
                                                        <p className="text-[10px] text-slate-400 mt-1 italic">{flag.policyRef}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Recommendations */}
                            {audit.recommendations && (
                                <div className="p-4 rounded-xl bg-violet-50 border border-violet-100">
                                    <p className="text-xs font-bold text-violet-700 uppercase tracking-widest mb-2">Recommendations</p>
                                    <p className="text-sm text-violet-700 leading-relaxed">{audit.recommendations}</p>
                                </div>
                            )}

                            {/* Audit Meta */}
                            {audit.auditedAt && (
                                <p className="text-[10px] text-slate-400">
                                    Audited on {new Date(audit.auditedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            )}
                        </div>
                    )}

                    {!audit && !auditLoading && (
                        <div className="p-8 text-center">
                            <Brain className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400 font-medium">No audit run yet. Click "Run Audit" to check policy compliance.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Claim Info */}
                <div className="card p-5 space-y-3">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-blue" />
                        Claim Information
                    </h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Submitted By</span>
                            <span className="font-bold text-slate-700">{claim.submittedBy?.name} ({claim.submittedBy?.employeeId})</span>
                        </div>
                        {claim.submittedAt && (
                            <div className="flex justify-between">
                                <span className="text-slate-400">Submitted On</span>
                                <span className="font-bold text-slate-700">{new Date(claim.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-slate-400">Expenses</span>
                            <span className="font-bold text-slate-700">{claim.expenses?.length || 0} items</span>
                        </div>
                        {claim.description && (
                            <div className="pt-2 border-t border-slate-50">
                                <p className="text-slate-400 text-xs mb-1">Description</p>
                                <p className="text-slate-600">{claim.description}</p>
                            </div>
                        )}
                        {claim.justificationNote && (
                            <div className="pt-2 border-t border-slate-50">
                                <p className="text-slate-400 text-xs mb-1">Justification</p>
                                <p className="text-slate-600">{claim.justificationNote}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Travel Info */}
                <div className="card p-5 space-y-3">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-brand-blue" />
                        Travel Details
                    </h3>
                    <div className="space-y-2 text-sm">
                        {claim.travelFrom?.city && (
                            <div className="flex justify-between">
                                <span className="text-slate-400">From</span>
                                <span className="font-bold text-slate-700">{claim.travelFrom.city}{claim.travelFrom.state ? `, ${claim.travelFrom.state}` : ''}</span>
                            </div>
                        )}
                        {claim.travelTo?.city && (
                            <div className="flex justify-between">
                                <span className="text-slate-400">To</span>
                                <span className="font-bold text-slate-700">{claim.travelTo.city}{claim.travelTo.state ? `, ${claim.travelTo.state}` : ''}</span>
                            </div>
                        )}
                        {claim.travelStartDate && (
                            <div className="flex justify-between">
                                <span className="text-slate-400">Travel Period</span>
                                <span className="font-bold text-slate-700">
                                    {new Date(claim.travelStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    {claim.travelEndDate && ` - ${new Date(claim.travelEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                                </span>
                            </div>
                        )}
                        {claim.claimLocation?.city && (
                            <div className="flex justify-between pt-2 border-t border-slate-50">
                                <span className="text-slate-400 flex items-center gap-1">
                                    <Navigation className="w-3 h-3" /> Filed From
                                </span>
                                <span className="font-bold text-slate-700">
                                    {claim.claimLocation.city}{claim.claimLocation.state ? `, ${claim.claimLocation.state}` : ''}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Expenses Breakdown */}
            <div className="card p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-brand-blue" />
                    Expense Items
                </h3>
                {claim.expenses?.length > 0 ? (
                    <div className="space-y-2">
                        {claim.expenses.map(exp => {
                            const catMeta = CATEGORY_META[exp.category] || CATEGORY_META.other;
                            const CatIcon = catMeta.icon;
                            // Check if this expense has any audit flags
                            const expFlags = audit?.flags?.filter(f => f.expenseId === exp._id) || [];
                            const hasCritical = expFlags.some(f => f.severity === 'critical');
                            const hasWarning = expFlags.some(f => f.severity === 'warning');
                            return (
                                <div key={exp._id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                                    hasCritical ? 'bg-red-50/50 border-red-200' :
                                    hasWarning ? 'bg-amber-50/50 border-amber-200' :
                                    'bg-slate-50/50 border-slate-100'
                                }`}>
                                    <div className="p-2 rounded-lg bg-white shadow-sm">
                                        <CatIcon className="w-4 h-4 text-slate-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700">
                                            {exp.category === 'other' ? (exp.otherCategory || 'Other') : catMeta.label}
                                            {exp.vendor && <span className="font-normal text-slate-400"> - {exp.vendor}</span>}
                                            {exp.travelClass && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 ml-2">{exp.travelClass}</span>}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                            <span>{new Date(exp.expenseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                            {exp.travelFrom?.city && exp.travelTo?.city && (
                                                <span>{exp.travelFrom.city} → {exp.travelTo.city}</span>
                                            )}
                                            <span className="capitalize">{exp.paymentMethod?.replace('_', ' ')}</span>
                                            {exp.bookingMode && exp.bookingMode !== 'other' && (
                                                <span className="capitalize">{exp.bookingMode.replace('_', ' ')}</span>
                                            )}
                                        </div>
                                        {(exp.visitScheduleRef || exp.visitPlanRef) && (
                                            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-blue-700">
                                                {exp.visitScheduleRef && (
                                                    <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
                                                        <Calendar className="w-3 h-3" />
                                                        {exp.visitScheduleRef.title}
                                                        {exp.visitScheduleRef.location ? ` - ${exp.visitScheduleRef.location}` : ''}
                                                    </span>
                                                )}
                                                {!exp.visitScheduleRef && exp.visitPlanRef && (
                                                    <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
                                                        <Building2 className="w-3 h-3" />
                                                        {exp.visitPlanRef.title}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {exp.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{exp.description}</p>}
                                        {expFlags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {expFlags.map((f, i) => {
                                                    const sev = SEVERITY_CFG[f.severity] || SEVERITY_CFG.info;
                                                    return (
                                                        <span key={i} className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>
                                                            {f.message?.substring(0, 60)}{f.message?.length > 60 ? '...' : ''}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <p className="font-bold text-slate-800 shrink-0">
                                        {exp.amount?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                    </p>
                                </div>
                            );
                        })}
                        <div className="flex justify-between pt-3 border-t border-slate-200">
                            <p className="text-sm font-bold text-slate-600">Total</p>
                            <p className="text-lg font-extrabold text-slate-800">
                                {claim.totalAmount?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 py-4 text-center">No expenses attached</p>
                )}
            </div>

            {/* Status Timeline */}
            {claim.statusHistory?.length > 0 && (
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-brand-blue" />
                        Status Timeline
                    </h3>
                    <div className="space-y-0">
                        {claim.statusHistory.map((entry, idx) => {
                            const cfg = STATUS_CFG[entry.status] || STATUS_CFG.draft;
                            const EntryIcon = cfg.icon;
                            const isLast = idx === claim.statusHistory.length - 1;
                            return (
                                <div key={idx} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${cfg.bg} ${cfg.color} ring-1 ${cfg.ring}`}>
                                            <EntryIcon className="w-3.5 h-3.5" />
                                        </div>
                                        {!isLast && <div className={`w-0.5 flex-1 min-h-[24px] ${cfg.line} opacity-30`} />}
                                    </div>
                                    <div className={`pb-4`}>
                                        <p className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {entry.changedBy?.name || 'System'} &middot; {new Date(entry.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        {entry.comment && <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded-lg p-2">{entry.comment}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Status Update Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-lg sm:rounded-lg w-full sm:max-w-lg shadow-2xl animate-fade-in border border-meridian-border">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">
                                Update Claim Status
                            </h3>
                            <button onClick={() => setShowStatusModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleStatusUpdate} className="p-5 space-y-4">
                            <div>
                                <label className="label">New Status</label>
                                <select
                                    className="input-field"
                                    value={statusForm.status}
                                    onChange={(e) => setStatusForm(prev => ({ ...prev, status: e.target.value }))}
                                    required
                                >
                                    <option value="under_review">Under Review</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="needs_justification">Needs Justification</option>
                                    <option value="paid">Paid</option>
                                </select>
                            </div>

                            {statusForm.status === 'needs_justification' && (
                                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <p>The claimant will be notified and asked to provide justification before resubmitting.</p>
                                </div>
                            )}

                            {statusForm.status === 'approved' && (
                                <div>
                                    <label className="label">Approved Amount (INR)</label>
                                    <input
                                        type="number"
                                        className="input-field"
                                        placeholder={String(claim.totalAmount)}
                                        value={statusForm.approvedAmount}
                                        onChange={(e) => setStatusForm(prev => ({ ...prev, approvedAmount: e.target.value }))}
                                    />
                                </div>
                            )}
                            <div>
                                <label className="label">
                                    {statusForm.status === 'needs_justification'
                                        ? 'Message to Employee — explain what needs justification *'
                                        : statusForm.status === 'rejected'
                                        ? 'Reason for Rejection'
                                        : 'Comment (visible to claimant)'}
                                </label>
                                <textarea
                                    className={`input-field min-h-[80px] ${statusForm.status === 'needs_justification' ? 'border-amber-300 focus:border-amber-500' : ''}`}
                                    placeholder={
                                        statusForm.status === 'needs_justification'
                                            ? 'e.g. "Please provide receipt for the hotel stay on Apr 18. The food expense exceeds the daily ₹600 limit — clarify if it was a client meeting."'
                                            : statusForm.status === 'rejected'
                                            ? 'Explain why this claim is being rejected...'
                                            : 'Add a comment visible to the claimant...'
                                    }
                                    value={statusForm.comment}
                                    onChange={(e) => setStatusForm(prev => ({ ...prev, comment: e.target.value }))}
                                    required={statusForm.status === 'needs_justification'}
                                />
                                {statusForm.status === 'needs_justification' && !statusForm.comment && (
                                    <p className="text-xs text-amber-600 font-bold mt-1">Required — the employee needs to know what to address.</p>
                                )}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowStatusModal(false)} className="flex-1 btn-outline py-3">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                                >
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Status'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClaimDetail;
