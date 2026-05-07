import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Loader2, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import MultiSelect from '../components/shared/MultiSelect';

const BDM_NAMES = [
    'Davidayal',
    'Archana Vishwakarma',
    'Parth Harumalani',
    'Sachin Shah',
    'Dilip Siyag',
    'Bikal Singh',
    'Palash Thakore',
    'Shubham Mahavar',
    'Tisha',
    'Amit Pandey',
    'Akshay Kumar',
    'Amarjeet Kalra'
];

const COUNTRIES = ['Canada', 'USA', 'UK', 'Australia', 'Germany', 'France', 'Italy', 'New Zealand', 'Ireland', 'Other'];

const Section = ({ title, children }) => (
    <div className="card space-y-4">
        <h3 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2">{title}</h3>
        {children}
    </div>
);

const FieldText = ({ label, value, onChange, type = 'text', placeholder, required, error }) => (
    <div>
        <label className="label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
        <input
            type={type}
            className={`input-field ${error ? 'border-red-300' : ''}`}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);

const FieldArea = ({ label, value, onChange, rows = 3, placeholder, required }) => (
    <div className="sm:col-span-2">
        <label className="label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
        <textarea
            className="input-field resize-none"
            rows={rows}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

const FieldMulti = ({ label, options, value, onChange, required, error, placeholder, fullWidth = true }) => (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
        <label className="label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
        <MultiSelect options={options} value={value} onChange={onChange} placeholder={placeholder || 'Select...'} />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);

const defaultForm = {
    date: new Date().toISOString().slice(0, 10),
    bdmName: [],
    spocName: '',
    numPromoters: '',
    promoterInvolvement: [],
    companyName: '',
    partnershipType: [],
    decisionMakerAvailable: [],
    meetingPlanned: [],
    meetingDuration: '',
    gmbLink: '',
    websiteLink: '',
    ownerName: '',
    email: '',
    phoneNumber: '',
    whatsappNumber: '',
    otherPeopleDesignation: '',
    closureProbability: [],
    numBranches: '',
    interestedInAdmissions: [],
    teamSize: '',
    officeSize: '',
    teamDistribution: '',
    admissionPotential: [],
    businessModel: [],
    academyCoursesTaught: [],
    prepInquiryHandling: '',
    teachingFormat: [],
    countriesPromoted: [],
    last3YearsVolume: '',
    offeringsDiscussed: '',
    finalInterest: '',
    premises: [],
    primaryBusinessStudyAbroad: [],
    marketingStrategyRanking: [],
    marketingStrategyExplanation: '',
    digitalMarketingBudget: '',
    offlineMarketingBudget: '',
    avgCostPerLead: '',
    conversionRatio: '',
    leadMonitoringPractices: '',
    marketingMaterialsQuality: '',
    websiteDigitalManagement: '',
    biggestIssueFaced: '',
    otherIssuesFaced: [],
    top5Issues: '',
    nextStepsMOM: '',
    nextFollowUpDate: ''
};

const PostInPersonVisit = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState(defaultForm);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    };

    const validate = () => {
        const errs = {};
        if (!form.date) errs.date = 'Required';
        if (!form.bdmName.length) errs.bdmName = 'Select BDM';
        if (!form.spocName.trim()) errs.spocName = 'Required';
        if (!form.companyName.trim()) errs.companyName = 'Required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            const payload = {
                ...form,
                bdmName: form.bdmName.join(', '),
                bdmNames: form.bdmName,
                numPromoters: Number(form.numPromoters) || 0,
                meetingDuration: Number(form.meetingDuration) || 0,
                numBranches: Number(form.numBranches) || 0,
                teamSize: Number(form.teamSize) || 0,
                digitalMarketingBudget: Number(form.digitalMarketingBudget) || 0,
                offlineMarketingBudget: Number(form.offlineMarketingBudget) || 0,
                avgCostPerLead: Number(form.avgCostPerLead) || 0,
                promoterInvolvement: form.promoterInvolvement[0] || '',
                promoterInvolvementList: form.promoterInvolvement,
                partnershipType: form.partnershipType[0] || '',
                partnershipTypeList: form.partnershipType,
                decisionMakerAvailable: form.decisionMakerAvailable[0] || '',
                decisionMakerAvailableList: form.decisionMakerAvailable,
                meetingPlanned: form.meetingPlanned[0] || '',
                meetingPlannedList: form.meetingPlanned,
                closureProbability: form.closureProbability[0] || '',
                closureProbabilityList: form.closureProbability,
                interestedInAdmissions: form.interestedInAdmissions[0] || '',
                interestedInAdmissionsList: form.interestedInAdmissions,
                admissionPotential: form.admissionPotential[0] || '',
                admissionPotentialList: form.admissionPotential,
                teachingFormat: form.teachingFormat[0] || '',
                teachingFormatList: form.teachingFormat,
                premises: form.premises[0] || '',
                premisesList: form.premises,
                primaryBusinessStudyAbroad: form.primaryBusinessStudyAbroad[0] || '',
                primaryBusinessStudyAbroadList: form.primaryBusinessStudyAbroad
            };
            await api.post('/post-in-person-visit', payload);
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
                    <p className="text-slate-500">Post In-Person Visit form has been recorded.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => { setForm(defaultForm); setSubmitted(false); setErrors({}); }} className="btn-outline px-6 py-2.5">Submit Another</button>
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
                <p className="page-subtitle">Capture in-person visit details and partner profile</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

                {/* Meeting Basics */}
                <Section title="Meeting Basics">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldText label="Date" type="date" value={form.date} onChange={v => set('date', v)} required error={errors.date} />
                        <FieldMulti label="BDM Name" options={BDM_NAMES} value={form.bdmName} onChange={v => set('bdmName', v)} required error={errors.bdmName} fullWidth={false} />
                        <FieldText label="Name of SPOC/s" value={form.spocName} onChange={v => set('spocName', v)} required error={errors.spocName} />
                        <FieldText label="Number of Promoters" type="number" value={form.numPromoters} onChange={v => set('numPromoters', v)} />
                        <FieldMulti
                            label="Promoters Involvement in Business"
                            options={[
                                'Extremely involved (daily)',
                                'Somewhat involved (twice weekly)',
                                'Involved (weekly)',
                                'Not very involved (less than weekly)'
                            ]}
                            value={form.promoterInvolvement}
                            onChange={v => set('promoterInvolvement', v)}
                            fullWidth={false}
                        />
                        <FieldText label="Name of Company" value={form.companyName} onChange={v => set('companyName', v)} required error={errors.companyName} />
                        <FieldMulti
                            label="Type of Partnership"
                            options={['Existing prepcom', 'Existing appcom', 'Existing prepcom+appcom', 'New partner']}
                            value={form.partnershipType}
                            onChange={v => set('partnershipType', v)}
                            fullWidth={false}
                        />
                        <FieldMulti
                            label="Decision Maker Available?"
                            options={['Yes', 'No', 'Other']}
                            value={form.decisionMakerAvailable}
                            onChange={v => set('decisionMakerAvailable', v)}
                            fullWidth={false}
                        />
                        <FieldMulti
                            label="Was this Meeting Planned?"
                            options={['Yes', 'No', 'Other']}
                            value={form.meetingPlanned}
                            onChange={v => set('meetingPlanned', v)}
                            fullWidth={false}
                        />
                        <FieldText label="Duration of Meeting (minutes)" type="number" value={form.meetingDuration} onChange={v => set('meetingDuration', v)} />
                    </div>
                </Section>

                {/* Contact & Links */}
                <Section title="Contact & Links">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldText label="GMB Link" type="url" value={form.gmbLink} onChange={v => set('gmbLink', v)} placeholder="https://maps.google.com/..." />
                        <FieldText label="Website Link" type="url" value={form.websiteLink} onChange={v => set('websiteLink', v)} placeholder="https://..." />
                        <FieldText label="Owner Name" value={form.ownerName} onChange={v => set('ownerName', v)} />
                        <FieldText label="Email" type="email" value={form.email} onChange={v => set('email', v)} placeholder="email@example.com" />
                        <FieldText label="Phone Number" type="tel" value={form.phoneNumber} onChange={v => set('phoneNumber', v)} />
                        <FieldText label="Whatsapp Number" type="tel" value={form.whatsappNumber} onChange={v => set('whatsappNumber', v)} />
                        <FieldText label="Other People Present — Designation" value={form.otherPeopleDesignation} onChange={v => set('otherPeopleDesignation', v)} />
                        <FieldMulti
                            label="Probability of Closure"
                            options={['0-25%', '25-50%', '50-75%', '75-100%']}
                            value={form.closureProbability}
                            onChange={v => set('closureProbability', v)}
                            fullWidth={false}
                        />
                    </div>
                </Section>

                {/* Business Profile */}
                <Section title="Business Profile">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldText label="No. of Branches" type="number" value={form.numBranches} onChange={v => set('numBranches', v)} />
                        <FieldMulti
                            label="Interested in Admissions?"
                            options={['Yes', 'No']}
                            value={form.interestedInAdmissions}
                            onChange={v => set('interestedInAdmissions', v)}
                            fullWidth={false}
                        />
                        <FieldText label="Team Size" type="number" value={form.teamSize} onChange={v => set('teamSize', v)} />
                        <FieldText label="Office Size (approx sq ft)" value={form.officeSize} onChange={v => set('officeSize', v)} />
                        <FieldArea label="Team Distribution" value={form.teamDistribution} onChange={v => set('teamDistribution', v)} rows={2} placeholder="Personnel breakdown..." />
                        <FieldMulti
                            label="Potential of Admission Business"
                            options={['0-5 files/quarter', '5-30 files/quarter', '30-60 files/quarter', '60+ files/quarter']}
                            value={form.admissionPotential}
                            onChange={v => set('admissionPotential', v)}
                        />
                        <FieldMulti
                            label="Business Model — Admission/Coaching"
                            options={[
                                'Study Abroad Coaching Only',
                                'Study Abroad Visas Only',
                                'Study Abroad Coaching and Visas',
                                'Non-traditional Coaching',
                                'Looking for new business',
                                'Other'
                            ]}
                            value={form.businessModel}
                            onChange={v => set('businessModel', v)}
                        />
                        <FieldMulti
                            label="If Academy, which courses?"
                            options={['IELTS', 'PTE', 'French', 'German', 'SAT', 'GRE', 'GMAT', 'Other']}
                            value={form.academyCoursesTaught}
                            onChange={v => set('academyCoursesTaught', v)}
                        />
                        <FieldText label="If no academy, what with prep inquiries?" value={form.prepInquiryHandling} onChange={v => set('prepInquiryHandling', v)} />
                        <FieldMulti
                            label="Do they teach online or offline?"
                            options={['Online', 'Offline', 'Do not teach', 'Other']}
                            value={form.teachingFormat}
                            onChange={v => set('teachingFormat', v)}
                            fullWidth={false}
                        />
                        <FieldMulti
                            label="Premises"
                            options={['Owned', 'Rented', 'Both', 'Other']}
                            value={form.premises}
                            onChange={v => set('premises', v)}
                            fullWidth={false}
                        />
                        <FieldMulti
                            label="Primary Business is Study Abroad?"
                            options={['Yes', 'No', 'Other']}
                            value={form.primaryBusinessStudyAbroad}
                            onChange={v => set('primaryBusinessStudyAbroad', v)}
                            fullWidth={false}
                        />
                    </div>
                </Section>

                {/* Discussion & Volume */}
                <Section title="Discussion Notes">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldMulti label="Countries Promoted" options={COUNTRIES} value={form.countriesPromoted} onChange={v => set('countriesPromoted', v)} />
                        <FieldArea label="Last 3 Years Volume (by Country)" value={form.last3YearsVolume} onChange={v => set('last3YearsVolume', v)} rows={3} />
                        <FieldArea label="Offerings Discussed" value={form.offeringsDiscussed} onChange={v => set('offeringsDiscussed', v)} rows={3} placeholder="Engagement levels per offering..." />
                        <FieldArea label="Finally Interested In" value={form.finalInterest} onChange={v => set('finalInterest', v)} rows={3} placeholder="Interest levels per offering..." />
                    </div>
                </Section>

                {/* Marketing */}
                <Section title="Marketing">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldMulti
                            label="Marketing Strategy (Priority)"
                            options={['Digital Ads', 'Social Media', 'Referrals', 'Walk-ins', 'School/College Tie-ups']}
                            value={form.marketingStrategyRanking}
                            onChange={v => set('marketingStrategyRanking', v)}
                        />
                        <FieldText label="Marketing Strategy — Explain" value={form.marketingStrategyExplanation} onChange={v => set('marketingStrategyExplanation', v)} />
                        <FieldText label="Annual Marketing Budget — Digital (₹)" type="number" value={form.digitalMarketingBudget} onChange={v => set('digitalMarketingBudget', v)} />
                        <FieldText label="Annual Marketing Budget — Offline (₹)" type="number" value={form.offlineMarketingBudget} onChange={v => set('offlineMarketingBudget', v)} />
                        <FieldText label="Average Cost per Lead (₹)" type="number" value={form.avgCostPerLead} onChange={v => set('avgCostPerLead', v)} />
                        <FieldText label="Average Conversion Ratio (per 100 leads)" value={form.conversionRatio} onChange={v => set('conversionRatio', v)} />
                        <FieldText label="Lead / Counselling Monitoring" value={form.leadMonitoringPractices} onChange={v => set('leadMonitoringPractices', v)} />
                        <FieldText label="Quality of Brochures / Marketing Material" value={form.marketingMaterialsQuality} onChange={v => set('marketingMaterialsQuality', v)} />
                        <FieldText label="Website / Digital Presence Handler" value={form.websiteDigitalManagement} onChange={v => set('websiteDigitalManagement', v)} placeholder="Inhouse / Agency / Mixed" />
                    </div>
                </Section>

                {/* Issues & Follow Up */}
                <Section title="Issues & Follow Up">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FieldText label="Biggest Issue Overall" value={form.biggestIssueFaced} onChange={v => set('biggestIssueFaced', v)} />
                        <FieldMulti
                            label="Other Issues Faced"
                            options={[
                                'Low lead volume',
                                'Low lead quality',
                                'High lead gen cost',
                                'Visa refusal rate',
                                'Lack of technical knowledge',
                                'Staff attrition',
                                'Coaching related issues',
                                'Low revenue',
                                'Other'
                            ]}
                            value={form.otherIssuesFaced}
                            onChange={v => set('otherIssuesFaced', v)}
                        />
                        <FieldArea label="Other Top 5 Issues" value={form.top5Issues} onChange={v => set('top5Issues', v)} />
                        <FieldArea label="Next Steps + MOM" value={form.nextStepsMOM} onChange={v => set('nextStepsMOM', v)} rows={4} />
                        <FieldText label="Next Follow Up Date" type="date" value={form.nextFollowUpDate} onChange={v => set('nextFollowUpDate', v)} />
                    </div>
                </Section>

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
