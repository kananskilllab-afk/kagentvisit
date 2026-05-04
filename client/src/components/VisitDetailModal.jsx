import React, { useState, useEffect, useRef } from 'react';
import {
    X, Building2, MapPin, Calendar, Clock, User, Star,
    CheckCircle, XCircle, FileText, MessageSquare, Briefcase, Users, BarChart3,
    Wrench, DollarSign, HelpCircle, Edit, Home, GraduationCap, ClipboardCheck,
    Sparkles, Wand2, Loader2, ShieldAlert, AlertCircle, Globe, Phone, Plus, ChevronDown, ChevronUp,
    ThumbsUp, AlertTriangle, Archive, RotateCcw
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import ActionItemTracker from './ActionItemTracker';

const STATUS_CFG = {
    submitted:       { label: 'Pending Review',  bg: 'bg-orange-50',  text: 'text-brand-orange', dot: 'bg-brand-orange', ring: 'ring-brand-orange/20' },
    reviewed:        { label: 'Reviewed',          bg: 'bg-blue-50',   text: 'text-brand-sky',    dot: 'bg-brand-sky',    ring: 'ring-brand-sky/20'    },
    action_required: { label: 'Action Required',  bg: 'bg-red-50',    text: 'text-red-600',       dot: 'bg-red-500',      ring: 'ring-red-400/20'      },
    closed:          { label: 'Closed',            bg: 'bg-green-50',  text: 'text-brand-green',  dot: 'bg-brand-green',  ring: 'ring-brand-green/20'  },
    draft:           { label: 'Draft',             bg: 'bg-slate-50',  text: 'text-slate-500',    dot: 'bg-slate-400',    ring: 'ring-slate-200'       },
};

/* ─── Tiny helpers ───────────────────────────────────────────────────── */

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
const fmtDateTime = (d) => d ? `${fmt(d)} at ${fmtTime(d)}` : null;
const arr = (a) => Array.isArray(a) && a.length > 0 ? a.join(', ') : null;
const currency = (n) => n ? `₹${Number(n).toLocaleString('en-IN')}` : null;
const stripHtml = (html) => {
    if (!html) return null;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || null;
};

/* ─── Section renderer ───────────────────────────────────────────────── */

const Section = ({ icon: Icon, title, children, accent = 'brand-blue' }) => {
    const hasContent = React.Children.toArray(children).some(c => c);
    if (!hasContent) return null;
    return (
        <div className="mb-5">
            <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-slate-100">
                <div className={`w-8 h-8 rounded-xl bg-${accent}/10 flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 text-${accent}`} />
                </div>
                <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wide">{title}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 pl-1">
                {children}
            </div>
        </div>
    );
};

const Field = ({ label, value, full }) => {
    if (value === null || value === undefined || value === '' || value === false) return null;
    return (
        <div className={full ? 'sm:col-span-2' : ''}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{value}</p>
        </div>
    );
};

const BoolField = ({ label, value }) => {
    if (value === undefined || value === null) return null;
    return (
        <div className="flex items-center gap-2">
            {value
                ? <CheckCircle className="w-4 h-4 text-brand-green shrink-0" />
                : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
            }
            <span className={`text-sm ${value ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>{label}</span>
        </div>
    );
};

const StarField = ({ label, value }) => {
    if (!value) return null;
    return (
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className={`w-4 h-4 ${i <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                ))}
                <span className="text-xs text-slate-500 ml-1">{value}/5</span>
            </div>
        </div>
    );
};

/* ─── Main Modal ─────────────────────────────────────────────────────── */

const VisitDetailModal = ({ visit: initialVisit, onClose, onEdit, onVisitUpdated }) => {
    const { user } = useAuth();
    const [visit, setVisit] = useState(initialVisit);
    const [aiInsights, setAiInsights] = useState(initialVisit?.aiInsights || null);
    const [adminAuditEval, setAdminAuditEval] = useState(initialVisit?.adminAuditEval || null);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [generatingAudit, setGeneratingAudit] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [auditError, setAuditError] = useState(null);

    // Follow-up meeting form state
    const [followUps, setFollowUps] = useState(initialVisit?.followUpMeetings || []);
    const [showFollowUpForm, setShowFollowUpForm] = useState(false);
    const [fuDate, setFuDate] = useState(new Date().toISOString().slice(0, 10));
    const [fuStart, setFuStart] = useState('');
    const [fuEnd, setFuEnd] = useState('');
    const [fuNotes, setFuNotes] = useState('');
    const [fuOutcomes, setFuOutcomes] = useState('');
    const [addingFollowUp, setAddingFollowUp] = useState(false);

    // Review action state
    const [reviewAction, setReviewAction] = useState(null); // 'reviewed' | 'action_required' | 'closed' | 'submitted'
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewError, setReviewError] = useState(null);

    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    const autoTriggered = useRef(false);

    // Auto-generate AI when modal opens for submitted visits without AI data
    useEffect(() => {
        if (!visit || visit.status === 'draft' || autoTriggered.current) return;
        autoTriggered.current = true;

        if (!visit.aiInsights) {
            setGeneratingAI(true);
            api.post(`/visits/${visit._id}/ai/insights`)
                .then(res => { if (res.data?.success) setAiInsights(res.data.data); })
                .catch(err => setAiError(err.response?.data?.message || 'AI generation failed.'))
                .finally(() => setGeneratingAI(false));
        }

        if (!visit.adminAuditEval && isAdmin) {
            setGeneratingAudit(true);
            api.post(`/visits/${visit._id}/ai/audit`)
                .then(res => { if (res.data?.success) setAdminAuditEval(res.data.data); })
                .catch(err => setAuditError(err.response?.data?.message || 'Audit generation failed.'))
                .finally(() => setGeneratingAudit(false));
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleStatusUpdate = async () => {
        if (!reviewAction) return;
        setSubmittingReview(true);
        setReviewError(null);
        try {
            const res = await api.put(`/visits/${visit._id}/status`, {
                status: reviewAction,
                comment: reviewComment.trim() || undefined
            });
            if (res.data?.success) {
                const updated = res.data.data;
                setVisit(updated);
                setReviewAction(null);
                setReviewComment('');
                if (onVisitUpdated) onVisitUpdated(updated);
            }
        } catch (err) {
            setReviewError(err.response?.data?.message || 'Failed to update status. Please try again.');
        } finally {
            setSubmittingReview(false);
        }
    };

    if (!visit) return null;

    const isB2C = visit.formType === 'home_visit';
    const cfg = STATUS_CFG[visit.status] || STATUS_CFG.draft;
    const title = visit?.studentInfo?.name || visit?.meta?.companyName || 'Visit Details';
    const isOwner = visit.submittedBy?._id === user?._id || visit.submittedBy === user?._id;

    const handleGenerateInsights = async () => {
        if (!visit._id) return;
        setGeneratingAI(true);
        setAiError(null);
        try {
            const res = await api.post(`/visits/${visit._id}/ai/insights`);
            if (res.data?.success) {
                setAiInsights(res.data.data);
                if (onVisitUpdated) onVisitUpdated({ ...visit, aiInsights: res.data.data });
            }
        } catch (err) {
            setAiError(err.response?.data?.message || 'AI service temporarily unavailable. Please try again.');
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleGenerateAudit = async () => {
        if (!visit._id) return;
        setGeneratingAudit(true);
        setAuditError(null);
        try {
            const res = await api.post(`/visits/${visit._id}/ai/audit`);
            if (res.data?.success) {
                setAdminAuditEval(res.data.data);
                if (onVisitUpdated) onVisitUpdated({ ...visit, adminAuditEval: res.data.data });
            }
        } catch (err) {
            setAuditError(err.response?.data?.message || 'AI service temporarily unavailable. Please try again.');
        } finally {
            setGeneratingAudit(false);
        }
    };

    const handleAddFollowUp = async () => {
        if (!fuNotes.trim()) return alert('Discussion points are required');
        setAddingFollowUp(true);
        try {
            const payload = {
                date: fuDate,
                notes: fuNotes,
                keyOutcomes: fuOutcomes || undefined,
            };
            if (fuStart) payload.meetingStart = new Date(`${fuDate}T${fuStart}`);
            if (fuEnd) payload.meetingEnd = new Date(`${fuDate}T${fuEnd}`);

            const res = await api.post(`/visits/${visit._id}/follow-ups`, payload);
            if (res.data?.success) {
                setFollowUps(res.data.data.followUpMeetings);
                setFuNotes('');
                setFuOutcomes('');
                setFuStart('');
                setFuEnd('');
                setShowFollowUpForm(false);
                if (onVisitUpdated) onVisitUpdated(res.data.data);
            }
        } catch (err) {
            alert('Failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setAddingFollowUp(false);
        }
    };

    const totalMeetings = 1 + followUps.length;

    return (
        <div
            className="fixed inset-0 z-[100] bg-slate-900/60"
            onClick={onClose}
        >
            <div
                className="flex h-screen w-full flex-col overflow-hidden bg-white animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header ──────────────────────────────────────── */}
                <div className="sticky top-0 z-20 border-b border-white/10 bg-meridian-navy p-4 text-white sm:p-6">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                            {isB2C
                                ? <Home className="w-7 h-7 text-white" />
                                : <Building2 className="w-7 h-7 text-white" />
                            }
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-xl font-extrabold truncate leading-tight">{title}</h2>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-white/20 text-white">
                                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                    {cfg.label}
                                </span>
                                <span className="text-white/70 text-xs flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {fmt(visit.createdAt)}
                                </span>
                                {visit.submittedBy?.name && (
                                    <span className="text-white/70 text-xs flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {visit.submittedBy.name}
                                    </span>
                                )}
                                {totalMeetings > 1 && (
                                    <span className="text-white/90 text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                                        {totalMeetings} visits in thread
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Body ────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">

                    {/* ═══ Admin Review Panel ═══ */}
                    {isAdmin && visit.status !== 'draft' && (
                        <div className="mb-5">
                            <div className="rounded-2xl border border-slate-200 overflow-hidden">
                                <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-5 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <ShieldAlert className="w-4 h-4 text-slate-300" />
                                        <span className="text-sm font-bold text-white">Review Actions</span>
                                    </div>
                                    {visit.reviewedBy?.name && (
                                        <span className="text-[10px] text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
                                            Last action by {visit.reviewedBy.name}
                                        </span>
                                    )}
                                </div>

                                <div className="p-4 bg-slate-50/50 space-y-3">
                                    {/* Review comment display */}
                                    {visit.reviewComment && visit.status !== 'submitted' && (
                                        <div className={`p-3 rounded-xl border text-sm leading-relaxed ${
                                            visit.status === 'action_required'
                                                ? 'bg-red-50 border-red-200 text-red-700'
                                                : 'bg-blue-50 border-blue-200 text-blue-700'
                                        }`}>
                                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
                                                {visit.status === 'action_required' ? 'Action Required Note' : 'Review Note'}
                                            </p>
                                            {visit.reviewComment}
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    {reviewAction ? (
                                        <div className="space-y-2.5 animate-slide-down">
                                            <div className="flex items-center gap-2">
                                                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                                                    reviewAction === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                                                    reviewAction === 'action_required' ? 'bg-red-100 text-red-700' :
                                                    reviewAction === 'closed' ? 'bg-green-100 text-green-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                    {reviewAction === 'reviewed' && <ThumbsUp className="w-3 h-3" />}
                                                    {reviewAction === 'action_required' && <AlertTriangle className="w-3 h-3" />}
                                                    {reviewAction === 'closed' && <Archive className="w-3 h-3" />}
                                                    {reviewAction === 'submitted' && <RotateCcw className="w-3 h-3" />}
                                                    {reviewAction === 'reviewed' && 'Mark as Reviewed'}
                                                    {reviewAction === 'action_required' && 'Request Action'}
                                                    {reviewAction === 'closed' && 'Close Visit'}
                                                    {reviewAction === 'submitted' && 'Re-open Visit'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">
                                                    Comment {reviewAction === 'action_required' ? '*' : '(optional)'}
                                                </label>
                                                <textarea
                                                    value={reviewComment}
                                                    onChange={e => setReviewComment(e.target.value)}
                                                    rows={2}
                                                    placeholder={
                                                        reviewAction === 'action_required'
                                                            ? 'Describe what needs to be fixed or updated...'
                                                            : 'Add a note (optional)...'
                                                    }
                                                    className="input-field text-sm mt-0.5 resize-none"
                                                />
                                            </div>
                                            {reviewError && (
                                                <p className="text-xs text-red-600 font-medium">{reviewError}</p>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleStatusUpdate}
                                                    disabled={submittingReview}
                                                    className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5"
                                                >
                                                    {submittingReview ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                    {submittingReview ? 'Saving...' : 'Confirm'}
                                                </button>
                                                <button
                                                    onClick={() => { setReviewAction(null); setReviewComment(''); setReviewError(null); }}
                                                    className="btn-outline py-2 px-4 text-xs"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {visit.status !== 'reviewed' && (
                                                <button
                                                    onClick={() => setReviewAction('reviewed')}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
                                                >
                                                    <ThumbsUp className="w-3.5 h-3.5" />
                                                    Mark Reviewed
                                                </button>
                                            )}
                                            {visit.status !== 'action_required' && (
                                                <button
                                                    onClick={() => setReviewAction('action_required')}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 transition-all"
                                                >
                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                    Action Required
                                                </button>
                                            )}
                                            {visit.status !== 'closed' && (
                                                <button
                                                    onClick={() => setReviewAction('closed')}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200 transition-all"
                                                >
                                                    <Archive className="w-3.5 h-3.5" />
                                                    Close Visit
                                                </button>
                                            )}
                                            {(visit.status === 'reviewed' || visit.status === 'action_required' || visit.status === 'closed') && (
                                                <button
                                                    onClick={() => setReviewAction('submitted')}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-orange-100 text-orange-700 hover:bg-orange-200 transition-all"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    Re-open
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ Action Required Banner (for non-admins) ═══ */}
                    {!isAdmin && visit.status === 'action_required' && visit.reviewComment && (
                        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Action Required</p>
                                    <p className="text-sm text-red-700 leading-relaxed">{visit.reviewComment}</p>
                                    {visit.reviewedBy?.name && (
                                        <p className="text-[10px] text-red-400 mt-1.5">— {visit.reviewedBy.name}, {fmt(visit.reviewedAt)}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ AI Insights ═══ */}
                    {visit.status !== 'draft' && (
                    <div className="mb-5">
                        <div className="rounded-2xl border border-slate-200 overflow-hidden">
                            {/* AI Header bar */}
                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                    <span className="text-sm font-bold text-white">AI Analysis</span>
                                    {totalMeetings > 1 && (
                                        <span className="text-[10px] text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
                                            Covers all {totalMeetings} visits
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={handleGenerateInsights}
                                    disabled={generatingAI}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white transition-all disabled:opacity-50"
                                >
                                    {generatingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                    {generatingAI ? 'Analyzing...' : aiInsights ? 'Regenerate' : 'Generate Insights'}
                                </button>
                            </div>

                            {/* AI Content */}
                            {generatingAI && !aiInsights ? (
                                <div className="p-6 flex flex-col items-center gap-3 bg-slate-50/50">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                    <p className="text-xs text-slate-500 font-medium">AI is analyzing this visit...</p>
                                </div>
                            ) : aiInsights ? (
                                <div className="p-5 space-y-4 bg-slate-50/50">
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest flex items-center gap-1.5">
                                            <FileText className="w-3 h-3" /> Summary
                                        </h4>
                                        <p className="text-sm text-slate-700 leading-relaxed">{aiInsights.summary}</p>
                                    </div>
                                    <div className="border-t border-slate-100 pt-4">
                                        <h4 className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest flex items-center gap-1.5">
                                            <MessageSquare className="w-3 h-3" /> Minutes of Meeting
                                        </h4>
                                        <ul className="space-y-1.5">
                                            {aiInsights.bulletPoints?.map((bp, i) => (
                                                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1.5 shrink-0" />
                                                    {bp}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="border-t border-slate-100 pt-4">
                                        <h4 className="text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest flex items-center gap-1.5">
                                            <Sparkles className="w-3 h-3" /> Suggestions & Next Steps
                                        </h4>
                                        <p className="text-sm text-slate-700 leading-relaxed">{aiInsights.suggestions}</p>
                                    </div>
                                    {aiInsights.generatedAt && (
                                        <p className="text-[10px] text-slate-400 text-right pt-1">Generated {fmtDateTime(aiInsights.generatedAt)}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="p-6 text-center bg-slate-50/50">
                                    {aiError && (
                                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="text-xs text-red-600 font-medium">{aiError}</p>
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-400">Click "Generate Insights" to get an AI-powered summary, meeting minutes, and suggestions{totalMeetings > 1 ? ' across all visits in this thread' : ''}.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    )}

                    {/* ═══ AI Audit (Admin Only) ═══ */}
                    {isAdmin && visit.status !== 'draft' && (
                        <div className="mb-5">
                            <div className="rounded-2xl border border-red-200/60 overflow-hidden">
                                {/* Audit Header */}
                                <div className="bg-gradient-to-r from-red-800 to-red-700 px-5 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <ShieldAlert className="w-4 h-4 text-red-300" />
                                        <span className="text-sm font-bold text-white">Audit Evaluation</span>
                                    </div>
                                    <button
                                        onClick={handleGenerateAudit}
                                        disabled={generatingAudit}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/10 hover:bg-white/20 text-white transition-all disabled:opacity-50"
                                    >
                                        {generatingAudit ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
                                        {generatingAudit ? 'Evaluating...' : adminAuditEval ? 'Re-evaluate' : 'Run Audit'}
                                    </button>
                                </div>

                                {/* Audit Content */}
                                {generatingAudit && !adminAuditEval ? (
                                    <div className="p-6 flex flex-col items-center gap-3 bg-red-50/30">
                                        <Loader2 className="w-6 h-6 animate-spin text-red-300" />
                                        <p className="text-xs text-slate-500 font-medium">Running audit evaluation...</p>
                                    </div>
                                ) : adminAuditEval ? (
                                    <div className="p-5 space-y-4 bg-red-50/30">
                                        {/* Verdict + Score */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0 ${
                                                adminAuditEval.status === 'successful' ? 'bg-green-100 text-green-700' :
                                                adminAuditEval.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {adminAuditEval.status === 'successful' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                                {adminAuditEval.status?.replace('_', ' ')}
                                            </div>
                                            {adminAuditEval.score && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${
                                                                adminAuditEval.score >= 7 ? 'bg-green-500' :
                                                                adminAuditEval.score >= 4 ? 'bg-amber-500' : 'bg-red-500'
                                                            }`}
                                                            style={{ width: `${adminAuditEval.score * 10}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-sm font-extrabold ${
                                                        adminAuditEval.score >= 7 ? 'text-green-600' :
                                                        adminAuditEval.score >= 4 ? 'text-amber-600' : 'text-red-600'
                                                    }`}>{adminAuditEval.score}/10</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Assessment */}
                                        <p className="text-sm text-slate-700 leading-relaxed">{adminAuditEval.reasoning}</p>

                                        {/* Strengths & Weaknesses */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {adminAuditEval.strengths?.length > 0 && (
                                                <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                                                    <h4 className="text-[10px] font-black text-green-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                                                        <CheckCircle className="w-3 h-3" /> Strengths
                                                    </h4>
                                                    <ul className="space-y-1">
                                                        {adminAuditEval.strengths.map((s, i) => (
                                                            <li key={i} className="text-[11px] text-green-800 leading-snug flex items-start gap-1.5">
                                                                <span className="text-green-400 mt-0.5 shrink-0">+</span> {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {adminAuditEval.weaknesses?.length > 0 && (
                                                <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                                                    <h4 className="text-[10px] font-black text-red-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                                                        <AlertCircle className="w-3 h-3" /> Weaknesses
                                                    </h4>
                                                    <ul className="space-y-1">
                                                        {adminAuditEval.weaknesses.map((w, i) => (
                                                            <li key={i} className="text-[11px] text-red-800 leading-snug flex items-start gap-1.5">
                                                                <span className="text-red-400 mt-0.5 shrink-0">-</span> {w}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {adminAuditEval.evaluatedAt && (
                                            <p className="text-[10px] text-slate-400 text-right pt-1">Evaluated {fmtDateTime(adminAuditEval.evaluatedAt)}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center bg-red-50/30">
                                        {auditError && (
                                            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-xs text-red-600 font-medium">{auditError}</p>
                                            </div>
                                        )}
                                        <p className="text-xs text-slate-400">Click "Run Audit" for an honest evaluation of this visit's quality and completeness.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ---------- B2B Sections ---------- */}
                    {!isB2C && (
                        <>
                            <Section icon={Calendar} title="Visit Meta">
                                <Field label="Agent / Company" value={visit.meta?.companyName} />
                                <Field label="Email" value={visit.meta?.email} />
                                <Field label="BDM Name" value={arr(visit.meta?.bdmName) || visit.meta?.bdmName} />
                                <Field label="RM Name" value={arr(visit.meta?.rmName) || visit.meta?.rmName} />
                                <Field label="Meeting Start" value={fmtDateTime(visit.meta?.meetingStart)} />
                                <Field label="Meeting End" value={fmtDateTime(visit.meta?.meetingEnd)} />
                            </Section>

                            <Section icon={Building2} title="Agency Profile" accent="brand-sky">
                                <Field label="Office Address" value={visit.agencyProfile?.address} full />
                                <Field label="Nearest Landmark" value={visit.agencyProfile?.nearestLandmark} />
                                <Field label="PIN Code" value={visit.agencyProfile?.pinCode} />
                                <Field label="Contact Numbers" value={
                                    ((Array.isArray(visit.agencyProfile?.contactNumber) && typeof visit.agencyProfile.contactNumber[0] === 'object') ?
                                        visit.agencyProfile.contactNumber.map(c => `${c.name || ''} ${c.designation ? `(${c.designation})` : ''} - ${c.number || ''}`).join(', ') :
                                        arr(visit.agencyProfile?.contactNumber) || visit.agencyProfile?.contactNumber)
                                } />
                                <Field label="Agency Email" value={visit.agencyProfile?.emailId} />
                                <Field label="Website" value={visit.agencyProfile?.website} />
                                <Field label="GMB Page Link" value={visit.agencyProfile?.gmbLink} />
                                <Field label="Establishment Year" value={visit.agencyProfile?.establishmentYear} />
                            </Section>

                            <Section icon={Briefcase} title="Business & Infrastructure" accent="brand-orange">
                                <Field label="Business Model" value={visit.agencyProfile?.otherBusinessModel ? `${arr(visit.agencyProfile?.businessModel)} (${visit.agencyProfile.otherBusinessModel})` : arr(visit.agencyProfile?.businessModel)} />
                                <Field label="Office Area" value={visit.agencyProfile?.officeAreaType ? `${visit.agencyProfile.officeAreaType} ${visit.agencyProfile.officeArea ? `(${visit.agencyProfile.officeArea} sq.ft)` : ''}` : visit.agencyProfile?.officeArea} />
                                <StarField label="Infrastructure Rating" value={visit.agencyProfile?.infraRating} />
                                <BoolField label="Has Computer Lab" value={visit.agencyProfile?.hasComputerLab} />
                                <Field label="Number of Computers" value={visit.agencyProfile?.numComputers} />
                                <StarField label="Google / SM Review Rating" value={visit.agencyProfile?.googleReviews} />
                            </Section>

                            <Section icon={Users} title="Promoter & Team" accent="brand-green">
                                <Field label="Promoter Name" value={visit.promoterTeam?.name} />
                                <Field label="Designation" value={visit.promoterTeam?.designation} />
                                <Field label="Mobile Number" value={visit.promoterTeam?.mobileNumber} />
                                <Field label="Email" value={visit.promoterTeam?.emailId} />
                                <Field label="Total Staff" value={visit.promoterTeam?.totalStaff} />
                                <Field label="Coaching Team Size" value={visit.promoterTeam?.coachingTeamSize} />
                                <Field label="Country Team Size" value={visit.promoterTeam?.countryTeamSize} />
                                <Field label="Countries Promoted" value={visit.promoterTeam?.otherCountriesPromoted ? `${arr(visit.promoterTeam?.countriesPromoted)} (${visit.promoterTeam.otherCountriesPromoted})` : arr(visit.promoterTeam?.countriesPromoted)} full />
                                <Field label="Coaching Courses" value={visit.promoterTeam?.otherCoachingPromoted ? `${arr(visit.promoterTeam?.coachingPromoted)} (${visit.promoterTeam.otherCoachingPromoted})` : arr(visit.promoterTeam?.coachingPromoted)} full />
                                <Field label="Value Added Services" value={visit.promoterTeam?.otherVas ? `${arr(visit.promoterTeam?.vas)} (${visit.promoterTeam.otherVas})` : arr(visit.promoterTeam?.vas)} full />
                            </Section>

                            <Section icon={BarChart3} title="Marketing & Ops" accent="brand-blue">
                                <Field label="Marketing Activities" value={stripHtml(visit.marketingOps?.marketingActivities)} full />
                                <Field label="Avg. Daily Walk-ins" value={visit.marketingOps?.avgDailyWalkins} />
                                <Field label="Walk-in to Reg. Ratio" value={visit.marketingOps?.walkinRatio} />
                                <BoolField label="Using Brochures" value={visit.marketingOps?.useBrochures} />
                                <Field label="Total Visa / Year" value={visit.marketingOps?.totalVisaYear} />
                                <Field label="Total Coaching / Year" value={visit.marketingOps?.totalCoachingYear} />
                                <Field label="Office Media Link" value={visit.marketingOps?.officeMediaLink} />
                                <Field label="Total Branches" value={visit.marketingOps?.totalBranches} />
                            </Section>

                            <Section icon={Wrench} title="Kanan Status & Tools" accent="brand-sky">
                                <Field label="Prepcom / Academy" value={visit.kananSpecific?.prepcomAcademy} />
                                <Field label="Onboarding Date" value={fmt(visit.kananSpecific?.onboardingDate)} />
                                <Field label="Appcom Onboarding" value={fmt(visit.kananSpecific?.appcomOnboardingDate)} />
                                <Field label="Avg Enquiries - Admissions" value={visit.enquiryStats?.avgAdmissions} />
                                <Field label="Avg Enquiries - Coaching" value={visit.enquiryStats?.avgCoaching} />
                                <Field label="Avg Enquiries - Canada" value={visit.enquiryStats?.avgCanada} />
                                <Field label="Avg Enquiries - IELTS" value={visit.enquiryStats?.avgIELTS} />
                                <Field label="Using Kanan Academy Portal" value={visit.kananTools?.useAcademyPortal ? 'Yes' : (visit.kananTools?.useAcademyPortal === false && visit.kananTools?.academyPortalOther ? `No (Using: ${visit.kananTools.academyPortalOther})` : (visit.kananTools?.useAcademyPortal === false ? 'No' : null))} />
                                <Field label="Portal Courses" value={arr(visit.kananTools?.portalCourses)} />
                                <Field label="Using Kanan Books" value={visit.kananTools?.useBooks ? 'Yes' : (visit.kananTools?.useBooks === false && visit.kananTools?.booksOther ? `No (Using: ${visit.kananTools.booksOther})` : (visit.kananTools?.useBooks === false ? 'No' : null))} />
                                <Field label="Book Courses" value={arr(visit.kananTools?.bookCourses)} />
                                <BoolField label="Using Classroom Content" value={visit.kananTools?.useClassroomContent} />
                                <StarField label="Trainer Knowledge Rating" value={visit.kananTools?.trainerRating} />
                                <StarField label="Counsellor Knowledge Rating" value={visit.kananTools?.counsellorRating} />
                            </Section>

                            <Section icon={Globe} title="Partnership" accent="brand-green">
                                <Field label="Working Countries with Kanan" value={visit.partnership?.otherWorkingCountries ? `${arr(visit.partnership?.workingCountries)} (${visit.partnership.otherWorkingCountries})` : arr(visit.partnership?.workingCountries)} full />
                                <BoolField label="Onshore Referral" value={visit.partnership?.onshoreReferral} />
                                <Field label="Feedback" value={stripHtml(visit.partnership?.feedback)} full />
                            </Section>

                            <Section icon={DollarSign} title="Tech & Budget" accent="brand-orange">
                                <Field label="Tech Platforms Used" value={stripHtml(visit.opsTech?.techPlatforms)} full />
                                <StarField label="Tech Adoption Willingness" value={visit.opsTech?.techWillingness} />
                                <Field label="Marketing Budget 2026" value={currency(visit.budget?.marketing2026)} />
                                <Field label="Coaching Budget 2026" value={currency(visit.budget?.coaching2026)} />
                                <StarField label="Pricing Competitiveness" value={visit.competency?.pricingRating} />
                            </Section>

                            <Section icon={HelpCircle} title="Support Needs" accent="brand-blue">
                                <Field label="Biggest Challenge" value={stripHtml(visit.support?.biggestChallenge)} full />
                                <Field label="Interested Services" value={arr(visit.support?.interestedServices)} full />
                                <BoolField label="Need: Counsellor Training" value={visit.support?.needTraining} />
                                <BoolField label="Need: Marketing & Lead Gen" value={visit.support?.needMarketing} />
                                <BoolField label="Need: Technology Adoption" value={visit.support?.needTech} />
                                <BoolField label="Need: Institutional Partners" value={visit.support?.needPartners} />
                                <BoolField label="Need: Improving VAS" value={visit.support?.needVAS} />
                                <Field label="Pain Points" value={arr(visit.support?.painPoints) || stripHtml(visit.support?.painPoints)} full />
                                <Field label="Solutions Provided" value={arr(visit.support?.solutions) || stripHtml(visit.support?.solutions)} full />
                            </Section>

                            <Section icon={FileText} title="Final Summary" accent="brand-sky">
                                <Field label="Action Points" value={stripHtml(visit.postVisit?.actionPoints)} full />
                                <Field label="Remarks" value={stripHtml(visit.postVisit?.remarks)} full />
                            </Section>
                        </>
                    )}

                    {/* ---------- B2C Sections ---------- */}
                    {isB2C && (
                        <>
                            <Section icon={Calendar} title="Visit Details">
                                <Field label="Visit Date" value={fmt(visit.visitInfo?.visitDate)} />
                                <Field label="Visit Officer" value={visit.visitInfo?.officer} />
                                <Field label="Team Size" value={visit.visitInfo?.teamSize} />
                                <Field label="Team Members" value={arr(visit.visitInfo?.teamMembers)} />
                            </Section>

                            <Section icon={GraduationCap} title="Student Information" accent="brand-sky">
                                <Field label="Classification" value={visit.studentInfo?.classification} />
                                <Field label="Lead Source" value={visit.studentInfo?.leadSource} />
                                <Field label="CRM ID" value={visit.studentInfo?.crmId} />
                                <Field label="Student Name" value={visit.studentInfo?.name} />
                                <Field label="Email" value={visit.studentInfo?.email} />
                                <Field label="Inquiry Types" value={arr(visit.studentInfo?.inquiryTypes)} full />
                            </Section>

                            <Section icon={Phone} title="Contact Details" accent="brand-green">
                                <Field label="India No." value={visit.contactDetails?.indiaNo} />
                                <Field label="Canada No." value={visit.contactDetails?.canadaNo} />
                                <Field label="Parents No." value={visit.contactDetails?.parentsNo} />
                            </Section>

                            <Section icon={MapPin} title="Location" accent="brand-orange">
                                <Field label="Address" value={visit.location?.address} full />
                                <Field label="Nearest Landmark" value={visit.location?.nearestLandmark} />
                                <Field label="City" value={visit.location?.city} />
                                <Field label="PIN Code" value={visit.location?.pinCode} />
                                <Field label="State" value={visit.location?.state} />
                            </Section>

                            <Section icon={GraduationCap} title="Academic" accent="brand-blue">
                                <Field label="College" value={visit.academic?.college} />
                            </Section>

                            <Section icon={ClipboardCheck} title="Checklist" accent="brand-sky">
                                <BoolField label="WhatsApp Group Created" value={visit.checklist?.waGroup} />
                                <Field label="WA Group Name" value={visit.checklist?.waGroupName} />
                                <BoolField label="MoM Done" value={visit.checklist?.momDone} />
                                <BoolField label="Parents Met" value={visit.checklist?.parentsMet} />
                                <BoolField label="Documents Collected" value={visit.checklist?.docsCollected} />
                                <BoolField label="Application Logged" value={visit.checklist?.appLogged} />
                            </Section>

                            <Section icon={FileText} title="Final Outcome" accent="brand-green">
                                <Field label="Status" value={visit.outcome?.status} />
                                <Field label="Remarks" value={stripHtml(visit.outcome?.remarks)} full />
                            </Section>
                        </>
                    )}

                    {/* GPS Location */}
                    {visit.gpsLocation && (
                        <Section icon={MapPin} title="GPS Location" accent="brand-blue">
                            <Field label="Address" value={visit.gpsLocation} full />
                            {visit.gpsCoordinates?.lat && (
                                <Field label="Coordinates" value={`${visit.gpsCoordinates.lat}, ${visit.gpsCoordinates.lng}`} />
                            )}
                        </Section>
                    )}

                    {/* Admin Notes */}
                    {visit.adminNotes?.length > 0 && (
                        <div className="mb-5">
                            <div className="flex items-center gap-2.5 mb-3 pb-2 border-b border-slate-100">
                                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                                    <MessageSquare className="w-4 h-4 text-red-500" />
                                </div>
                                <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wide">Admin Notes</h3>
                            </div>
                            <div className="space-y-2.5 pl-1">
                                {visit.adminNotes.map((note, i) => (
                                    <div key={i} className="bg-red-50/60 border border-red-100 rounded-xl p-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                                                {note.stepName || `Step ${note.stepIndex}`}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{fmtDateTime(note.addedAt)}</span>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed">{note.note}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mb-5">
                        <ActionItemTracker
                            visitId={visit._id}
                            title="Action Item Tracker"
                            readOnly={user?.role === 'accounts'}
                        />
                    </div>

                    {/* ═══ Follow-up Visits Thread ═══ */}
                    <div className="mb-5">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-brand-orange/10 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-brand-orange" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-slate-700 uppercase tracking-wide">{isB2C ? 'Revisit History' : 'Visit Thread'}</h3>
                                    <p className="text-[10px] text-slate-400">{totalMeetings === 1 ? 'Original visit only' : `${totalMeetings} entries total`}</p>
                                </div>
                            </div>
                            {(isOwner || isAdmin) && visit.status !== 'draft' && (
                                <button
                                    onClick={() => setShowFollowUpForm(!showFollowUpForm)}
                                    className="flex items-center gap-1.5 text-xs font-bold text-brand-orange hover:text-brand-orange/80 transition-colors"
                                >
                                    {showFollowUpForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                    {showFollowUpForm ? 'Cancel' : (isB2C ? 'Log Revisit' : 'Log Follow-up')}
                                </button>
                            )}
                        </div>

                        {/* Existing follow-ups */}
                        {followUps.length > 0 && (
                            <div className="space-y-3 pl-1 mb-4">
                                {followUps.map((m, i) => (
                                    <div key={i} className="bg-orange-50/50 border border-orange-100 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-extrabold text-brand-orange flex items-center gap-1.5">
                                                {isB2C ? 'Revisit' : 'Follow-up'} {i + 1}
                                            </span>
                                            <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-100">
                                                {fmt(m.date)}
                                            </span>
                                        </div>
                                        {(m.meetingStart || m.meetingEnd) && (
                                            <div className="flex items-center gap-2 mb-2 text-[11px] text-slate-500">
                                                <Clock className="w-3 h-3" />
                                                {fmtTime(m.meetingStart)}{m.meetingEnd ? ` — ${fmtTime(m.meetingEnd)}` : ''}
                                            </div>
                                        )}
                                        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: m.notes }} />
                                        {m.keyOutcomes && (
                                            <div className="mt-2 pt-2 border-t border-orange-100">
                                                <p className="text-[10px] font-bold text-brand-orange uppercase tracking-wider mb-0.5">Key Outcomes</p>
                                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{m.keyOutcomes}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {followUps.length === 0 && !showFollowUpForm && (
                            <p className="text-xs text-slate-400 pl-1 mb-3">No follow-up visits logged yet.</p>
                        )}

                        {/* Add follow-up form */}
                        {showFollowUpForm && (
                            <div className="bg-orange-50/60 border border-orange-200 rounded-2xl p-4 animate-slide-down">
                                <h4 className="text-xs font-bold text-slate-700 mb-3">{isB2C ? 'Log New Revisit' : `Log Visit ${followUps.length + 2}`}</h4>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Date *</label>
                                            <input type="date" value={fuDate} onChange={e => setFuDate(e.target.value)} className="input-field h-9 text-sm mt-0.5" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Start Time</label>
                                            <input type="time" value={fuStart} onChange={e => setFuStart(e.target.value)} className="input-field h-9 text-sm mt-0.5" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">End Time</label>
                                            <input type="time" value={fuEnd} onChange={e => setFuEnd(e.target.value)} className="input-field h-9 text-sm mt-0.5" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Discussion Points *</label>
                                        <textarea
                                            value={fuNotes}
                                            onChange={e => setFuNotes(e.target.value)}
                                            rows={3}
                                            placeholder="Key points discussed in this follow-up visit..."
                                            className="input-field text-sm mt-0.5 resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Key Outcomes / Decisions</label>
                                        <textarea
                                            value={fuOutcomes}
                                            onChange={e => setFuOutcomes(e.target.value)}
                                            rows={2}
                                            placeholder="What was decided or achieved..."
                                            className="input-field text-sm mt-0.5 resize-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleAddFollowUp}
                                        disabled={addingFollowUp}
                                        className="btn-primary py-2 px-5 text-xs flex items-center gap-2"
                                    >
                                        {addingFollowUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                        {addingFollowUp ? 'Adding...' : (isB2C ? 'Log Revisit' : 'Add Follow-up Visit')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* ── Footer ──────────────────────────────────────── */}
                <div className="sticky bottom-0 z-20 p-4 bg-white border-t border-meridian-border flex items-center justify-between gap-3">
                    <button onClick={onClose} className="btn-outline py-2.5 px-6 text-sm">
                        Close
                    </button>
                    <button
                        onClick={onEdit}
                        className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2 shadow-brand-blue/30"
                    >
                        <Edit className="w-4 h-4" />
                        Edit Visit
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VisitDetailModal;
