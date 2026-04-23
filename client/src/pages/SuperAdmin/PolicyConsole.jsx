import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Check, AlertCircle, Loader2, ChevronDown, ChevronUp, Shield, Zap, Trash2, Pencil } from 'lucide-react';
import api from '../../utils/api';

const KIND_LABEL = { standard: 'Standard', leadership: 'Leadership' };
const KIND_COLOR = {
    standard:   'bg-blue-100 text-blue-700',
    leadership: 'bg-purple-100 text-purple-700',
};

const CATEGORY_OPTIONS = [
    'flight','train','bus','cab','metro','hotel','food',
    'agent_entertainment','internet_phone','parking_toll',
    'visa_passport','office_supplies','other'
];

const BOOKING_MODES = ['ola','uber','app_other','public_transport','direct','other'];

function RuleRow({ rule, onChange, onDelete }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 border border-gray-100 rounded-lg bg-gray-50/50 items-start">
            <select className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                value={rule.category} onChange={e => onChange({ ...rule, category: e.target.value })}>
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="space-y-1">
                <input type="number" placeholder="Max/day (null=∞)" className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                    value={rule.maxPerDay ?? ''} onChange={e => onChange({ ...rule, maxPerDay: e.target.value === '' ? null : Number(e.target.value) })} />
                <input type="number" placeholder="Max/visit (null=∞)" className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                    value={rule.maxPerVisit ?? ''} onChange={e => onChange({ ...rule, maxPerVisit: e.target.value === '' ? null : Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={!!rule.requiresReceipt}
                        onChange={e => onChange({ ...rule, requiresReceipt: e.target.checked })} />
                    Receipt required
                </label>
                <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={!!rule.requiresPreBooking}
                        onChange={e => onChange({ ...rule, requiresPreBooking: e.target.checked })} />
                    Pre-booking required
                </label>
                <div className="text-[10px] text-gray-500">Allowed booking modes:</div>
                <div className="flex flex-wrap gap-1">
                    {BOOKING_MODES.map(m => (
                        <button key={m} type="button"
                            onClick={() => {
                                const cur = rule.allowedBookingModes || [];
                                onChange({ ...rule, allowedBookingModes: cur.includes(m) ? cur.filter(x => x !== m) : [...cur, m] });
                            }}
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                (rule.allowedBookingModes || []).includes(m)
                                    ? 'bg-blue-100 border-blue-400 text-blue-700'
                                    : 'border-gray-200 text-gray-500'
                            }`}>
                            {m}
                        </button>
                    ))}
                </div>
            </div>
            <button onClick={onDelete} className="text-red-400 hover:text-red-600 self-start ml-auto">
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

function PolicyCard({ policy, onActivate, onEdit, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const [activating, setActivating] = useState(false);

    const handleActivate = async () => {
        if (!window.confirm(`Activate "${policy.name} v${policy.version}"? The current active ${policy.policyKind} policy will be superseded.`)) return;
        setActivating(true);
        try { await onActivate(policy._id); } finally { setActivating(false); }
    };

    return (
        <div className={`border rounded-xl overflow-hidden ${policy.isActive ? 'border-green-300 shadow-sm' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3 px-4 py-3 bg-white">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${policy.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Shield className={`w-4 h-4 ${policy.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800">{policy.name}</span>
                        <span className="text-xs text-gray-400">v{policy.version}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KIND_COLOR[policy.policyKind]}`}>
                            {KIND_LABEL[policy.policyKind]}
                        </span>
                        {policy.isActive && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" /> Active
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                        Effective {new Date(policy.effectiveFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {policy.activatedAt && ` · Activated ${new Date(policy.activatedAt).toLocaleDateString('en-IN')}`}
                        {` · ${policy.rules?.length || 0} rules`}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!policy.isActive && !policy.activatedAt && (
                        <>
                            <button onClick={() => onEdit(policy)} className="p-1.5 text-gray-400 hover:text-blue-600">
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => onDelete(policy._id)} className="p-1.5 text-gray-400 hover:text-red-500">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                    {!policy.isActive && (
                        <button onClick={handleActivate} disabled={activating}
                            className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 flex items-center gap-1">
                            {activating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                            Activate
                        </button>
                    )}
                    <button onClick={() => setExpanded(e => !e)} className="p-1.5 text-gray-400">
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-1.5">
                    <div className="text-xs font-semibold text-gray-500 mb-2">Rules ({policy.rules?.length})</div>
                    {policy.rules?.map((r, i) => (
                        <div key={i} className="text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-0.5 border border-gray-200 bg-white rounded px-2.5 py-1.5">
                            <span className="font-medium">{r.category}</span>
                            {r.maxPerDay !== null && r.maxPerDay !== undefined && <span>Max/day: ₹{r.maxPerDay}</span>}
                            {r.maxPerVisit !== null && r.maxPerVisit !== undefined && <span>Max/visit: ₹{r.maxPerVisit}</span>}
                            {r.requiresReceipt && <span className="text-green-700">Receipt req.</span>}
                            {r.requiresPreBooking && <span className="text-blue-700">Pre-book req.</span>}
                            {r.allowedBookingModes?.length > 0 && <span>Modes: {r.allowedBookingModes.join(', ')}</span>}
                        </div>
                    ))}
                    <div className="mt-2 pt-2 border-t border-gray-200 space-y-0.5 text-xs text-gray-500">
                        <div>Client photo per schedule: {policy.globalRequirements?.clientPhotoPerSchedule ? '✓' : '✗'}</div>
                        <div>Receipt for all expenses: {policy.globalRequirements?.receiptRequiredForAllExpenses ? '✓' : '✗'}</div>
                        <div>Reimbursement window: {policy.globalRequirements?.reimbursementWindowDays ?? 7} days</div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PolicyEditor({ initial, onSave, onCancel }) {
    const [form, setForm] = useState(initial || {
        name: '', version: 'v1.0', policyKind: 'standard',
        description: '', effectiveFrom: new Date().toISOString().slice(0, 10),
        rules: [],
        globalRequirements: {
            clientPhotoPerSchedule: true,
            photoBackgroundMustShowBusinessIdentity: true,
            receiptRequiredForAllExpenses: true,
            reimbursementWindowDays: 7
        }
    });
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const addRule = () => setForm(f => ({
        ...f,
        rules: [...f.rules, { category: 'food', cityTier: 'any', maxPerDay: null, maxPerVisit: null,
            requiresReceipt: true, requiresPreBooking: false, allowedBookingModes: [] }]
    }));

    const updateRule = (i, rule) => setForm(f => ({ ...f, rules: f.rules.map((r, idx) => idx === i ? rule : r) }));
    const deleteRule = (i) => setForm(f => ({ ...f, rules: f.rules.filter((_, idx) => idx !== i) }));

    const handleSave = async () => {
        if (!form.name || !form.version || !form.policyKind) { setErr('Name, version, and kind are required'); return; }
        setSaving(true); setErr('');
        try { await onSave(form); } catch (e) { setErr(e.message); setSaving(false); }
    };

    return (
        <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/20 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">{initial?._id ? 'Edit Policy' : 'New Policy'}</h3>
            {err && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</div>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                    <label className="text-xs text-gray-500">Name *</label>
                    <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5"
                        value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                    <label className="text-xs text-gray-500">Version *</label>
                    <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5"
                        value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
                </div>
                <div>
                    <label className="text-xs text-gray-500">Kind *</label>
                    <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5"
                        value={form.policyKind} onChange={e => setForm(f => ({ ...f, policyKind: e.target.value }))}>
                        <option value="standard">Standard</option>
                        <option value="leadership">Leadership</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-gray-500">Effective from</label>
                    <input type="date" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5"
                        value={form.effectiveFrom?.slice(0, 10)} onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
                </div>
            </div>

            <div>
                <label className="text-xs text-gray-500">Description</label>
                <textarea className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 min-h-[50px]"
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Global requirements */}
            <div className="grid grid-cols-2 gap-2">
                {[
                    ['clientPhotoPerSchedule',            'Client photo per schedule'],
                    ['receiptRequiredForAllExpenses',      'Receipt required for all'],
                    ['photoBackgroundMustShowBusinessIdentity', 'Photo must show business identity'],
                ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={!!form.globalRequirements?.[key]}
                            onChange={e => setForm(f => ({ ...f, globalRequirements: { ...f.globalRequirements, [key]: e.target.checked } }))} />
                        {label}
                    </label>
                ))}
                <label className="flex items-center gap-2 text-xs">
                    <span>Reimb. window (days):</span>
                    <input type="number" className="w-14 border border-gray-200 rounded px-1 py-0.5 text-xs"
                        value={form.globalRequirements?.reimbursementWindowDays ?? 7}
                        onChange={e => setForm(f => ({ ...f, globalRequirements: { ...f.globalRequirements, reimbursementWindowDays: Number(e.target.value) } }))} />
                </label>
            </div>

            {/* Rules */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-600">Category rules ({form.rules.length})</label>
                    <button type="button" onClick={addRule}
                        className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                        <Plus className="w-3 h-3" /> Add rule
                    </button>
                </div>
                <div className="space-y-1.5">
                    {form.rules.map((r, i) => (
                        <RuleRow key={i} rule={r} onChange={rule => updateRule(i, rule)} onDelete={() => deleteRule(i)} />
                    ))}
                </div>
            </div>

            <div className="flex gap-2 pt-1">
                <button onClick={onCancel} className="flex-1 text-sm text-gray-600 border border-gray-200 rounded-lg py-2 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                    className="flex-1 text-sm bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {initial?._id ? 'Update' : 'Create draft'}
                </button>
            </div>
        </div>
    );
}

export default function PolicyConsole() {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showEditor, setShowEditor] = useState(false);
    const [editTarget, setEditTarget] = useState(null);

    const fetchPolicies = useCallback(async () => {
        setLoading(true);
        try {
            const r = await api.get('/policies');
            setPolicies(r.data.data || []);
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

    const handleSave = async (form) => {
        if (form._id) {
            await api.put(`/policies/${form._id}`, form);
        } else {
            await api.post('/policies', form);
        }
        setShowEditor(false);
        setEditTarget(null);
        fetchPolicies();
    };

    const handleActivate = async (id) => {
        await api.post(`/policies/${id}/activate`);
        fetchPolicies();
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this draft policy?')) return;
        await api.delete(`/policies/${id}`);
        fetchPolicies();
    };

    const standard = policies.filter(p => p.policyKind === 'standard');
    const leadership = policies.filter(p => p.policyKind === 'leadership');

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Policy Console</h1>
                    <p className="text-sm text-gray-500">Manage expense policies. Only activated policies are enforced.</p>
                </div>
                <button onClick={() => { setEditTarget(null); setShowEditor(s => !s); }}
                    className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4" /> New policy
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            {showEditor && (
                <PolicyEditor
                    initial={editTarget}
                    onSave={handleSave}
                    onCancel={() => { setShowEditor(false); setEditTarget(null); }}
                />
            )}

            {loading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading policies...
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Standard policies</h2>
                        {standard.length === 0 ? (
                            <div className="text-sm text-gray-400 text-center py-4">No standard policies.</div>
                        ) : standard.map(p => (
                            <PolicyCard key={p._id} policy={p}
                                onActivate={handleActivate}
                                onEdit={p => { setEditTarget(p); setShowEditor(true); }}
                                onDelete={handleDelete} />
                        ))}
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Leadership policies (HOD / Admin)</h2>
                        {leadership.length === 0 ? (
                            <div className="text-sm text-gray-400 text-center py-4">No leadership policies.</div>
                        ) : leadership.map(p => (
                            <PolicyCard key={p._id} policy={p}
                                onActivate={handleActivate}
                                onEdit={p => { setEditTarget(p); setShowEditor(true); }}
                                onDelete={handleDelete} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
