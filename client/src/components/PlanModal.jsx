import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Plus, Trash2, Loader2, MapPin, Users, Calendar, Check, Search } from 'lucide-react';
import CityAutocomplete from './shared/CityAutocomplete';
import { getCityTier } from '../utils/indianCities';

const API = import.meta.env.VITE_API_URL || '/api';

const STEPS = ['Plan details', 'Assign agents', 'Add visits', 'Review'];

const CITY_TIERS = [
    { value: 'tier_1', label: 'Tier 1' },
    { value: 'tier_2', label: 'Tier 2' },
    { value: 'tier_3', label: 'Tier 3' },
    { value: 'na',     label: 'N/A' },
];

const REMINDER_OPTIONS = [
    { value: 0,    label: 'No reminder' },
    { value: 15,   label: '15 min before' },
    { value: 60,   label: '1 hour before' },
    { value: 180,  label: '3 hours before' },
    { value: 1440, label: '1 day before' },
    { value: 2880, label: '2 days before' },
];

function toInputDatetime(date) {
    if (!date) return '';
    const d = new Date(date);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StepIndicator({ current }) {
    return (
        <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.map((label, i) => (
                <React.Fragment key={label}>
                    <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors
                            ${i < current ? 'bg-green-500 text-white' :
                              i === current ? 'bg-blue-600 text-white' :
                              'bg-gray-200 text-gray-500'}`}>
                            {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
                        </div>
                        <span className={`text-[10px] hidden sm:block ${i === current ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                            {label}
                        </span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-1 rounded ${i < current ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

export default function PlanModal({ defaultDate, editPlan = null, onClose, onSaved }) {
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [agentSearch, setAgentSearch] = useState('');
    const [agentResults, setAgentResults] = useState([]);
    const [searchingAgents, setSearchingAgents] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const searchContainerRef = useRef(null);

    const defaultStart = defaultDate ? new Date(defaultDate) : new Date();
    defaultStart.setHours(9, 0, 0, 0);
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setDate(defaultEnd.getDate() + 1);

    // Step 1 — Plan details
    const [details, setDetails] = useState({
        title: editPlan?.title || '',
        planType: editPlan?.planType || 'single',
        city: editPlan?.city || '',
        state: editPlan?.state || '',
        pinCode: editPlan?.pinCode || '',
        cityTier: editPlan?.cityTier || 'na',
        plannedStartAt: editPlan?.plannedStartAt ? toInputDatetime(editPlan.plannedStartAt) : toInputDatetime(defaultStart),
        plannedEndAt: editPlan?.plannedEndAt ? toInputDatetime(editPlan.plannedEndAt) : toInputDatetime(defaultEnd),
        purpose: editPlan?.purpose || '',
        notes: editPlan?.notes || '',
    });

    // Step 2 — Agents: DB agents have { _id, name }, custom-only ones have { _id: null, name }
    const [selectedAgents, setSelectedAgents] = useState(
        editPlan?.agents?.map(a => ({ _id: a._id || a, name: a.name || '' })) || []
    );
    const [customAgentNames, setCustomAgentNames] = useState(
        editPlan?.customAgentNames || []
    );
    const [customInput, setCustomInput] = useState('');

    // Step 3 — Visits
    const [visits, setVisits] = useState([{
        title: '',
        agentId: '',
        customAgentName: '',
        scheduledDate: toInputDatetime(defaultStart),
        reminderOffset: 60,
        location: '',
        notes: '',
    }]);

    // Search agents with debounce
    useEffect(() => {
        if (!agentSearch.trim()) { setAgentResults([]); return; }
        const t = setTimeout(async () => {
            setSearchingAgents(true);
            try {
                const r = await fetch(`${API}/agents?active=true&search=${encodeURIComponent(agentSearch.trim())}`, { credentials: 'include' });
                const d = await r.json();
                if (d.success) setAgentResults(d.data || []);
            } catch {}
            setSearchingAgents(false);
        }, 250);
        return () => clearTimeout(t);
    }, [agentSearch]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
                setSearchFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addAgent = (agent) => {
        if (selectedAgents.some(a => a._id === agent._id)) return;
        setSelectedAgents(prev => [...prev, agent]);
        setAgentSearch('');
        setAgentResults([]);
        setSearchFocused(false);
    };

    const removeAgent = (id) => setSelectedAgents(prev => prev.filter(a => a._id !== id));

    const addCustomName = () => {
        const name = customInput.trim();
        if (!name) return;
        if (customAgentNames.includes(name)) { setCustomInput(''); return; }
        setCustomAgentNames(prev => [...prev, name]);
        setCustomInput('');
        setAgentSearch('');
        setAgentResults([]);
    };

    const removeCustomName = (name) => {
        setCustomAgentNames(prev => prev.filter(n => n !== name));
        // Remove any visits assigned to this custom agent
        setVisits(prev => prev.map(v => v.customAgentName === name ? { ...v, customAgentName: '' } : v));
    };

    // All agent options for visit step: DB agents + custom names
    const allAgentOptions = [
        ...selectedAgents.map(a => ({ type: 'db', id: a._id, label: a.name })),
        ...customAgentNames.map(n => ({ type: 'custom', id: n, label: `${n} (custom)` })),
    ];

    const addVisit = () => {
        const firstAgent = selectedAgents[0]?._id || '';
        const firstCustom = !firstAgent && customAgentNames[0] ? customAgentNames[0] : '';
        setVisits(prev => [...prev, {
            title: '', agentId: firstAgent, customAgentName: firstCustom,
            scheduledDate: toInputDatetime(defaultStart), reminderOffset: 60, location: '', notes: ''
        }]);
    };

    const removeVisit = (i) => setVisits(prev => prev.filter((_, idx) => idx !== i));

    const updateVisit = (i, key, val) => setVisits(prev => prev.map((v, idx) => idx === i ? { ...v, [key]: val } : v));

    // Validation per step
    const canProceed = () => {
        if (step === 0) return details.title && details.city && details.plannedStartAt && details.plannedEndAt;
        if (step === 1) return selectedAgents.length > 0 || customAgentNames.length > 0;
        if (step === 2) return visits.length > 0 && visits.every(v =>
            v.title && v.scheduledDate && (v.agentId || v.customAgentName)
        );
        return true;
    };

    const handleSubmit = async () => {
        setSaving(true); setError('');
        try {
            // 1. Create / update the plan
            const planPayload = {
                ...details,
                agents: selectedAgents.map(a => a._id),
                customAgentNames,
                plannedStartAt: new Date(details.plannedStartAt).toISOString(),
                plannedEndAt: new Date(details.plannedEndAt).toISOString(),
            };

            let plan;
            if (editPlan) {
                const r = await fetch(`${API}/visit-plans/${editPlan._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(planPayload)
                });
                const d = await r.json();
                if (!d.success) throw new Error(d.message);
                plan = d.data;
            } else {
                const r = await fetch(`${API}/visit-plans`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(planPayload)
                });
                const d = await r.json();
                if (!d.success) throw new Error(d.message);
                plan = d.data;
            }

            // 2. Create schedules
            for (const v of visits) {
                const schedPayload = {
                    title: v.title,
                    // Provide whichever identifier was selected
                    ...(v.agentId ? { agentId: v.agentId } : {}),
                    ...(v.customAgentName ? { customAgentName: v.customAgentName } : {}),
                    scheduledDate: new Date(v.scheduledDate).toISOString(),
                    reminderOffset: Number(v.reminderOffset) || 0,
                    location: v.location || `${details.city}${details.state ? ', ' + details.state : ''}`,
                    notes: v.notes,
                    syncToGoogle: true,
                };
                const r = await fetch(`${API}/visit-plans/${plan._id}/schedules`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(schedPayload)
                });
                const d = await r.json();
                if (!d.success) throw new Error(d.message);
            }

            onSaved(plan);
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-800">{editPlan ? 'Edit Visit Plan' : 'Create Visit Plan'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Step indicator */}
                <div className="px-6 pt-4">
                    <StepIndicator current={step} />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
                    {/* ── Step 0: Plan details ── */}
                    {step === 0 && (
                        <>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Plan title *</label>
                                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Mumbai B2B Visit — April 2026"
                                    value={details.title} onChange={e => setDetails(d => ({ ...d, title: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
                                    <CityAutocomplete
                                        city={details.city}
                                        state={details.state}
                                        placeholder="Type to search city"
                                        onSelect={(city, state) => {
                                            const tier = city ? getCityTier(city) : null;
                                            setDetails(d => ({ ...d, city, state: state || d.state, ...(tier ? { cityTier: tier } : {}) }));
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">State (auto-detected)</label>
                                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Auto-filled on city select"
                                        value={details.state} onChange={e => setDetails(d => ({ ...d, state: e.target.value }))} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">City tier</label>
                                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={details.cityTier} onChange={e => setDetails(d => ({ ...d, cityTier: e.target.value }))}>
                                        {CITY_TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Visit type</label>
                                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={details.planType} onChange={e => setDetails(d => ({ ...d, planType: e.target.value }))}>
                                        <option value="single">Single visit</option>
                                        <option value="multi_same_city">Multiple visits (same city)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Start date/time *</label>
                                    <input type="datetime-local"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={details.plannedStartAt} onChange={e => setDetails(d => ({ ...d, plannedStartAt: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">End date/time *</label>
                                    <input type="datetime-local"
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={details.plannedEndAt} onChange={e => setDetails(d => ({ ...d, plannedEndAt: e.target.value }))} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Purpose</label>
                                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="B2B agent visits"
                                    value={details.purpose} onChange={e => setDetails(d => ({ ...d, purpose: e.target.value }))} />
                            </div>
                        </>
                    )}

                    {/* ── Step 1: Agents ── */}
                    {step === 1 && (
                        <>
                            <p className="text-xs text-gray-500">Search and add agents from the Manage Agent directory. At least one required.</p>
                            <div className="relative" ref={searchContainerRef}>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                    <input
                                        className="w-full border border-gray-200 rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Type agent or company name..."
                                        value={agentSearch}
                                        onChange={e => setAgentSearch(e.target.value)}
                                        onFocus={() => setSearchFocused(true)}
                                        autoComplete="off"
                                    />
                                    {searchingAgents && (
                                        <div className="absolute right-3 top-2.5"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
                                    )}
                                    {!searchingAgents && agentSearch && (
                                        <button
                                            type="button"
                                            onClick={() => { setAgentSearch(''); setAgentResults([]); }}
                                            className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                {searchFocused && agentSearch.trim() && (
                                    <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-52 overflow-y-auto">
                                        {agentResults.length === 0 && !searchingAgents ? (
                                            <div className="px-4 py-3 text-sm text-gray-400 text-center">No agents found for "{agentSearch}"</div>
                                        ) : (
                                            agentResults.map(a => {
                                                const alreadyAdded = selectedAgents.some(s => s._id === a._id);
                                                return (
                                                    <button key={a._id} onClick={() => addAgent(a)}
                                                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors
                                                            ${alreadyAdded ? 'bg-green-50 hover:bg-green-50 cursor-default' : 'hover:bg-blue-50'}`}>
                                                        <div className="min-w-0">
                                                            <div className={`font-medium truncate ${alreadyAdded ? 'text-green-700' : 'text-gray-800'}`}>{a.name}</div>
                                                            {(a.city || a.state) && (
                                                                <div className="text-xs text-gray-400 truncate">{[a.city, a.state].filter(Boolean).join(', ')}</div>
                                                            )}
                                                        </div>
                                                        {alreadyAdded && <Check className="w-4 h-4 text-green-500 flex-shrink-0" />}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Custom name — add unlisted company */}
                            <div className="border border-dashed border-gray-300 rounded-xl p-3 space-y-2 bg-gray-50/50">
                                <p className="text-xs text-gray-500 font-medium">Company/agent not listed? Add by name:</p>
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., Sunrise Consultancy"
                                        value={customInput}
                                        onChange={e => setCustomInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomName(); } }}
                                    />
                                    <button type="button" onClick={addCustomName}
                                        className="text-sm bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-800">
                                        Add
                                    </button>
                                </div>
                                {customAgentNames.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {customAgentNames.map(n => (
                                            <span key={n} className="flex items-center gap-1 text-xs bg-gray-200 text-gray-700 rounded-full px-2.5 py-0.5">
                                                {n}
                                                <button type="button" onClick={() => removeCustomName(n)} className="hover:text-red-600">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedAgents.length === 0 && customAgentNames.length === 0 ? (
                                <div className="text-center py-4 text-gray-400 text-sm">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    Search above or add a custom company name
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedAgents.map(a => (
                                        <div key={a._id} className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg bg-blue-50/40">
                                            <div>
                                                <div className="text-sm font-medium text-gray-800">{a.name}</div>
                                                {a.city && <div className="text-xs text-gray-500">{a.city}</div>}
                                            </div>
                                            <button type="button" onClick={() => removeAgent(a._id)} className="text-gray-400 hover:text-red-500">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Step 2: Visits ── */}
                    {step === 2 && (
                        <>
                            <p className="text-xs text-gray-500">
                                {details.planType === 'single'
                                    ? 'Add the single visit schedule.'
                                    : 'Add all visit schedules for this city trip. Each must have an assigned agent.'}
                            </p>
                            {visits.map((v, i) => (
                                <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2.5 bg-gray-50/50">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-600">Visit {i + 1}</span>
                                        {visits.length > 1 && (
                                            <button onClick={() => removeVisit(i)} className="text-gray-400 hover:text-red-500">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Title *</label>
                                        <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                            placeholder="Agent meeting title"
                                            value={v.title} onChange={e => updateVisit(i, 'title', e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-gray-500">Agent / Company *</label>
                                            <select
                                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                value={v.agentId || (v.customAgentName ? `custom:${v.customAgentName}` : '')}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val.startsWith('custom:')) {
                                                        updateVisit(i, 'agentId', '');
                                                        updateVisit(i, 'customAgentName', val.replace('custom:', ''));
                                                    } else {
                                                        updateVisit(i, 'agentId', val);
                                                        updateVisit(i, 'customAgentName', '');
                                                    }
                                                }}>
                                                <option value="">Select agent / company</option>
                                                {selectedAgents.length > 0 && (
                                                    <optgroup label="From directory">
                                                        {selectedAgents.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                                                    </optgroup>
                                                )}
                                                {customAgentNames.length > 0 && (
                                                    <optgroup label="Custom names">
                                                        {customAgentNames.map(n => <option key={n} value={`custom:${n}`}>{n}</option>)}
                                                    </optgroup>
                                                )}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Reminder</label>
                                            <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                value={v.reminderOffset} onChange={e => updateVisit(i, 'reminderOffset', e.target.value)}>
                                                {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Date & time *</label>
                                        <input type="datetime-local"
                                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                            value={v.scheduledDate} onChange={e => updateVisit(i, 'scheduledDate', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">Location</label>
                                        <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                            placeholder={`${details.city || 'Location'}`}
                                            value={v.location} onChange={e => updateVisit(i, 'location', e.target.value)} />
                                    </div>
                                </div>
                            ))}

                            {(details.planType === 'multi_same_city' || visits.length === 0) && (
                                <button onClick={addVisit}
                                    className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                                    <Plus className="w-4 h-4" /> Add visit
                                </button>
                            )}
                        </>
                    )}

                    {/* ── Step 3: Review ── */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    {details.city}{details.state ? `, ${details.state}` : ''} ·
                                    <span className="text-gray-500 font-normal">{details.planType === 'multi_same_city' ? 'Multi-visit' : 'Single visit'}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    {new Date(details.plannedStartAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    {' → '}
                                    {new Date(details.plannedEndAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-gray-500 mb-2">
                                    <Users className="w-3.5 h-3.5 inline mr-1" />
                                    Agents ({selectedAgents.length + customAgentNames.length})
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedAgents.map(a => (
                                        <span key={a._id} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5">{a.name}</span>
                                    ))}
                                    {customAgentNames.map(n => (
                                        <span key={n} className="text-xs bg-gray-100 text-gray-600 border border-gray-300 rounded-full px-2.5 py-0.5">{n} (custom)</span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-gray-500 mb-2">
                                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                                    Visits ({visits.length})
                                </div>
                                <div className="space-y-1.5">
                                    {visits.map((v, i) => {
                                        const a = selectedAgents.find(ag => ag._id === v.agentId);
                                        const agentLabel = a ? a.name : (v.customAgentName || '—');
                                        return (
                                            <div key={i} className="text-xs text-gray-600 flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0">{i+1}</span>
                                                <span className="font-medium">{v.title}</span>
                                                <span className="text-gray-400">· {agentLabel}</span>
                                                <span className="ml-auto text-gray-400">{new Date(v.scheduledDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                                After creating this plan, you can create an <strong>advance claim</strong> to get pre-approved funds.
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                    <button onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
                        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
                        <ChevronLeft className="w-4 h-4" />
                        {step === 0 ? 'Cancel' : 'Back'}
                    </button>
                    {step < STEPS.length - 1 ? (
                        <button
                            onClick={() => setStep(s => s + 1)}
                            disabled={!canProceed()}
                            className="flex items-center gap-1 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={saving}
                            className="flex items-center gap-1.5 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {saving ? 'Creating...' : 'Create plan'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
