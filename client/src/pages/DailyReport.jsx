import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import MultiSelect from '../components/shared/MultiSelect';

const BDM_NAMES = [
    'Bikal Singh',
    'Dilip Siyag',
    'Sachin Shah',
    'Parth Harumalani',
    'Archana Vishwakarma',
    'Davidayal',
    'Tisha',
    'Palash Thakore',
    'Shubham Mahavar',
    'Archi Patel'
];

const defaultForm = {
    date: new Date().toISOString().slice(0, 10),
    bdmName: [],
    leaveToday: '',
    location: '',
    numberOfMeetings: ''
};

const DailyReport = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState(defaultForm);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    };

    const handleLeaveChange = (val) => {
        setErrors(prev => { const next = { ...prev }; delete next.leaveToday; return next; });
        setForm(prev => ({
            ...prev,
            leaveToday: val,
            ...(val === 'Yes' ? { location: '', numberOfMeetings: '' } : {})
        }));
    };

    const validate = () => {
        const errs = {};
        if (!form.bdmName.length) errs.bdmName = 'Please select at least one BDM Name.';
        if (!form.leaveToday) errs.leaveToday = 'Please select Leave Today status.';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            await api.post('/daily-report', {
                ...form,
                bdmName: form.bdmName.join(', '),
                bdmNames: form.bdmName,
                numberOfMeetings: form.leaveToday === 'Yes' ? 0 : (Number(form.numberOfMeetings) || 0)
            });
            setSubmitted(true);
        } catch (err) {
            alert(err.response?.data?.message || 'Error submitting report. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const isOnLeave = form.leaveToday === 'Yes';

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 page-enter">
                <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-brand-green" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Submitted Successfully!</h2>
                    <p className="text-slate-500">Your Daily Report has been recorded.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setForm(defaultForm); setSubmitted(false); setErrors({}); }}
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
        <div className="space-y-5 page-enter max-w-xl mx-auto">
            <div>
                <h1 className="page-title flex items-center gap-2">
                    <FileText className="w-6 h-6 text-brand-blue" />
                    Daily Business Development Report
                </h1>
                <p className="page-subtitle">Daily tracking of demos, new accounts, and revenue.</p>
            </div>

            <form onSubmit={handleSubmit} className="card space-y-5">

                {/* 1. Date */}
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

                {/* 2. BDM Name (multi-select) */}
                <div>
                    <label className="label">BDM Name <span className="text-red-500">*</span></label>
                    <MultiSelect
                        options={BDM_NAMES}
                        value={form.bdmName}
                        onChange={v => set('bdmName', v)}
                        placeholder="Select BDM(s)..."
                    />
                    {errors.bdmName && <p className="text-red-500 text-xs mt-1">{errors.bdmName}</p>}
                </div>

                {/* 3. Leave Today */}
                <div>
                    <label className="label">Leave Today? <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                        {['Yes', 'No', 'On Travel'].map(opt => (
                            <label
                                key={opt}
                                className={`flex items-center justify-center px-3 py-2.5 rounded-xl border-2 cursor-pointer font-semibold text-sm transition-all ${
                                    form.leaveToday === opt
                                        ? opt === 'Yes'
                                            ? 'border-brand-green bg-brand-green/5 text-brand-green'
                                            : opt === 'No'
                                                ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
                                                : 'border-brand-orange bg-brand-orange/5 text-brand-orange'
                                        : errors.leaveToday
                                            ? 'border-red-300 text-slate-500'
                                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="leaveToday"
                                    value={opt}
                                    checked={form.leaveToday === opt}
                                    onChange={() => handleLeaveChange(opt)}
                                    className="sr-only"
                                />
                                {opt}
                            </label>
                        ))}
                    </div>
                    {errors.leaveToday && <p className="text-red-500 text-xs mt-1">{errors.leaveToday}</p>}
                </div>

                {/* On leave notice — form ends */}
                {isOnLeave && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                        You're marked as on leave — no further details needed. Submit when ready.
                    </div>
                )}

                {/* Location & Meetings — hidden when on leave */}
                {!isOnLeave && (
                    <>
                        <div>
                            <label className="label">Location</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g. Ahmedabad, Gujarat"
                                value={form.location}
                                onChange={e => set('location', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="label">Number of Meetings</label>
                            <input
                                type="number"
                                min="0"
                                className="input-field"
                                placeholder="0"
                                value={form.numberOfMeetings}
                                onChange={e => set('numberOfMeetings', e.target.value)}
                            />
                        </div>
                    </>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
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

export default DailyReport;
