import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList, Calendar, User, MapPin, BarChart3,
    PlusCircle, Trash2, Loader2, CheckCircle, Star
} from 'lucide-react';
import api from '../utils/api';
import MultiSelect from '../components/shared/MultiSelect';

const REPRESENTATIVES = ['Davidayal', 'Archana', 'Parth', 'Bikal', 'Dilip', 'Sachin'];

const StarRating = ({ value, onChange, hasError }) => (
    <div className="flex gap-1.5 mt-1">
        {[1, 2, 3, 4, 5].map(n => (
            <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={`p-1 transition-all ${n <= value ? 'text-amber-400' : hasError ? 'text-red-200 hover:text-amber-300' : 'text-slate-200 hover:text-amber-300'}`}
            >
                <Star className={`w-7 h-7 ${n <= value ? 'fill-amber-400' : ''}`} />
            </button>
        ))}
        {value > 0 && (
            <span className="ml-2 text-sm font-bold text-slate-600 self-center">{value}/5</span>
        )}
    </div>
);

const SectionCard = ({ icon: Icon, title, children }) => (
    <div className="card space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="p-1.5 rounded-lg bg-brand-blue/10">
                <Icon className="w-4 h-4 text-brand-blue" />
            </span>
            <h3 className="font-bold text-slate-700 text-sm">{title}</h3>
        </div>
        {children}
    </div>
);

const emptyPartner = () => ({ name: '', status: [], city: '', gmbLink: '', interestedIn: [] });

const defaultForm = {
    date: new Date().toISOString().slice(0, 10),
    representativeName: [],
    leaveToday: '',
    todaysLocation: '',
    workMode: [],
    workModeOther: '',
    visitsPlanned: '',
    visitsGateCrash: '',
    visitsNew: '',
    visitsNewFollowUp: '',
    visitsExisting: '',
    partners: [emptyPartner()],
    newAcademyProspects: '',
    newAdmissionProspects: '',
    salesEffectiveness: 0,
    revenueNew: '',
    revenueExisting: '',
    obstacles: '',
    adminTimeSpent: '',
    visitsBookedToday: '',
    visitsPlannedTomorrow: '',
    demosBooked: '',
    confidenceLevel: 0,
    keyFocusTomorrow: ''
};

const PostFieldDay = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState(defaultForm);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState({});
    const [partnersEnabled, setPartnersEnabled] = useState(true);

    const set = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    };

    const setPartner = (idx, field, value) => {
        setForm(prev => {
            const partners = prev.partners.map((p, i) => i === idx ? { ...p, [field]: value } : p);
            return { ...prev, partners };
        });
    };

    const addPartner = () => setForm(prev => ({ ...prev, partners: [...prev.partners, emptyPartner()] }));

    const removePartner = (idx) => setForm(prev => ({
        ...prev,
        partners: prev.partners.filter((_, i) => i !== idx)
    }));

    const isOnLeave = form.leaveToday === 'yes';

    const visitTotal = (Number(form.visitsPlanned) || 0) + (Number(form.visitsGateCrash) || 0);
    const clientVisitTotal = (Number(form.visitsNew) || 0) + (Number(form.visitsNewFollowUp) || 0) + (Number(form.visitsExisting) || 0);

    const validate = () => {
        const errs = {};
        if (!form.representativeName.length) errs.representativeName = 'Please select Representative Name(s).';
        if (form.leaveToday === '') errs.leaveToday = 'Please select Leave Today option.';
        if (!isOnLeave) {
            if (!form.workMode.length) errs.workMode = 'Please select your work mode.';
            if (form.workMode.includes('Other') && !form.workModeOther.trim()) errs.workModeOther = 'Please specify your work mode.';
            if (!form.salesEffectiveness) errs.salesEffectiveness = 'Please rate your sales effectiveness.';
            if (!form.confidenceLevel) errs.confidenceLevel = 'Please rate your confidence level.';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            const onLeave = isOnLeave;
            const payload = {
                ...form,
                representativeName: form.representativeName.join(', '),
                representativeNames: form.representativeName,
                leaveToday: onLeave,
                workMode: onLeave ? '' : (form.workMode[0] || ''),
                workModes: onLeave ? [] : form.workMode,
                visitsPlanned:       onLeave ? 0 : (Number(form.visitsPlanned) || 0),
                visitsGateCrash:     onLeave ? 0 : (Number(form.visitsGateCrash) || 0),
                visitsNew:           onLeave ? 0 : (Number(form.visitsNew) || 0),
                visitsNewFollowUp:   onLeave ? 0 : (Number(form.visitsNewFollowUp) || 0),
                visitsExisting:      onLeave ? 0 : (Number(form.visitsExisting) || 0),
                revenueNew:          onLeave ? 0 : (Number(form.revenueNew) || 0),
                revenueExisting:     onLeave ? 0 : (Number(form.revenueExisting) || 0),
                visitsBookedToday:   onLeave ? 0 : (Number(form.visitsBookedToday) || 0),
                demosBooked:         onLeave ? 0 : (Number(form.demosBooked) || 0),
                partners: (onLeave || !partnersEnabled)
                    ? []
                    : form.partners
                        .filter(p => p.name.trim())
                        .map(p => ({
                            ...p,
                            status: Array.isArray(p.status) ? (p.status[0] || '') : p.status,
                            statuses: Array.isArray(p.status) ? p.status : (p.status ? [p.status] : []),
                            interestedIn: Array.isArray(p.interestedIn) ? (p.interestedIn[0] || '') : p.interestedIn,
                            interestedInList: Array.isArray(p.interestedIn) ? p.interestedIn : (p.interestedIn ? [p.interestedIn] : [])
                        }))
            };
            await api.post('/post-field-day', payload);
            setSubmitted(true);
        } catch (err) {
            alert(err.response?.data?.message || 'Error submitting form. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 page-enter">
                <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-brand-green" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Submitted Successfully!</h2>
                    <p className="text-slate-500">Your Post Field Day report has been recorded.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setForm(defaultForm); setSubmitted(false); setErrors({}); setPartnersEnabled(true); }}
                        className="btn-outline px-6 py-2.5"
                    >
                        Submit Another
                    </button>
                    <button onClick={() => navigate('/')} className="btn-primary px-6 py-2.5">
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 page-enter max-w-3xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="page-title flex items-center gap-2">
                    <ClipboardList className="w-6 h-6 text-brand-blue" />
                    End-of-Day Field Sales Report
                </h1>
                <p className="page-subtitle">Daily field activity report</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

                {/* Section 1 — Day Info */}
                <SectionCard icon={Calendar} title="Day Information">
                    <div>
                        <label className="label">Date <span className="text-red-500">*</span></label>
                        <input
                            type="date"
                            className="input-field"
                            value={form.date}
                            onChange={e => set('date', e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="label">Representative Name <span className="text-red-500">*</span></label>
                        <MultiSelect
                            options={REPRESENTATIVES}
                            value={form.representativeName}
                            onChange={v => set('representativeName', v)}
                            placeholder="Select representative(s)..."
                        />
                        {errors.representativeName && <p className="text-red-500 text-xs mt-1">{errors.representativeName}</p>}
                    </div>

                    {/* Leave today */}
                    <div>
                        <label className="label">Leave Today? <span className="text-red-500">*</span></label>
                        <div className="flex gap-3 mt-1">
                            {['yes', 'no'].map(opt => (
                                <label key={opt} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer font-bold text-sm transition-all ${
                                    form.leaveToday === opt
                                        ? opt === 'yes' ? 'border-brand-green bg-brand-green/5 text-brand-green' : 'border-slate-400 bg-slate-50 text-slate-700'
                                        : errors.leaveToday ? 'border-red-300 text-slate-500' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}>
                                    <input
                                        type="radio"
                                        name="leaveToday"
                                        value={opt}
                                        checked={form.leaveToday === opt}
                                        onChange={() => set('leaveToday', opt)}
                                        className="sr-only"
                                    />
                                    {opt === 'yes' ? 'Yes' : 'No'}
                                </label>
                            ))}
                        </div>
                        {errors.leaveToday && <p className="text-red-500 text-xs mt-1">{errors.leaveToday}</p>}
                    </div>

                    {/* On leave: form ends */}
                    {isOnLeave && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                            You're marked as on leave — no further details required. Submit when ready.
                        </div>
                    )}

                    {/* Location & work mode — hidden when on leave */}
                    {!isOnLeave && (
                        <>
                            <div>
                                <label className="label">Today's Location (City, State)</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="e.g. Ahmedabad, Gujarat"
                                    value={form.todaysLocation}
                                    onChange={e => set('todaysLocation', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="label">Are you on field today or working from home? <span className="text-red-500">*</span></label>
                                <MultiSelect
                                    options={['On field', 'Work from home', 'Other']}
                                    value={form.workMode}
                                    onChange={v => set('workMode', v)}
                                    placeholder="Select work mode..."
                                />
                                {errors.workMode && <p className="text-red-500 text-xs mt-1">{errors.workMode}</p>}
                                {form.workMode.includes('Other') && (
                                    <>
                                        <input
                                            type="text"
                                            className={`input-field mt-2 ${errors.workModeOther ? 'border-red-400' : ''}`}
                                            placeholder="Please specify..."
                                            value={form.workModeOther}
                                            onChange={e => set('workModeOther', e.target.value)}
                                        />
                                        {errors.workModeOther && <p className="text-red-500 text-xs mt-1">{errors.workModeOther}</p>}
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </SectionCard>

                {/* All other sections — only when NOT on leave (form ends if on leave) */}
                {!isOnLeave && (
                    <>
                        {/* Section 2 — Visit Counts */}
                        <SectionCard icon={BarChart3} title="Visit Statistics">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {[
                                    { field: 'visitsPlanned',     label: 'Visits Completed (Planned)' },
                                    { field: 'visitsGateCrash',   label: 'Visits Completed (Gate Crash)' },
                                    { field: 'visitsNew',         label: 'Client Visits — New' },
                                    { field: 'visitsNewFollowUp', label: 'Client Visits — New (Follow Up)' },
                                    { field: 'visitsExisting',    label: 'Client Visits — Existing' },
                                    { field: 'visitsBookedToday', label: 'Visits Booked Today' },
                                    { field: 'demosBooked',       label: 'Demos Booked (Academy)' },
                                ].map(({ field, label }) => (
                                    <div key={field}>
                                        <label className="label">{label}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="input-field"
                                            placeholder="0"
                                            value={form[field]}
                                            onChange={e => set(field, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                            {(visitTotal > 0 || clientVisitTotal > 0) && (
                                <div className="flex gap-3 mt-1">
                                    {visitTotal > 0 && (
                                        <div className="flex-1 bg-brand-blue/5 border border-brand-blue/20 rounded-lg px-3 py-2 text-center">
                                            <div className="text-xs text-slate-500">Total Completed</div>
                                            <div className="text-lg font-bold text-brand-blue">{visitTotal}</div>
                                        </div>
                                    )}
                                    {clientVisitTotal > 0 && (
                                        <div className="flex-1 bg-brand-green/5 border border-brand-green/20 rounded-lg px-3 py-2 text-center">
                                            <div className="text-xs text-slate-500">Total Client Visits</div>
                                            <div className="text-lg font-bold text-brand-green">{clientVisitTotal}</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </SectionCard>

                        {/* Section 3 — Partners Met */}
                        <SectionCard icon={User} title="Partners Met Today">
                            <div className="flex items-center gap-3 -mt-2">
                                <p className="text-xs text-slate-400 flex-1">Name, Status, City, GMB Page Link, and Interest of each partner</p>
                                <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none whitespace-nowrap">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded accent-brand-blue"
                                        checked={!partnersEnabled}
                                        onChange={e => setPartnersEnabled(!e.target.checked)}
                                    />
                                    No partners today
                                </label>
                            </div>
                            {partnersEnabled ? (
                                <div className="space-y-3">
                                    {form.partners.map((p, idx) => (
                                        <div key={idx} className="bg-slate-50 rounded-xl p-3 space-y-3 relative">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Partner {idx + 1}</span>
                                                {form.partners.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removePartner(idx)}
                                                        className="p-1 text-red-400 hover:text-red-600 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="label">Name</label>
                                                    <input
                                                        type="text"
                                                        className="input-field"
                                                        placeholder="Partner name"
                                                        value={p.name}
                                                        onChange={e => setPartner(idx, 'name', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="label">City</label>
                                                    <input
                                                        type="text"
                                                        className="input-field"
                                                        placeholder="City"
                                                        value={p.city}
                                                        onChange={e => setPartner(idx, 'city', e.target.value)}
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="label">Status</label>
                                                    <MultiSelect
                                                        options={['New', 'Existing']}
                                                        value={p.status}
                                                        onChange={v => setPartner(idx, 'status', v)}
                                                        placeholder="Select status..."
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="label">GMB Page Link</label>
                                                    <input
                                                        type="url"
                                                        className="input-field"
                                                        placeholder="https://maps.google.com/..."
                                                        value={p.gmbLink}
                                                        onChange={e => setPartner(idx, 'gmbLink', e.target.value)}
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="label">Interested In</label>
                                                    <MultiSelect
                                                        options={['Admission', 'Academy', 'Both']}
                                                        value={p.interestedIn}
                                                        onChange={v => setPartner(idx, 'interestedIn', v)}
                                                        placeholder="Select interest..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addPartner}
                                        className="flex items-center gap-2 text-brand-blue text-sm font-bold hover:underline mt-1"
                                    >
                                        <PlusCircle className="w-4 h-4" />
                                        Add Partner
                                    </button>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">No partners recorded for today.</p>
                            )}
                        </SectionCard>

                        {/* Section 4 — Prospects */}
                        <SectionCard icon={User} title="Prospects Met">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Name of New Academy Prospects Met</label>
                                    <textarea
                                        className="input-field resize-none"
                                        rows={3}
                                        placeholder="Enter names..."
                                        value={form.newAcademyProspects}
                                        onChange={e => set('newAcademyProspects', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="label">Name of New Admission Prospects Met</label>
                                    <textarea
                                        className="input-field resize-none"
                                        rows={3}
                                        placeholder="Enter names..."
                                        value={form.newAdmissionProspects}
                                        onChange={e => set('newAdmissionProspects', e.target.value)}
                                    />
                                </div>
                            </div>
                        </SectionCard>

                        {/* Section 5 — Performance */}
                        <SectionCard icon={BarChart3} title="Performance & Revenue">
                            <div>
                                <label className="label">Overall Effectiveness of Today's Sales Calls <span className="text-red-500">*</span></label>
                                <StarRating
                                    value={form.salesEffectiveness}
                                    onChange={v => set('salesEffectiveness', v)}
                                    hasError={!!errors.salesEffectiveness}
                                />
                                {errors.salesEffectiveness && <p className="text-red-500 text-xs mt-1">{errors.salesEffectiveness}</p>}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="label">Revenue Closed Today — New Accounts (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="input-field"
                                        placeholder="0"
                                        value={form.revenueNew}
                                        onChange={e => set('revenueNew', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="label">Revenue Closed Today — Existing Accounts (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="input-field"
                                        placeholder="0"
                                        value={form.revenueExisting}
                                        onChange={e => set('revenueExisting', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Level of Confidence in Meeting Monthly Target <span className="text-red-500">*</span></label>
                                <StarRating
                                    value={form.confidenceLevel}
                                    onChange={v => set('confidenceLevel', v)}
                                    hasError={!!errors.confidenceLevel}
                                />
                                {errors.confidenceLevel && <p className="text-red-500 text-xs mt-1">{errors.confidenceLevel}</p>}
                            </div>
                        </SectionCard>

                        {/* Section 6 — Planning (only when not on leave) */}
                        <SectionCard icon={MapPin} title="Challenges & Tomorrow's Plan">
                            <div>
                                <label className="label">Any Significant Obstacles or Challenges Encountered?</label>
                                <textarea
                                    className="input-field resize-none"
                                    rows={3}
                                    placeholder="Describe any obstacles..."
                                    value={form.obstacles}
                                    onChange={e => set('obstacles', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="label">Time Spent on Administrative Tasks (e.g., reporting, travel)</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="e.g. 2 hours on reporting, 1.5 hours travel"
                                    value={form.adminTimeSpent}
                                    onChange={e => set('adminTimeSpent', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="label">Visits Planned for Tomorrow (City and number of visits)</label>
                                <textarea
                                    className="input-field resize-none"
                                    rows={2}
                                    placeholder="e.g. Surat - 3 visits, Vadodara - 2 visits"
                                    value={form.visitsPlannedTomorrow}
                                    onChange={e => set('visitsPlannedTomorrow', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="label">Key Focus / Goal for Tomorrow</label>
                                <textarea
                                    className="input-field resize-none"
                                    rows={3}
                                    placeholder="What's your key focus for tomorrow?"
                                    value={form.keyFocusTomorrow}
                                    onChange={e => set('keyFocusTomorrow', e.target.value)}
                                />
                            </div>
                        </SectionCard>
                    </>
                )}

                {/* Submit */}
                <div className="flex gap-3 pb-6">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="flex-1 btn-outline py-3"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                    >
                        {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                            : 'Submit Report'
                        }
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PostFieldDay;
