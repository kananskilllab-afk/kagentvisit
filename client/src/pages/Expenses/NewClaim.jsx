import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import {
    FileText, ArrowLeft, Loader2, MapPin, Calendar, IndianRupee,
    Check, Receipt, Navigation, AlertCircle, Plus, X, Upload,
    ChevronDown, Building2, Sparkles
} from 'lucide-react';

const CATEGORY_LABELS = {
    flight: 'Flight', train: 'Train', bus: 'Bus', cab: 'Cab', metro: 'Metro',
    hotel: 'Hotel', food: 'Food', agent_entertainment: 'Entertainment',
    internet_phone: 'Internet/Phone', parking_toll: 'Parking/Toll',
    visa_passport: 'Visa/Passport', office_supplies: 'Office Supplies', other: 'Other'
};

function PolicyNotices({ notices, warnings, onDismiss }) {
    if (!notices?.length && !warnings?.length) return null;
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Policy notices — claim can still be submitted</p>
                {onDismiss && (
                    <button type="button" onClick={onDismiss} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
                )}
            </div>
            {notices?.map((v, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
                    <div><span className="font-medium">{v.code}: </span>{v.message}</div>
                </div>
            ))}
            {warnings?.map((w, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>{w.message}</div>
                </div>
            ))}
        </div>
    );
}

function TemplatesPicker({ templates, planType, onAdd }) {
    const [selected, setSelected] = useState([]);
    const [open, setOpen] = useState(false);

    const filtered = templates.filter(t =>
        !planType || !t.allowedPlanTypes?.length || t.allowedPlanTypes.includes(planType)
    );

    const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const handleAdd = () => {
        const chosen = filtered.filter(t => selected.includes(t._id));
        onAdd(chosen);
        setSelected([]);
        setOpen(false);
    };

    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors">
                <Sparkles className="w-3.5 h-3.5" /> Add from templates
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-20 left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl">
                    <div className="p-3 border-b border-gray-100">
                        <div className="text-xs font-semibold text-gray-600 mb-2">Select expense templates</div>
                        <div className="space-y-1 max-h-52 overflow-y-auto">
                            {filtered.length === 0 ? (
                                <div className="text-xs text-gray-400 py-3 text-center">No templates available</div>
                            ) : filtered.map(t => (
                                <button key={t._id} type="button" onClick={() => toggle(t._id)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors
                                        ${selected.includes(t._id) ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                                        ${selected.includes(t._id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                                        {selected.includes(t._id) && <Check className="w-2.5 h-2.5" />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium truncate">{t.name}</div>
                                        <div className="text-xs text-gray-400">{CATEGORY_LABELS[t.category]}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="p-2 flex justify-between">
                        <button type="button" onClick={() => { setOpen(false); setSelected([]); }}
                            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">Cancel</button>
                        <button type="button" onClick={handleAdd} disabled={!selected.length}
                            className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1 hover:bg-blue-700 disabled:opacity-50">
                            Add {selected.length > 0 ? selected.length : ''} selected
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const NewClaim = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const planIdParam = searchParams.get('planId');
    const typeParam = searchParams.get('type') || 'advance';

    const [submitting, setSubmitting] = useState(false);
    const [policyNotices, setPolicyNotices] = useState([]);
    const [policyWarnings, setPolicyWarnings] = useState([]);
    const [noticesDismissed, setNoticesDismissed] = useState(false);
    const [expenses, setExpenses] = useState([]);
    const [loadingExpenses, setLoadingExpenses] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [templates, setTemplates] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [balance, setBalance] = useState(null);

    const [form, setForm] = useState({
        title: '',
        description: '',
        travelPurpose: '',
        travelFrom: { city: '', state: '' },
        travelTo: { city: '', state: '' },
        travelStartDate: '',
        travelEndDate: '',
        claimLocation: { city: '', state: '', coordinates: { lat: null, lng: null } },
        claimType: typeParam,
        visitPlanRef: planIdParam || '',
    });

    // Load plans
    useEffect(() => {
        api.get('/visit-plans', { params: { status: form.claimType === 'advance' ? 'scheduled' : undefined } })
            .then(r => {
                const data = r.data.data || [];
                setPlans(data);
                if (planIdParam) {
                    const found = data.find(p => p._id === planIdParam);
                    if (found) selectPlan(found);
                }
            })
            .finally(() => setLoadingPlans(false));
    }, [form.claimType]);

    // Load templates
    useEffect(() => {
        api.get('/expense-templates').then(r => setTemplates(r.data.data || [])).catch(() => {});
    }, []);

    const selectPlan = useCallback((plan) => {
        setSelectedPlan(plan);
        setForm(prev => ({
            ...prev,
            visitPlanRef: plan._id,
            travelPurpose: prev.travelPurpose || plan.purpose || '',
            travelTo: { city: plan.city, state: plan.state || '' },
            travelStartDate: prev.travelStartDate || plan.plannedStartAt?.slice(0, 10) || '',
            travelEndDate: prev.travelEndDate || plan.plannedEndAt?.slice(0, 10) || '',
            title: prev.title || `${plan.title} — ${form.claimType}`,
        }));
        // Load balance
        api.get(`/visit-plans/${plan._id}/balance`)
            .then(r => setBalance(r.data.data))
            .catch(() => setBalance(null));
    }, [form.claimType]);

    useEffect(() => {
        fetchUnclaimedExpenses();
        detectLocation();
    }, [form.visitPlanRef]);

    const fetchUnclaimedExpenses = async () => {
        setLoadingExpenses(true);
        try {
            const params = { unclaimed: 'true' };
            if (form.visitPlanRef) params.visitPlanRef = form.visitPlanRef;
            const res = await api.get('/expenses', { params });
            setExpenses(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch expenses', err);
        } finally {
            setLoadingExpenses(false);
        }
    };

    const detectLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(pos => {
            setForm(prev => ({
                ...prev,
                claimLocation: { ...prev.claimLocation, coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude } }
            }));
        }, () => {});
    };

    const addFromTemplates = (chosen) => {
        // Navigate to add expense with pre-filled template info — for now, just notify user
        if (chosen.length > 0) {
            alert(`Create ${chosen.length} expense(s) from templates: ${chosen.map(t => t.name).join(', ')}. Use the "Add Expense" page to pre-fill from a template, then return here.`);
        }
    };

    const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
    const handleNestedChange = (parent, field, value) => setForm(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));

    const toggleExpense = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const selectAll = () => setSelectedIds(selectedIds.length === expenses.length ? [] : expenses.map(e => e._id));

    const selectedTotal = expenses.filter(e => selectedIds.includes(e._id)).reduce((s, e) => s + (e.amount || 0), 0);

    const hasMissingReceipts = expenses
        .filter(e => selectedIds.includes(e._id))
        .some(e => !e.receiptUrl);

    const handleSubmit = async (e, submitNow = false) => {
        e?.preventDefault();
        setPolicyNotices([]);
        setPolicyWarnings([]);
        setNoticesDismissed(false);

        if (!form.title.trim()) { alert('Please provide a claim title'); return; }
        if (!form.visitPlanRef) { alert('Please select a visit plan — you must schedule a visit before claiming.'); return; }
        if (selectedIds.length === 0) { alert('Please select at least one expense'); return; }

        setSubmitting(true);
        try {
            const res = await api.post('/expenses/claims', { ...form, expenseIds: selectedIds });
            const claim = res.data.data;

            if (submitNow) {
                const subRes = await api.post(`/expenses/claims/${claim._id}/submit`);
                // Show any notices returned (non-blocking)
                if (subRes.data.policyNotices?.length || subRes.data.policyWarnings?.length) {
                    setPolicyNotices(subRes.data.policyNotices || []);
                    setPolicyWarnings(subRes.data.policyWarnings || []);
                }
            }
            navigate(submitNow ? '/' : `/expenses/claims/${claim._id}`);
        } catch (err) {
            const errData = err.response?.data;
            alert(errData?.message || 'Error creating claim');
        } finally {
            setSubmitting(false);
        }
    };

    const noPlan = !loadingPlans && plans.length === 0;

    return (
        <div className="space-y-6 page-enter max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/expenses/claims')} className="p-2 rounded-xl hover:bg-slate-100 transition-all">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                    <h1 className="page-title">New Expense Claim</h1>
                    <p className="page-subtitle">Claim expenses against a scheduled visit plan</p>
                </div>
            </div>

            {/* Policy notices (non-blocking) */}
            {!noticesDismissed && (policyNotices.length > 0 || policyWarnings.length > 0) && (
                <PolicyNotices
                    notices={policyNotices}
                    warnings={policyWarnings}
                    onDismiss={() => setNoticesDismissed(true)}
                />
            )}

            <form onSubmit={e => handleSubmit(e, false)} className="space-y-6">

                {/* ── Claim type + plan selector (mandatory) ── */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-brand-blue" />
                        Visit Plan & Claim Type
                        <span className="text-red-500 text-xs ml-auto">* Required</span>
                    </h3>

                    {/* Claim type toggle */}
                    <div>
                        <label className="label">Claim Type</label>
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                            {[
                                { value: 'advance',       label: 'Advance',       desc: 'Pre-visit funding' },
                                { value: 'reimbursement', label: 'Reimbursement', desc: 'Post-visit payout' },
                            ].map(({ value, label, desc }) => (
                                <button key={value} type="button"
                                    onClick={() => handleChange('claimType', value)}
                                    className={`flex-1 py-2.5 px-4 text-sm transition-colors ${
                                        form.claimType === value
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}>
                                    <div className="font-medium">{label}</div>
                                    <div className={`text-xs ${form.claimType === value ? 'text-blue-100' : 'text-gray-400'}`}>{desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Plan selector */}
                    <div>
                        <label className="label">Visit Plan *</label>
                        {noPlan ? (
                            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                No visit plans found. <Link to="/calendar" className="underline font-medium">Schedule a visit first.</Link>
                            </div>
                        ) : loadingPlans ? (
                            <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading plans...
                            </div>
                        ) : (
                            <select className="input-field"
                                value={form.visitPlanRef}
                                onChange={e => {
                                    const p = plans.find(p => p._id === e.target.value);
                                    if (p) selectPlan(p); else { setSelectedPlan(null); handleChange('visitPlanRef', ''); }
                                }}
                                disabled={!!planIdParam}
                                required>
                                <option value="">Select a visit plan</option>
                                {plans.map(p => (
                                    <option key={p._id} value={p._id}>
                                        {p.title} — {p.city} ({new Date(p.plannedStartAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Balance preview */}
                    {balance && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                            <IndianRupee className="w-4 h-4 text-green-700 flex-shrink-0" />
                            <div>
                                <span className="font-medium text-green-800">
                                    ₹{((balance.grantedAmount || 0) - (balance.spentAmount || 0)).toLocaleString('en-IN')} remaining
                                </span>
                                <span className="text-green-600 text-xs ml-2">of ₹{(balance.grantedAmount || 0).toLocaleString('en-IN')} granted</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Claim Details */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-blue" />
                        Claim Details
                    </h3>
                    <div>
                        <label className="label">Claim Title *</label>
                        <input type="text" className="input-field" placeholder="e.g., Mumbai B2B Visit – April 2026 – Advance"
                            value={form.title} onChange={e => handleChange('title', e.target.value)} required />
                    </div>
                    <div>
                        <label className="label">Travel Purpose</label>
                        <input type="text" className="input-field" placeholder="B2B agent visit and partnership meetings"
                            value={form.travelPurpose} onChange={e => handleChange('travelPurpose', e.target.value)} />
                    </div>
                    <div>
                        <label className="label">Description (optional)</label>
                        <textarea className="input-field min-h-[60px]"
                            value={form.description} onChange={e => handleChange('description', e.target.value)} />
                    </div>
                </div>

                {/* Select Expenses */}
                <div className="card p-5 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-brand-blue" />
                            Select Expenses ({selectedIds.length} selected)
                        </h3>
                        <div className="flex items-center gap-2">
                            {selectedPlan && templates.length > 0 && (
                                <TemplatesPicker
                                    templates={templates}
                                    planType={selectedPlan?.planType}
                                    onAdd={addFromTemplates}
                                />
                            )}
                            {expenses.length > 0 && (
                                <button type="button" onClick={selectAll}
                                    className="text-xs font-bold text-brand-blue hover:underline">
                                    {selectedIds.length === expenses.length ? 'Deselect all' : 'Select all'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notice: missing receipts (informational, not blocking) */}
                    {hasMissingReceipts && selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            Some selected expenses are missing a receipt. Per policy, bills are required — reviewers will be notified.
                        </div>
                    )}

                    {loadingExpenses ? (
                        <div className="py-6 flex items-center justify-center gap-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="py-6 text-center">
                            <p className="text-sm text-slate-500">No unclaimed expenses found for this plan.</p>
                            <button type="button" onClick={() => navigate('/expenses/add')}
                                className="mt-2 text-sm font-bold text-brand-blue hover:underline">
                                Add Expenses First
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {expenses.map(exp => {
                                const selected = selectedIds.includes(exp._id);
                                const missingReceipt = !exp.receiptUrl;
                                return (
                                    <button key={exp._id} type="button" onClick={() => toggleExpense(exp._id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left
                                            ${selected ? 'border-brand-blue bg-brand-blue/5' : 'border-slate-100 hover:border-slate-200'}`}>
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0
                                            ${selected ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-300'}`}>
                                            {selected && <Check className="w-3 h-3" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-700">
                                                {CATEGORY_LABELS[exp.category] || exp.category}
                                                {exp.vendor && <span className="font-normal text-slate-400"> – {exp.vendor}</span>}
                                            </p>
                                            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(exp.expenseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                {exp.travelFrom?.city && exp.travelTo?.city && (
                                                    <span>{exp.travelFrom.city} → {exp.travelTo.city}</span>
                                                )}
                                            </p>
                                        </div>
                                        {/* Receipt status */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {missingReceipt ? (
                                                <span className="text-[10px] text-orange-600 border border-orange-200 rounded px-1.5 py-0.5 bg-orange-50">
                                                    No receipt
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-green-600 border border-green-200 rounded px-1.5 py-0.5 bg-green-50">
                                                    Receipt ✓
                                                </span>
                                            )}
                                            <p className="font-bold text-slate-800">
                                                {exp.amount?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {selectedIds.length > 0 && (
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <p className="text-sm font-bold text-slate-600">Total Claim Amount</p>
                            <p className="text-xl font-extrabold text-brand-blue flex items-center gap-1">
                                <IndianRupee className="w-4 h-4" />
                                {selectedTotal.toLocaleString('en-IN')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button type="button" onClick={() => navigate('/expenses/claims')} className="flex-1 btn-outline py-3">
                        Cancel
                    </button>
                    <button type="submit"
                        disabled={submitting || !form.title || !form.visitPlanRef || selectedIds.length === 0}
                        className="flex-1 btn-outline py-3 flex items-center justify-center gap-2 border-brand-blue text-brand-blue hover:bg-brand-blue/5">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save as Draft'}
                    </button>
                    <button type="button"
                        onClick={e => handleSubmit(e, true)}
                        disabled={submitting || !form.title || !form.visitPlanRef || selectedIds.length === 0}
                        className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                        {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                            : <><FileText className="w-4 h-4" /> Submit Claim</>
                        }
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewClaim;
