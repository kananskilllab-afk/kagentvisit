import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MessageSquare, Loader2, CheckCircle, User, Building2,
    Phone, BarChart3, TrendingUp, CalendarDays, AlertCircle
} from 'lucide-react';
import api from '../utils/api';

// ── Reusable field components ─────────────────────────────────────────────────

const Err = ({ msg }) => msg
    ? <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3 shrink-0" />{msg}</p>
    : null;

const Field = ({ id, label, required, error, children }) => (
    <div id={id ? `field-${id}` : undefined}>
        <label className="label">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {children}
        <Err msg={error} />
    </div>
);

const RadioGroup = ({ options, value, onChange, cols = 2, hasError }) => (
    <div className={`grid gap-2 mt-1`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
        {options.map(opt => (
            <label key={opt} className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 cursor-pointer text-sm font-semibold transition-all ${
                value === opt
                    ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
                    : hasError
                        ? 'border-red-200 text-slate-500 hover:border-red-300'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>
                <input type="radio" className="sr-only" checked={value === opt} onChange={() => onChange(opt)} />
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${value === opt ? 'border-brand-blue' : 'border-slate-300'}`}>
                    {value === opt && <span className="w-2 h-2 rounded-full bg-brand-blue" />}
                </span>
                {opt}
            </label>
        ))}
    </div>
);

const RadioWithOther = ({ options, value, otherValue, onChange, onOtherChange, cols = 2, hasError, otherError }) => (
    <div className="space-y-2">
        <RadioGroup options={options} value={value} onChange={onChange} cols={cols} hasError={hasError} />
        {value === 'Other' && (
            <>
                <input
                    type="text"
                    className={`input-field mt-1 ${otherError ? 'border-red-300' : ''}`}
                    placeholder="Please specify..."
                    value={otherValue}
                    onChange={e => onOtherChange(e.target.value)}
                />
                <Err msg={otherError} />
            </>
        )}
    </div>
);

const MultiCheck = ({ options, values, onChange, hasError }) => {
    const toggle = opt => onChange(values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt]);
    return (
        <div className="flex flex-wrap gap-2 mt-1">
            {options.map(opt => {
                const checked = values.includes(opt);
                return (
                    <label key={opt} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 cursor-pointer text-sm font-semibold transition-all ${
                        checked
                            ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
                            : hasError
                                ? 'border-red-200 text-slate-500 hover:border-red-300'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}>
                        <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(opt)} />
                        <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${checked ? 'border-brand-blue bg-brand-blue' : 'border-slate-300'}`}>
                            {checked && <svg viewBox="0 0 10 8" className="w-2 h-2 text-white fill-current"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                        {opt}
                    </label>
                );
            })}
        </div>
    );
};

const MultiCheckWithOther = ({ options, values, otherValue, onChange, onOtherChange, hasError, otherError }) => (
    <div className="space-y-2">
        <MultiCheck options={options} values={values} onChange={onChange} hasError={hasError} />
        {values.includes('Other') && (
            <>
                <input
                    type="text"
                    className={`input-field mt-1 ${otherError ? 'border-red-300' : ''}`}
                    placeholder="Please specify..."
                    value={otherValue}
                    onChange={e => onOtherChange(e.target.value)}
                />
                <Err msg={otherError} />
            </>
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

// ── Default state & validation ────────────────────────────────────────────────

const defaultForm = {
    demoBookedBy: '', demoConductedBy: '', demoDate: '', customerEmail: '', mediumOfMeeting: '',
    accountBusinessName: '', meetingType: '', meetingTypeOther: '', accountType: '', demoType: '',
    alreadyOnboarded: [], alreadyOnboardedOther: '', leadSource: '', leadSourceOther: '',
    primaryContactName: '', primaryContactDesignation: '', contactNumber: '', city: '', state: '',
    natureOfBusiness: '', natureOfBusinessOther: '', demoFocus: '', demoFocusOther: '',
    overallInterestLevel: '',
    productsDiscussed: [], productsDiscussedOther: '',
    interestedIn: [], interestedInOther: '',
    probabilityOfClosure: '', expectedDealSize: '',
    hasAcademy: '', premiseStatus: '', classroomCapacity: '', hasCounsellingCabins: '',
    studyAbroadStatus: '', countriesWorkWith: [], studentsAbroadPerYear: '',
    offersTestPrep: '', currentTestPrepFocus: [], currentTestPrepFocusOther: '',
    hasLMS: '', comfortableSellingOnline: '', primaryLeadSources: [],
    budgetReadiness: '', goLiveTimeline: '', keyConcerns: [],
    nextActionPlanned: '', meetingRecordingLink: '', nextFollowUpDate: '', expectedClosureDate: '',
    additionalNotes: ''
};

const validate = (form) => {
    const e = {};
    if (!form.demoConductedBy.trim())   e.demoConductedBy  = 'Required';
    if (!form.demoDate)                 e.demoDate         = 'Required';
    if (!form.customerEmail.trim()) {
        e.customerEmail = 'Required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail.trim())) {
        e.customerEmail = 'Enter a valid email address';
    }
    if (!form.mediumOfMeeting)          e.mediumOfMeeting  = 'Please select one';

    if (!form.accountBusinessName.trim()) e.accountBusinessName = 'Required';
    if (!form.meetingType)              e.meetingType      = 'Please select one';
    if (form.meetingType === 'Other' && !form.meetingTypeOther.trim()) e.meetingTypeOther = 'Please specify';
    if (!form.accountType)              e.accountType      = 'Please select one';
    if (!form.demoType)                 e.demoType         = 'Please select one';
    if (!form.leadSource)               e.leadSource       = 'Please select one';
    if (form.leadSource === 'Other' && !form.leadSourceOther.trim()) e.leadSourceOther = 'Please specify';

    if (!form.primaryContactName.trim()) e.primaryContactName = 'Required';
    if (!form.contactNumber.trim())      e.contactNumber      = 'Required';
    if (!form.city.trim())               e.city               = 'Required';
    if (!form.state.trim())              e.state              = 'Required';

    if (!form.natureOfBusiness)         e.natureOfBusiness = 'Please select one';
    if (form.natureOfBusiness === 'Other' && !form.natureOfBusinessOther.trim()) e.natureOfBusinessOther = 'Please specify';
    if (!form.demoFocus)                e.demoFocus        = 'Please select one';
    if (form.demoFocus === 'Other' && !form.demoFocusOther.trim()) e.demoFocusOther = 'Please specify';

    if (!form.overallInterestLevel)     e.overallInterestLevel = 'Please select one';
    if (!form.productsDiscussed.length) e.productsDiscussed    = 'Select at least one';
    if (form.productsDiscussed.includes('Other') && !form.productsDiscussedOther.trim()) e.productsDiscussedOther = 'Please specify';
    if (!form.interestedIn.length)      e.interestedIn         = 'Select at least one';
    if (form.interestedIn.includes('Other') && !form.interestedInOther.trim()) e.interestedInOther = 'Please specify';
    if (!form.probabilityOfClosure)     e.probabilityOfClosure = 'Please select one';

    if (!form.nextActionPlanned)        e.nextActionPlanned = 'Please select one';
    if (form.meetingRecordingLink && !/^https?:\/\/.+/.test(form.meetingRecordingLink.trim())) {
        e.meetingRecordingLink = 'Must start with http:// or https://';
    }
    return e;
};

// ── Main component ────────────────────────────────────────────────────────────

const PostDemoFeedback = () => {
    const navigate = useNavigate();
    const [form, setForm]       = useState(defaultForm);
    const [errors, setErrors]   = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted]   = useState(false);

    const set = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate(form);
        if (Object.keys(errs).length) {
            setErrors(errs);
            const firstKey = Object.keys(errs)[0];
            document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        setErrors({});
        setSubmitting(true);
        try {
            await api.post('/post-demo-feedback', {
                ...form,
                expectedDealSize:    form.expectedDealSize !== '' ? Number(form.expectedDealSize) : undefined,
                demoDate:            form.demoDate || undefined,
                nextFollowUpDate:    form.nextFollowUpDate || undefined,
                expectedClosureDate: form.expectedClosureDate || undefined,
            });
            setSubmitted(true);
        } catch (err) {
            alert(err.response?.data?.message || 'Error submitting form. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const errCount = Object.keys(errors).length;

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 page-enter">
                <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-brand-green" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Submitted Successfully!</h2>
                    <p className="text-slate-500">Post-Demo Feedback has been recorded.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => { setForm(defaultForm); setErrors({}); setSubmitted(false); }} className="btn-outline px-6 py-2.5">Submit Another</button>
                    <button onClick={() => navigate('/')} className="btn-primary px-6 py-2.5">Go to Dashboard</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 page-enter max-w-3xl mx-auto">
            <div>
                <h1 className="page-title flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-brand-blue" />
                    Post-Demo Feedback & Profile
                </h1>
                <p className="page-subtitle">Record demo outcomes and prospect profile details</p>
            </div>

            {/* Validation error banner */}
            {errCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {errCount} field{errCount > 1 ? 's' : ''} need{errCount === 1 ? 's' : ''} your attention — please scroll up to review.
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                {/* ── Section 1: Demo Information ── */}
                <SectionCard icon={CalendarDays} title="Demo Information">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Demo Booked By">
                            <input type="text" className="input-field" placeholder="Name" value={form.demoBookedBy} onChange={e => set('demoBookedBy', e.target.value)} />
                        </Field>
                        <Field id="demoConductedBy" label="Demo Conducted By" required error={errors.demoConductedBy}>
                            <input type="text" className={`input-field ${errors.demoConductedBy ? 'border-red-300' : ''}`} placeholder="Name" value={form.demoConductedBy} onChange={e => set('demoConductedBy', e.target.value)} />
                        </Field>
                        <Field id="demoDate" label="Demo Date" required error={errors.demoDate}>
                            <input type="date" className={`input-field ${errors.demoDate ? 'border-red-300' : ''}`} value={form.demoDate} onChange={e => set('demoDate', e.target.value)} />
                        </Field>
                        <Field id="customerEmail" label="Customer Email" required error={errors.customerEmail}>
                            <input type="email" className={`input-field ${errors.customerEmail ? 'border-red-300' : ''}`} placeholder="email@example.com" value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)} />
                        </Field>
                    </div>
                    <Field id="mediumOfMeeting" label="Medium of Meeting" required error={errors.mediumOfMeeting}>
                        <RadioGroup options={['In person', 'Online']} value={form.mediumOfMeeting} onChange={v => set('mediumOfMeeting', v)} cols={2} hasError={!!errors.mediumOfMeeting} />
                    </Field>
                </SectionCard>

                {/* ── Section 2: Account Information ── */}
                <SectionCard icon={Building2} title="Account Information">
                    <Field id="accountBusinessName" label="Account / Business Name" required error={errors.accountBusinessName}>
                        <input type="text" className={`input-field ${errors.accountBusinessName ? 'border-red-300' : ''}`} placeholder="Business name" value={form.accountBusinessName} onChange={e => set('accountBusinessName', e.target.value)} />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field id="meetingType" label="Meeting Type" required error={errors.meetingType}>
                            <RadioWithOther
                                options={['New Product Discussion', 'Training', 'Other']}
                                value={form.meetingType} otherValue={form.meetingTypeOther}
                                onChange={v => set('meetingType', v)} onOtherChange={v => set('meetingTypeOther', v)}
                                cols={1} hasError={!!errors.meetingType} otherError={errors.meetingTypeOther}
                            />
                        </Field>
                        <Field id="accountType" label="Account Type" required error={errors.accountType}>
                            <RadioGroup options={['Existing Application Partner', 'Existing Academy Partner', 'New Account']} value={form.accountType} onChange={v => set('accountType', v)} cols={1} hasError={!!errors.accountType} />
                        </Field>
                    </div>
                    <Field id="demoType" label="Demo Type" required error={errors.demoType}>
                        <RadioGroup options={['First Demo', 'Follow-up Demo', 'Training']} value={form.demoType} onChange={v => set('demoType', v)} cols={3} hasError={!!errors.demoType} />
                    </Field>
                    <Field label="Already onboarded for any other service with Kanan.co?">
                        <MultiCheckWithOther
                            options={['E Learning', 'Admission Platform', 'Books', 'None', 'Other']}
                            values={form.alreadyOnboarded} otherValue={form.alreadyOnboardedOther}
                            onChange={v => set('alreadyOnboarded', v)} onOtherChange={v => set('alreadyOnboardedOther', v)}
                        />
                    </Field>
                    <Field id="leadSource" label="Lead Source" required error={errors.leadSource}>
                        <RadioWithOther
                            options={['Agent Team Reference', 'Cold Call', 'Cold Whatsapp', 'Cold Email', 'Reference from existing partner', 'Website', 'SM Campaign (Paid)', 'Other']}
                            value={form.leadSource} otherValue={form.leadSourceOther}
                            onChange={v => set('leadSource', v)} onOtherChange={v => set('leadSourceOther', v)}
                            cols={2} hasError={!!errors.leadSource} otherError={errors.leadSourceOther}
                        />
                    </Field>
                </SectionCard>

                {/* ── Section 3: Contact Details ── */}
                <SectionCard icon={Phone} title="Contact Details">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field id="primaryContactName" label="Primary Contact Name" required error={errors.primaryContactName}>
                            <input type="text" className={`input-field ${errors.primaryContactName ? 'border-red-300' : ''}`} placeholder="Full name" value={form.primaryContactName} onChange={e => set('primaryContactName', e.target.value)} />
                        </Field>
                        <Field label="Primary Contact Designation">
                            <input type="text" className="input-field" placeholder="Designation" value={form.primaryContactDesignation} onChange={e => set('primaryContactDesignation', e.target.value)} />
                        </Field>
                        <Field id="contactNumber" label="Contact Number" required error={errors.contactNumber}>
                            <input type="tel" className={`input-field ${errors.contactNumber ? 'border-red-300' : ''}`} placeholder="+91 XXXXX XXXXX" value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} />
                        </Field>
                        <Field id="city" label="City" required error={errors.city}>
                            <input type="text" className={`input-field ${errors.city ? 'border-red-300' : ''}`} placeholder="City" value={form.city} onChange={e => set('city', e.target.value)} />
                        </Field>
                        <Field id="state" label="State" required error={errors.state}>
                            <input type="text" className={`input-field ${errors.state ? 'border-red-300' : ''}`} placeholder="State" value={form.state} onChange={e => set('state', e.target.value)} />
                        </Field>
                    </div>
                </SectionCard>

                {/* ── Section 4: Business Profile ── */}
                <SectionCard icon={User} title="Business Profile">
                    <Field id="natureOfBusiness" label="Nature of Current Business" required error={errors.natureOfBusiness}>
                        <RadioWithOther
                            options={[
                                'Study Abroad Consultancy with academy',
                                'Tuition / Coaching Classes',
                                'Only Academy for Study Abroad (IELTS/PTE/French/German etc.) - No Visa/country',
                                'College / Institute',
                                'New Business / Investor',
                                'Study Abroad consultancy without academy',
                                'Immigration company (No study)',
                                'Other'
                            ]}
                            value={form.natureOfBusiness} otherValue={form.natureOfBusinessOther}
                            onChange={v => set('natureOfBusiness', v)} onOtherChange={v => set('natureOfBusinessOther', v)}
                            cols={1} hasError={!!errors.natureOfBusiness} otherError={errors.natureOfBusinessOther}
                        />
                    </Field>
                    <Field id="demoFocus" label="Demo Focus" required error={errors.demoFocus}>
                        <RadioWithOther
                            options={['Academy Services', 'Other']}
                            value={form.demoFocus} otherValue={form.demoFocusOther}
                            onChange={v => set('demoFocus', v)} onOtherChange={v => set('demoFocusOther', v)}
                            cols={2} hasError={!!errors.demoFocus} otherError={errors.demoFocusOther}
                        />
                    </Field>
                </SectionCard>

                {/* ── Section 5: Demo Outcome & Commercial ── */}
                <SectionCard icon={TrendingUp} title="Demo Outcome & Commercial">
                    <Field id="overallInterestLevel" label="Overall Interest Level After Demo" required error={errors.overallInterestLevel}>
                        <RadioGroup options={['High', 'Medium', 'Low']} value={form.overallInterestLevel} onChange={v => set('overallInterestLevel', v)} cols={3} hasError={!!errors.overallInterestLevel} />
                    </Field>
                    <Field id="productsDiscussed" label="Product(s) Discussed" required error={errors.productsDiscussed}>
                        <MultiCheckWithOther
                            options={['White-label E-Learning Platform', 'Academy Setup Support', 'Books', 'Mock Test Centre', 'Classroom Content', 'Onshore', 'Referral', 'Admissions', 'Personalised Coaching', 'Other']}
                            values={form.productsDiscussed} otherValue={form.productsDiscussedOther}
                            onChange={v => set('productsDiscussed', v)} onOtherChange={v => set('productsDiscussedOther', v)}
                            hasError={!!errors.productsDiscussed} otherError={errors.productsDiscussedOther}
                        />
                    </Field>
                    <Field id="interestedIn" label="Interested In" required error={errors.interestedIn}>
                        <MultiCheckWithOther
                            options={['White-label E-Learning Platform', 'Academy Setup Support', 'Books', 'Mock Test Centre', 'Classroom Content', 'Onshore', 'Referral', 'Admissions', 'Personalised Coaching', 'Hiring', 'Training', 'Complete Academy setup', 'Other']}
                            values={form.interestedIn} otherValue={form.interestedInOther}
                            onChange={v => set('interestedIn', v)} onOtherChange={v => set('interestedInOther', v)}
                            hasError={!!errors.interestedIn} otherError={errors.interestedInOther}
                        />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field id="probabilityOfClosure" label="Probability of Closure" required error={errors.probabilityOfClosure}>
                            <RadioGroup options={['0–25%', '25–50%', '50–75%', '75–100%']} value={form.probabilityOfClosure} onChange={v => set('probabilityOfClosure', v)} cols={2} hasError={!!errors.probabilityOfClosure} />
                        </Field>
                        <Field label="Expected Deal Size (₹)">
                            <input type="number" min="0" className="input-field" placeholder="0" value={form.expectedDealSize} onChange={e => set('expectedDealSize', e.target.value)} />
                        </Field>
                    </div>
                </SectionCard>

                {/* ── Section 6: Business Assessment ── */}
                <SectionCard icon={BarChart3} title="Business Assessment">
                    <Field label="Do they currently run an academy / coaching setup?">
                        <RadioGroup options={['Yes – Offline only', 'Yes – Online only', 'Yes – Hybrid (Offline + Online)', 'No academy currently']} value={form.hasAcademy} onChange={v => set('hasAcademy', v)} cols={2} />
                    </Field>
                    <Field label="Premise Status">
                        <RadioGroup options={['Owned', 'Rented', 'Shared / Partnered space', 'No physical premise']} value={form.premiseStatus} onChange={v => set('premiseStatus', v)} cols={2} />
                    </Field>
                    <Field label="Approximate Classroom Capacity (if offline)">
                        <RadioGroup options={['Less than 30 students', '30–60 students', '60–100 students', '100+ students', 'Not applicable']} value={form.classroomCapacity} onChange={v => set('classroomCapacity', v)} cols={2} />
                    </Field>
                    <Field label="Do they have dedicated counselling cabins?">
                        <RadioGroup options={['Yes', 'No']} value={form.hasCounsellingCabins} onChange={v => set('hasCounsellingCabins', v)} cols={2} />
                    </Field>
                    <Field label="Are they currently into Study Abroad admissions?">
                        <RadioGroup options={['Yes – Actively', 'Yes – Occasionally', 'No, but interested', 'No, not interested']} value={form.studyAbroadStatus} onChange={v => set('studyAbroadStatus', v)} cols={2} />
                    </Field>
                    <Field label="If YES, which countries do they currently work with?">
                        <MultiCheck options={['Canada', 'USA', 'UK', 'Australia', 'Europe', 'Other', 'Do not do visas']} values={form.countriesWorkWith} onChange={v => set('countriesWorkWith', v)} />
                    </Field>
                    <Field label="Approximate students sent abroad per year">
                        <RadioGroup options={['1–10', '10–25', '25–50', '50+', 'None yet']} value={form.studentsAbroadPerYear} onChange={v => set('studentsAbroadPerYear', v)} cols={3} />
                    </Field>
                    <Field label="Do they currently offer test prep to their students?">
                        <RadioGroup options={['Yes – In-house faculty', 'Yes – Outsourced', 'No']} value={form.offersTestPrep} onChange={v => set('offersTestPrep', v)} cols={3} />
                    </Field>
                    <Field label="Current Test Prep Focus">
                        <MultiCheckWithOther
                            options={['IELTS', 'PTE', 'Duolingo', 'GRE / GMAT', 'French / German', 'None', 'Other']}
                            values={form.currentTestPrepFocus} otherValue={form.currentTestPrepFocusOther}
                            onChange={v => set('currentTestPrepFocus', v)} onOtherChange={v => set('currentTestPrepFocusOther', v)}
                        />
                    </Field>
                    <Field label="Do they currently have an LMS / E-learning platform?">
                        <RadioGroup options={['Yes – Own platform', 'Yes – Third-party platform', 'No']} value={form.hasLMS} onChange={v => set('hasLMS', v)} cols={3} />
                    </Field>
                    <Field label="Are they comfortable selling online courses?">
                        <RadioGroup options={['Very comfortable', 'Somewhat comfortable', 'Not comfortable yet']} value={form.comfortableSellingOnline} onChange={v => set('comfortableSellingOnline', v)} cols={3} />
                    </Field>
                    <Field label="Primary Source of Student Leads">
                        <MultiCheck options={['Walk-ins', 'Referrals', 'Digital Ads', 'Social Media', 'School / College Tie-ups']} values={form.primaryLeadSources} onChange={v => set('primaryLeadSources', v)} />
                    </Field>
                </SectionCard>

                {/* ── Section 7: Closure Planning ── */}
                <SectionCard icon={BarChart3} title="Closure Planning">
                    <Field label="Indicative Budget Readiness">
                        <RadioGroup options={['Ready immediately', 'Needs internal discussion', 'Timeline unclear', 'Budget constraint']} value={form.budgetReadiness} onChange={v => set('budgetReadiness', v)} cols={2} />
                    </Field>
                    <Field label="Expected Go-Live Timeline (as per client)">
                        <RadioGroup options={['Within 15 days', '1 month', '2–3 months', 'Not defined']} value={form.goLiveTimeline} onChange={v => set('goLiveTimeline', v)} cols={2} />
                    </Field>
                    <Field label="Any Key Concerns Raised by the Client?">
                        <MultiCheck options={['Pricing', 'Time commitment', 'Faculty / Operations', 'Trust / Credibility', 'Market demand', 'None']} values={form.keyConcerns} onChange={v => set('keyConcerns', v)} />
                    </Field>
                </SectionCard>

                {/* ── Section 8: Next Steps ── */}
                <SectionCard icon={CalendarDays} title="Next Steps">
                    <Field id="nextActionPlanned" label="Next Action Planned" required error={errors.nextActionPlanned}>
                        <RadioGroup options={['Follow-up Call', 'Proposal Sharing', 'Internal Discussion Pending', 'No Follow-up Required']} value={form.nextActionPlanned} onChange={v => set('nextActionPlanned', v)} cols={2} hasError={!!errors.nextActionPlanned} />
                    </Field>
                    <Field id="meetingRecordingLink" label="Meeting Recording Link" error={errors.meetingRecordingLink}>
                        <input type="url" className={`input-field ${errors.meetingRecordingLink ? 'border-red-300' : ''}`} placeholder="https://..." value={form.meetingRecordingLink} onChange={e => set('meetingRecordingLink', e.target.value)} />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Next Follow-up Date">
                            <input type="date" className="input-field" value={form.nextFollowUpDate} onChange={e => set('nextFollowUpDate', e.target.value)} />
                        </Field>
                        <Field label="Expected Closure Date">
                            <input type="date" className="input-field" value={form.expectedClosureDate} onChange={e => set('expectedClosureDate', e.target.value)} />
                        </Field>
                    </div>
                    <Field label="Additional Notes / Observations">
                        <textarea className="input-field resize-none" rows={4} placeholder="Any additional context or observations..." value={form.additionalNotes} onChange={e => set('additionalNotes', e.target.value)} />
                    </Field>
                </SectionCard>

                {/* Submit */}
                {errCount > 0 && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Please fix {errCount} error{errCount > 1 ? 's' : ''} above before submitting.
                    </div>
                )}
                <div className="flex gap-3 pb-6">
                    <button type="button" onClick={() => navigate('/')} className="flex-1 btn-outline py-3">Cancel</button>
                    <button type="submit" disabled={submitting} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Feedback'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PostDemoFeedback;
