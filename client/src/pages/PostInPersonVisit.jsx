import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Loader2, CheckCircle } from 'lucide-react';
import api from '../utils/api';

const FIELD_DEFS = [
    { key: 'spocName', label: 'Name of SPOC/s', type: 'text' },
    { key: 'ownerName', label: 'Owner Name', type: 'text' },
    { key: 'whatsappNumber', label: 'Whatsapp Number', type: 'text' },
    { key: 'numPromoters', label: 'Number of Promoters', type: 'number' },
    { key: 'promoterInvolvement', label: 'Promoters Involvement in Business', type: 'select', options: ['Extremely involved (daily)', 'Involved (weekly)', 'Somewhat involved (twice weekly)', 'Not very involved (less than weekly)'] },
    { key: 'partnershipType', label: 'Type of Partnership', type: 'select', options: ['Existing prepcom', 'Existing appcom', 'Existing prepcom+appcom', 'New partner'] },
    { key: 'decisionMakerAvailable', label: 'Decision Maker Available', type: 'select', options: ['Yes', 'No', 'Other'] },
    { key: 'meetingPlanned', label: 'Meeting Planned', type: 'select', options: ['Yes', 'No', 'Other'] },
    { key: 'meetingDuration', label: 'Duration of Meeting (minutes)', type: 'number' },
    { key: 'otherPeopleDesignation', label: 'Other People Present - Designation', type: 'text' },
    { key: 'closureProbability', label: 'Probability of Closure', type: 'select', options: ['0-25%', '25-50%', '50-75%', '75-100%'] },
    { key: 'interestedInAdmissions', label: 'Interested in Admissions', type: 'select', options: ['Yes', 'No'] },
    { key: 'officeSize', label: 'Office Size', type: 'text' },
    { key: 'teamDistribution', label: 'Team Distribution', type: 'text' },
    { key: 'admissionPotential', label: 'Potential of Admission Business', type: 'select', options: ['0-5 files/quarter', '5-30 files/quarter', '30-60 files/quarter', '60+ files/quarter'] },
    { key: 'academyCoursesTaught', label: 'Academy Courses Taught', type: 'multiselect', options: ['IELTS', 'PTE', 'French', 'German', 'SAT', 'GRE', 'GMAT', 'Other'] },
    { key: 'prepInquiryHandling', label: 'Handling of Prep Inquiries', type: 'text' },
    { key: 'teachingFormat', label: 'Teaching Format', type: 'select', options: ['Online', 'Offline', 'Do not teach', 'Other'] },
    { key: 'premises', label: 'Premises', type: 'select', options: ['Owned', 'Rented', 'Both', 'Other'] },
    { key: 'primaryBusinessStudyAbroad', label: 'Primary Business is Study Abroad', type: 'select', options: ['Yes', 'No', 'Other'] },
    { key: 'countriesPriorityRanking', label: 'Countries Promoted (Priority Ranking)', type: 'textarea' },
    { key: 'last3YearsVolume', label: 'Last 3 Years Volume (by Country)', type: 'textarea' },
    { key: 'offeringsDiscussed', label: 'Offerings Discussed', type: 'textarea' },
    { key: 'finalInterest', label: 'Finally Interested In', type: 'textarea' },
    { key: 'marketingStrategyRanking', label: 'Marketing Strategy (Priority Ranking)', type: 'textarea' },
    { key: 'marketingStrategyExplanation', label: 'Marketing Strategy Explanation', type: 'text' },
    { key: 'digitalMarketingBudget', label: 'Annual Digital Marketing Budget', type: 'number' },
    { key: 'offlineMarketingBudget', label: 'Annual Offline Marketing Budget', type: 'number' },
    { key: 'avgCostPerLead', label: 'Average Cost per Lead', type: 'number' },
    { key: 'conversionRatio', label: 'Average Conversion Ratio (per 100 leads)', type: 'text' },
    { key: 'leadMonitoringPractices', label: 'Lead Monitoring Practices', type: 'text' },
    { key: 'marketingMaterialsQuality', label: 'Quality of Marketing Materials', type: 'text' },
    { key: 'websiteDigitalManagement', label: 'Website / Digital Management', type: 'text' },
    { key: 'biggestIssueFaced', label: 'Biggest Issue Faced', type: 'text' },
    { key: 'otherIssuesFaced', label: 'Other Issues Faced', type: 'multiselect', options: ['Low lead volume', 'Low lead quality', 'High cost', 'Visa refusal', 'Technical knowledge gaps', 'Staff attrition', 'Coaching issues', 'Low revenue', 'Other'] },
    { key: 'top5Issues', label: 'Top 5 Issues Faced', type: 'textarea' },
    { key: 'nextStepsMOM', label: 'Next Steps + MOM', type: 'textarea' },
    { key: 'nextFollowUpDate', label: 'Next Follow Up Date', type: 'date' },
];

const GROUPS = [
    { title: 'Basic Meeting Details', keys: ['spocName', 'ownerName', 'whatsappNumber', 'numPromoters', 'promoterInvolvement', 'partnershipType', 'decisionMakerAvailable', 'meetingPlanned', 'meetingDuration', 'otherPeopleDesignation', 'closureProbability', 'interestedInAdmissions'] },
    { title: 'Business Profile', keys: ['officeSize', 'teamDistribution', 'admissionPotential', 'academyCoursesTaught', 'prepInquiryHandling', 'teachingFormat', 'premises', 'primaryBusinessStudyAbroad'] },
    { title: 'Discussion Notes', keys: ['countriesPriorityRanking', 'last3YearsVolume', 'offeringsDiscussed', 'finalInterest', 'marketingStrategyRanking', 'marketingStrategyExplanation'] },
    { title: 'Marketing, Issues and Follow-Up', keys: ['digitalMarketingBudget', 'offlineMarketingBudget', 'avgCostPerLead', 'conversionRatio', 'leadMonitoringPractices', 'marketingMaterialsQuality', 'websiteDigitalManagement', 'biggestIssueFaced', 'otherIssuesFaced', 'top5Issues', 'nextStepsMOM', 'nextFollowUpDate'] }
];

const defaultForm = FIELD_DEFS.reduce((acc, field) => {
    acc[field.key] = field.type === 'multiselect' ? [] : '';
    return acc;
}, {});

const PostInPersonVisit = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState(defaultForm);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const byKey = useMemo(
        () => FIELD_DEFS.reduce((acc, f) => ({ ...acc, [f.key]: f }), {}),
        []
    );

    const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    const toggleMulti = (key, option) => {
        setForm((prev) => {
            const current = prev[key] || [];
            const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option];
            return { ...prev, [key]: next };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...form,
                numPromoters: Number(form.numPromoters) || 0,
                meetingDuration: Number(form.meetingDuration) || 0,
                digitalMarketingBudget: Number(form.digitalMarketingBudget) || 0,
                offlineMarketingBudget: Number(form.offlineMarketingBudget) || 0,
                avgCostPerLead: Number(form.avgCostPerLead) || 0
            };
            await api.post('/post-in-person-visit', payload);
            setSubmitted(true);
        } catch (err) {
            alert(err.response?.data?.message || 'Error submitting form. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderField = (field) => {
        if (field.type === 'textarea') {
            return <textarea className="input-field resize-none" rows={3} value={form[field.key]} onChange={(e) => setField(field.key, e.target.value)} />;
        }
        if (field.type === 'select') {
            return (
                <select className="input-field" value={form[field.key]} onChange={(e) => setField(field.key, e.target.value)}>
                    <option value="">Select</option>
                    {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
            );
        }
        if (field.type === 'multiselect') {
            return (
                <div className="flex flex-wrap gap-2 mt-1">
                    {field.options.map((option) => {
                        const checked = form[field.key].includes(option);
                        return (
                            <label key={option} className={`px-3 py-1.5 rounded-xl border-2 cursor-pointer text-sm font-semibold transition-all ${checked ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleMulti(field.key, option)} />
                                {option}
                            </label>
                        );
                    })}
                </div>
            );
        }
        return (
            <input
                type={field.type}
                className="input-field"
                value={form[field.key]}
                onChange={(e) => setField(field.key, e.target.value)}
            />
        );
    };

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 page-enter">
                <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-brand-green" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Submitted Successfully!</h2>
                    <p className="text-slate-500">Post In-Person Visit form has been recorded.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => { setForm(defaultForm); setSubmitted(false); }} className="btn-outline px-6 py-2.5">Submit Another</button>
                    <button onClick={() => navigate('/')} className="btn-primary px-6 py-2.5">Go to Dashboard</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 page-enter max-w-4xl mx-auto">
            <div>
                <h1 className="page-title flex items-center gap-2">
                    <Users className="w-6 h-6 text-brand-blue" />
                    Post In-Person Visit
                </h1>
                <p className="page-subtitle">Capture post in-person visit notes as a standalone form</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {GROUPS.map((group) => (
                    <div key={group.title} className="card space-y-4">
                        <h3 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2">{group.title}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {group.keys.map((key) => {
                                const field = byKey[key];
                                return (
                                    <div key={key} className={field.type === 'textarea' || field.type === 'multiselect' ? 'sm:col-span-2' : ''}>
                                        <label className="label">{field.label}</label>
                                        {renderField(field)}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <div className="flex gap-3 pb-6">
                    <button type="button" onClick={() => navigate('/')} className="flex-1 btn-outline py-3">Cancel</button>
                    <button type="submit" disabled={submitting} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Report'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PostInPersonVisit;
