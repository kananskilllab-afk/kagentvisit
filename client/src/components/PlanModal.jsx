import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, Plus, Trash2, Loader2, MapPin, Users, Calendar, Check, Search } from 'lucide-react';
import CityAutocomplete from './shared/CityAutocomplete';
import AgentHistoryCard from './AgentHistoryCard';
import { getCityTier } from '../utils/indianCities';

const API = import.meta.env.VITE_API_URL || '/api';

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

function addHours(date, hours) {
    const d = new Date(date);
    d.setHours(d.getHours() + hours);
    return d;
}

function formatLocation(city, state) {
    return [city, state].filter(Boolean).join(', ');
}

function normalizeCities(cities) {
    const seen = new Set();
    return (cities || []).filter(c => c?.city).reduce((acc, c) => {
        const item = {
            city: c.city.trim(),
            state: (c.state || '').trim(),
            cityTier: c.cityTier || getCityTier(c.city) || 'na',
        };
        const key = `${item.city.toLowerCase()}|${item.state.toLowerCase()}`;
        if (!seen.has(key)) {
            seen.add(key);
            acc.push(item);
        }
        return acc;
    }, []);
}

export default function PlanModal({ defaultDate, editPlan = null, onClose, onSaved }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [agentSearch, setAgentSearch] = useState('');
    const [agentResults, setAgentResults] = useState([]);
    const [searchingAgents, setSearchingAgents] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const [cityDraft, setCityDraft] = useState({ city: '', state: '' });
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
    const [planCities, setPlanCities] = useState(() => normalizeCities(
        editPlan?.cities?.length
            ? editPlan.cities
            : (editPlan?.city ? [{ city: editPlan.city, state: editPlan.state, cityTier: editPlan.cityTier }] : [])
    ));

    // Step 2 — Agents: DB agents have { _id, name }, custom-only ones have { _id: null, name }
    const [selectedAgents, setSelectedAgents] = useState(
        editPlan?.agents?.map(a => ({ _id: a._id || a, name: a.name || '' })) || []
    );
    const [customAgentNames, setCustomAgentNames] = useState(
        editPlan?.customAgentNames || []
    );
    const [customInput, setCustomInput] = useState('');

    // Step 3 — Visits
    const [visits, setVisits] = useState([]);

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

    const activePlanCities = () => normalizeCities(planCities.length
        ? planCities
        : (details.city ? [{ city: details.city, state: details.state, cityTier: details.cityTier }] : []));

    const locationForAssignment = (assignment, index = 0) => {
        if (assignment?.agent?.city) {
            return formatLocation(assignment.agent.city, assignment.agent.state || details.state);
        }
        const cities = activePlanCities();
        const city = cities[index % Math.max(cities.length, 1)];
        return city ? formatLocation(city.city, city.state || details.state) : formatLocation(details.city, details.state);
    };

    const visitForAssignment = (assignment, index) => {
        const name = assignment.agent?.name || assignment.customAgentName;
        return {
            title: `${name} visit`,
            agentId: assignment.agent?._id || '',
            customAgentName: assignment.customAgentName || '',
            scheduledDate: toInputDatetime(addHours(defaultStart, index)),
            reminderOffset: 60,
            location: locationForAssignment(assignment, index),
            notes: '',
        };
    };

    const autoAddVisit = (assignment) => {
        setVisits(prev => {
            const nextVisit = visitForAssignment(assignment, prev.length);
            const emptyIndex = prev.findIndex(v => !v.agentId && !v.customAgentName && !v.title);
            if (emptyIndex >= 0) {
                return prev.map((v, idx) => idx === emptyIndex ? { ...v, ...nextVisit } : v);
            }
            return [...prev, nextVisit];
        });
    };

    const addPlanCity = (city, state) => {
        const cleanCity = (city || '').trim();
        const cleanState = (state || '').trim();
        if (!cleanCity || !cleanState) return;
        const baseState = details.state || cleanState;
        if (baseState && cleanState.toLowerCase() !== baseState.toLowerCase()) {
            setError(`Select cities from ${baseState} only for this plan.`);
            return;
        }
        const nextCity = { city: cleanCity, state: cleanState, cityTier: getCityTier(cleanCity) || 'na' };
        setPlanCities(prev => normalizeCities([...prev, nextCity]));
        setDetails(d => ({
            ...d,
            state: baseState,
            planType: 'multi_city_same_state',
            city: d.city || cleanCity,
            cityTier: d.city ? d.cityTier : nextCity.cityTier,
        }));
        setCityDraft({ city: '', state: '' });
        setError('');
    };

    const removePlanCity = (city, state) => {
        setPlanCities(prev => {
            const next = prev.filter(c => c.city !== city || c.state !== state);
            if (next.length <= 1) {
                setDetails(d => ({ ...d, planType: d.planType === 'multi_city_same_state' ? 'multi_same_city' : d.planType }));
            }
            return next;
        });
    };

    const addAgent = (agent) => {
        if (selectedAgents.some(a => a._id === agent._id)) return;
        setSelectedAgents(prev => [...prev, agent]);
        if (selectedAgents.length + customAgentNames.length >= 1 && details.planType === 'single') {
            setDetails(d => ({ ...d, planType: activePlanCities().length > 1 ? 'multi_city_same_state' : 'multi_same_city' }));
        }
        autoAddVisit({ agent });
        setAgentSearch('');
        setAgentResults([]);
        setSearchFocused(false);
    };

    const removeAgent = (id) => {
        setSelectedAgents(prev => prev.filter(a => a._id !== id));
        setVisits(prev => prev.filter(v => v.agentId !== id));
    };

    const addCustomName = () => {
        const name = customInput.trim();
        if (!name) return;
        if (customAgentNames.includes(name)) { setCustomInput(''); return; }
        setCustomAgentNames(prev => [...prev, name]);
        if (selectedAgents.length + customAgentNames.length >= 1 && details.planType === 'single') {
            setDetails(d => ({ ...d, planType: activePlanCities().length > 1 ? 'multi_city_same_state' : 'multi_same_city' }));
        }
        autoAddVisit({ customAgentName: name });
        setCustomInput('');
        setAgentSearch('');
        setAgentResults([]);
    };

    const removeCustomName = (name) => {
        setCustomAgentNames(prev => prev.filter(n => n !== name));
        setVisits(prev => prev.filter(v => v.customAgentName !== name));
    };

    const addVisit = () => {
        const firstAgent = selectedAgents[0]?._id || '';
        const firstCustom = !firstAgent && customAgentNames[0] ? customAgentNames[0] : '';
        const agent = selectedAgents[0] || null;
        const label = agent?.name || firstCustom || '';
        setVisits(prev => [...prev, {
            title: label ? `${label} visit` : '',
            agentId: firstAgent,
            customAgentName: firstCustom,
            scheduledDate: toInputDatetime(addHours(defaultStart, prev.length)),
            reminderOffset: 60,
            location: locationForAssignment(agent ? { agent } : { customAgentName: firstCustom }, prev.length),
            notes: ''
        }]);
    };

    const removeVisit = (i) => setVisits(prev => prev.filter((_, idx) => idx !== i));

    const updateVisit = (i, key, val) => setVisits(prev => prev.map((v, idx) => idx === i ? { ...v, [key]: val } : v));
    const updateVisitFields = (i, fields) => setVisits(prev => prev.map((v, idx) => idx === i ? { ...v, ...fields } : v));

    // Validation per step
    const canSubmitPlan = () => {
        const cities = activePlanCities();
        if (details.planType === 'multi_city_same_state' && cities.length < 2) return false;
        return details.title && details.city && details.plannedStartAt && details.plannedEndAt &&
            (selectedAgents.length > 0 || customAgentNames.length > 0) &&
            visits.length > 0 && visits.every(v =>
            v.title && v.scheduledDate && (v.agentId || v.customAgentName) && v.location
        );
    };

    const handleSubmit = async () => {
        setSaving(true); setError('');
        try {
            const cities = activePlanCities();
            const inferredPlanType = cities.length > 1
                ? 'multi_city_same_state'
                : (visits.length > 1 ? 'multi_same_city' : details.planType);
            // 1. Create / update the plan
            const planPayload = {
                ...details,
                planType: inferredPlanType,
                cities,
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
            <div className="bg-white rounded-t-lg sm:rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-meridian-border">
                {/* Header */}
                <div className="px-5 sm:px-6 py-4 border-b border-meridian-border">
                    <div className="flex items-center justify-between gap-4">
                    <h2 className="font-black text-meridian-text">{editPlan ? 'Edit Visit Plan' : 'Create Visit Plan'}</h2>
                    <button onClick={onClose} className="text-meridian-sub hover:text-meridian-text p-1 shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2">
                        {['Plan details', 'Agents', 'Visits', 'Review'].map((label, index) => (
                            <div
                                key={label}
                                className={`rounded-lg border px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest ${
                                    index === 0
                                        ? 'border-brand-gold bg-amber-50 text-brand-gold'
                                        : 'border-meridian-navy/20 bg-meridian-navy text-white'
                                }`}
                            >
                                {label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                    {/* ── Step 0: Plan details ── */}
                    <section className="rounded-lg border border-meridian-border bg-meridian-bg p-4 space-y-4">
                        <h3 className="text-sm font-black text-meridian-text">Plan details</h3>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Plan title *</label>
                                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Mumbai B2B Visit — April 2026"
                                    value={details.title} onChange={e => setDetails(d => ({ ...d, title: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
                                    <CityAutocomplete
                                        city={details.city}
                                        state={details.state}
                                        placeholder="Type to search city"
                                        onSelect={(city, state) => {
                                            const tier = city ? getCityTier(city) : null;
                                            const nextCity = { city, state: state || details.state, cityTier: tier || details.cityTier };
                                            setDetails(d => ({ ...d, city, state: state || d.state, ...(tier ? { cityTier: tier } : {}) }));
                                            if (!city) setPlanCities([]);
                                            if (city && state && tier) setPlanCities(normalizeCities([nextCity]));
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                        <option value="multi_city_same_state">Multiple cities (same state)</option>
                                    </select>
                                </div>
                            </div>
                            {details.planType === 'multi_city_same_state' && (
                                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-blue-700 mb-1">Add cities in {details.state || 'the same state'}</label>
                                        <CityAutocomplete
                                            city={cityDraft.city}
                                            state={cityDraft.state}
                                            placeholder="Search another city"
                                            onSelect={(city, state) => {
                                                setCityDraft({ city, state });
                                                if (city && state) addPlanCity(city, state);
                                            }}
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {activePlanCities().map(c => (
                                            <span key={`${c.city}-${c.state}`} className="inline-flex items-center gap-1 text-xs bg-white text-blue-700 border border-blue-200 rounded-full px-2.5 py-1">
                                                {formatLocation(c.city, c.state)}
                                                {activePlanCities().length > 1 && (
                                                    <button type="button" onClick={() => removePlanCity(c.city, c.state)} className="hover:text-red-600">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    </section>

                    {/* ── Step 1: Agents ── */}
                    <section className="rounded-lg border border-meridian-border bg-white p-4 space-y-4">
                        <h3 className="text-sm font-black text-meridian-text">Assign agents</h3>
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
                                        <div key={a._id} className="space-y-2 rounded-xl border border-gray-200 bg-blue-50/40 p-2.5">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-800">{a.name}</div>
                                                    {a.city && <div className="text-xs text-gray-500">{a.city}</div>}
                                                </div>
                                                <button type="button" onClick={() => removeAgent(a._id)} className="text-gray-400 hover:text-red-500">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <AgentHistoryCard agentId={a._id} agentName={a.name} compact />
                                        </div>
                                    ))}
                                </div>
                            )}
                    </section>

                    {/* ── Step 2: Visits ── */}
                    <section className="rounded-lg border border-meridian-border bg-white p-4 space-y-4">
                        <h3 className="text-sm font-black text-meridian-text">Visit schedule</h3>
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-gray-500">Agent / Company *</label>
                                            <select
                                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                value={v.agentId || (v.customAgentName ? `custom:${v.customAgentName}` : '')}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val.startsWith('custom:')) {
                                                        const customAgentName = val.replace('custom:', '');
                                                        updateVisitFields(i, {
                                                            agentId: '',
                                                            customAgentName,
                                                            title: v.title || `${customAgentName} visit`,
                                                            location: v.location || locationForAssignment({ customAgentName }, i),
                                                        });
                                                    } else {
                                                        const agent = selectedAgents.find(a => a._id === val);
                                                        updateVisitFields(i, {
                                                            agentId: val,
                                                            customAgentName: '',
                                                            title: v.title || (agent ? `${agent.name} visit` : ''),
                                                            location: v.location || locationForAssignment({ agent }, i),
                                                        });
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
                                        {activePlanCities().length > 1 ? (
                                            <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                value={v.location}
                                                onChange={e => updateVisit(i, 'location', e.target.value)}>
                                                {!activePlanCities().some(c => formatLocation(c.city, c.state) === v.location) && v.location && (
                                                    <option value={v.location}>{v.location}</option>
                                                )}
                                                {activePlanCities().map(c => {
                                                    const loc = formatLocation(c.city, c.state);
                                                    return <option key={loc} value={loc}>{loc}</option>;
                                                })}
                                            </select>
                                        ) : (
                                            <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                placeholder={`${details.city || 'Location'}`}
                                                value={v.location} onChange={e => updateVisit(i, 'location', e.target.value)} />
                                        )}
                                    </div>
                                </div>
                            ))}

                            {(details.planType === 'multi_same_city' || details.planType === 'multi_city_same_state' || visits.length === 0) && (
                                <button onClick={addVisit}
                                    className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                                    <Plus className="w-4 h-4" /> Add visit
                                </button>
                            )}
                    </section>

                    {/* ── Step 3: Review ── */}
                    <section className="rounded-lg border border-meridian-border bg-meridian-bg p-4 space-y-4 lg:col-span-2">
                        <h3 className="text-sm font-black text-meridian-text">Review</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    {details.city}{details.state ? `, ${details.state}` : ''} ·
                                    <span className="text-gray-500 font-normal">{details.planType === 'multi_city_same_state' ? 'Multi-city' : details.planType === 'multi_same_city' ? 'Multi-visit' : 'Single visit'}</span>
                                </div>
                                {details.planType === 'multi_city_same_state' && activePlanCities().length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {activePlanCities().map(c => (
                                            <span key={`${c.city}-${c.state}`} className="text-[10px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
                                                {formatLocation(c.city, c.state)}
                                            </span>
                                        ))}
                                    </div>
                                )}
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
                        </div>
                    </section>

                    {error && (
                        <div className="lg:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-meridian-border">
                    <button onClick={onClose}
                        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
                        <ChevronLeft className="w-4 h-4" />
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !canSubmitPlan()}
                        className="btn-primary bg-brand-green hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {saving ? 'Creating...' : (editPlan ? 'Update plan' : 'Create plan')}
                    </button>
                </div>
            </div>
        </div>
    );
}
