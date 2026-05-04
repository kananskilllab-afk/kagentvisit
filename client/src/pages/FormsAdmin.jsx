import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import {
    MessageSquare, BookOpen, ClipboardList, ChevronDown, ChevronUp, Users,
    ChevronRight, Loader2, Send, X
} from 'lucide-react';

function getInitials(name = '') {
    return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
}

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const TABS = [
    { key: 'post_demo_feedback', label: 'Post-Demo Feedback', icon: MessageSquare, apiPath: '/post-demo-feedback' },
    { key: 'daily_report',       label: 'Daily Report',       icon: BookOpen,      apiPath: '/daily-report' },
    { key: 'post_field_day',     label: 'Post Field Day',     icon: ClipboardList, apiPath: '/post-field-day' },
    { key: 'post_in_person_visit', label: 'Post In-Person Visit', icon: Users, apiPath: '/post-in-person-visit' },
];

const InfoRow = ({ label, value }) => value == null || value === '' ? null : (
    <div className="flex gap-2 text-sm">
        <span className="text-slate-400 shrink-0 min-w-[140px]">{label}</span>
        <span className="text-slate-700 font-medium">{String(value)}</span>
    </div>
);

const InterestBadge = ({ level }) => {
    const cfg = { High: 'bg-green-50 text-green-600', Medium: 'bg-amber-50 text-amber-600', Low: 'bg-red-50 text-red-600' };
    return level ? (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg[level] || 'bg-slate-100 text-slate-500'}`}>{level}</span>
    ) : null;
};

const PostDemoDetail = ({ rec }) => (
    <div className="space-y-3 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <InfoRow label="Business Name" value={rec.accountBusinessName} />
            <InfoRow label="Demo Date" value={fmtDate(rec.demoDate)} />
            <InfoRow label="Medium" value={rec.mediumOfMeeting} />
            <InfoRow label="Meeting Type" value={rec.meetingType} />
            <InfoRow label="Primary Contact" value={rec.primaryContactName} />
            <InfoRow label="Designation" value={rec.primaryContactDesignation} />
            <InfoRow label="Contact" value={rec.contactNumber} />
            <InfoRow label="City / State" value={[rec.city, rec.state].filter(Boolean).join(', ')} />
            <InfoRow label="Nature of Business" value={rec.natureOfBusiness} />
            <InfoRow label="Demo Focus" value={rec.demoFocus} />
            <InfoRow label="Probability of Closure" value={rec.probabilityOfClosure} />
            <InfoRow label="Expected Deal Size" value={rec.expectedDealSize ? `₹${Number(rec.expectedDealSize).toLocaleString('en-IN')}` : null} />
            <InfoRow label="Go-Live Timeline" value={rec.goLiveTimeline} />
            <InfoRow label="Next Follow-Up" value={fmtDate(rec.nextFollowUpDate)} />
            <InfoRow label="Expected Closure" value={fmtDate(rec.expectedClosureDate)} />
        </div>
        {rec.additionalNotes && (
            <div className="mt-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-600">{rec.additionalNotes}</div>
        )}
    </div>
);

const DailyReportDetail = ({ rec }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <InfoRow label="BDM Name" value={rec.bdmName} />
        <InfoRow label="Date" value={fmtDate(rec.date)} />
        <InfoRow label="Leave Today" value={rec.leaveToday} />
        <InfoRow label="Location" value={rec.location} />
        <InfoRow label="Meetings" value={rec.numberOfMeetings} />
    </div>
);

const PostFieldDayDetail = ({ rec }) => (
    <div className="space-y-3 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <InfoRow label="Representative" value={rec.representativeName} />
            <InfoRow label="Date" value={fmtDate(rec.date)} />
            <InfoRow label="Work Mode" value={rec.workMode} />
            <InfoRow label="Location" value={rec.todaysLocation} />
            <InfoRow label="Leave Today" value={rec.leaveToday ? 'Yes' : 'No'} />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-3 bg-slate-50 rounded-xl">
            {[
                ['Planned', rec.visitsPlanned],
                ['Gate Crash', rec.visitsGateCrash],
                ['New', rec.visitsNew],
                ['Follow-Up', rec.visitsNewFollowUp],
                ['Existing', rec.visitsExisting],
            ].map(([l, v]) => (
                <div key={l} className="text-center">
                    <p className="text-[10px] text-slate-400 font-semibold">{l}</p>
                    <p className="text-lg font-extrabold text-slate-700">{v ?? 0}</p>
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <InfoRow label="Revenue (New)" value={rec.revenueNew ? `₹${Number(rec.revenueNew).toLocaleString('en-IN')}` : null} />
            <InfoRow label="Revenue (Existing)" value={rec.revenueExisting ? `₹${Number(rec.revenueExisting).toLocaleString('en-IN')}` : null} />
            <InfoRow label="Sales Effectiveness" value={rec.salesEffectiveness ? `${rec.salesEffectiveness}/5` : null} />
            <InfoRow label="Confidence Level" value={rec.confidenceLevel ? `${rec.confidenceLevel}/5` : null} />
            <InfoRow label="Demos Booked" value={rec.demosBooked} />
            <InfoRow label="Visits Booked Today" value={rec.visitsBookedToday} />
        </div>
        {rec.obstacles && <InfoRow label="Obstacles" value={rec.obstacles} />}
        {rec.keyFocusTomorrow && <InfoRow label="Key Focus Tomorrow" value={rec.keyFocusTomorrow} />}
    </div>
);

const PostInPersonVisitDetail = ({ rec }) => (
    <div className="space-y-3 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <InfoRow label="SPOC Name" value={rec.spocName} />
            <InfoRow label="Owner Name" value={rec.ownerName} />
            <InfoRow label="Whatsapp Number" value={rec.whatsappNumber} />
            <InfoRow label="Promoters" value={rec.numPromoters} />
            <InfoRow label="Promoter Involvement" value={rec.promoterInvolvement} />
            <InfoRow label="Partnership Type" value={rec.partnershipType} />
            <InfoRow label="Decision Maker Available" value={rec.decisionMakerAvailable} />
            <InfoRow label="Meeting Planned" value={rec.meetingPlanned} />
            <InfoRow label="Meeting Duration" value={rec.meetingDuration ? `${rec.meetingDuration} mins` : null} />
            <InfoRow label="Closure Probability" value={rec.closureProbability} />
            <InfoRow label="Interested in Admissions" value={rec.interestedInAdmissions} />
            <InfoRow label="Follow-Up Date" value={fmtDate(rec.nextFollowUpDate)} />
        </div>
        <InfoRow label="Other People Designation" value={rec.otherPeopleDesignation} />
        <InfoRow label="Office Size" value={rec.officeSize} />
        <InfoRow label="Team Distribution" value={rec.teamDistribution} />
        <InfoRow label="Admission Potential" value={rec.admissionPotential} />
        <InfoRow label="Academy Courses Taught" value={Array.isArray(rec.academyCoursesTaught) ? rec.academyCoursesTaught.join(', ') : ''} />
        <InfoRow label="Other Issues Faced" value={Array.isArray(rec.otherIssuesFaced) ? rec.otherIssuesFaced.join(', ') : ''} />
        {rec.nextStepsMOM && <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">{rec.nextStepsMOM}</div>}
    </div>
);

const CommentsSection = ({ record, apiPath, onUpdate }) => {
    const [text, setText] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!text.trim()) return;
        setSaving(true);
        try {
            const res = await api.post(`${apiPath}/${record._id}/comments`, { text });
            onUpdate(res.data.data);
            setText('');
        } catch {
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                Admin Comments {record.comments?.length > 0 && `(${record.comments.length})`}
            </p>
            {record.comments?.length > 0 && (
                <div className="space-y-2 mb-3">
                    {record.comments.map((c, i) => (
                        <div key={i} className="flex gap-2">
                            <div className="w-6 h-6 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                                {getInitials(c.addedBy?.name)}
                            </div>
                            <div className="flex-1 bg-brand-blue/5 rounded-xl px-3 py-2">
                                <p className="text-[10px] font-bold text-brand-blue">{c.addedBy?.name || 'Admin'}</p>
                                <p className="text-xs text-slate-700 mt-0.5">{c.text}</p>
                                <p className="text-[9px] text-slate-400 mt-1">{fmtDate(c.createdAt)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex gap-2">
                <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
                    placeholder="Add a comment..."
                    className="input-field flex-1 h-9 text-sm"
                />
                <button
                    onClick={submit}
                    disabled={!text.trim() || saving}
                    className="btn-primary px-3 h-9 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span className="text-sm hidden sm:inline">Send</span>
                </button>
            </div>
        </div>
    );
};

const SubmissionCard = ({ record, tabKey, apiPath, onUpdate }) => {
    const [expanded, setExpanded] = useState(false);

    const title = tabKey === 'post_demo_feedback'
        ? record.accountBusinessName || 'Unnamed Account'
        : tabKey === 'daily_report'
        ? record.bdmName || 'Daily Report'
        : tabKey === 'post_in_person_visit'
        ? record.spocName || record.ownerName || 'Post In-Person Visit'
        : record.representativeName || 'Field Day Report';

    const subtitle = fmtDate(
        tabKey === 'post_demo_feedback' ? record.demoDate
            : tabKey === 'daily_report' ? record.date
            : record.date
    );

    return (
        <div className="border border-meridian-border rounded-lg bg-white overflow-hidden">
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50/50 transition-colors"
            >
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
                </div>
                {tabKey === 'post_demo_feedback' && record.overallInterestLevel && (
                    <InterestBadge level={record.overallInterestLevel} />
                )}
                {record.comments?.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-brand-blue bg-brand-blue/8 px-2 py-0.5 rounded-full">
                        <MessageSquare className="w-3 h-3" />
                        {record.comments.length}
                    </span>
                )}
                {expanded
                    ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                }
            </button>
            {expanded && (
                <div className="px-4 pb-4 border-t border-slate-50">
                    <div className="pt-3">
                        {tabKey === 'post_demo_feedback' && <PostDemoDetail rec={record} />}
                        {tabKey === 'daily_report' && <DailyReportDetail rec={record} />}
                        {tabKey === 'post_field_day' && <PostFieldDayDetail rec={record} />}
                        {tabKey === 'post_in_person_visit' && <PostInPersonVisitDetail rec={record} />}
                    </div>
                    <CommentsSection record={record} apiPath={apiPath} onUpdate={onUpdate} />
                </div>
            )}
        </div>
    );
};

const UserCard = ({ group, isSelected, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full text-left p-4 rounded-lg border transition-all ${
            isSelected
                ? 'border-meridian-blue bg-blue-50 shadow-sm'
                : 'border-meridian-border bg-white hover:bg-meridian-row-hov'
        }`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                isSelected ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600'
            }`}>
                {getInitials(group.user.name)}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{group.user.name}</p>
                <p className="text-xs text-slate-400">
                    {group.records.length} submission{group.records.length !== 1 ? 's' : ''}
                </p>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'rotate-90 text-brand-blue' : 'text-slate-300'}`} />
        </div>
    </button>
);

const FormsAdmin = () => {
    const [activeTab, setActiveTab] = useState('post_demo_feedback');
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState(null);

    const currentTab = TABS.find(t => t.key === activeTab);

    const fetchData = useCallback(async (tabKey) => {
        setLoading(true);
        setSelectedUserId(null);
        try {
            const tab = TABS.find(t => t.key === tabKey);
            const res = await api.get(tab.apiPath);
            setSubmissions(res.data.data || []);
        } catch {
            setSubmissions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(activeTab); }, [activeTab, fetchData]);

    const groupedByUser = Object.values(
        submissions.reduce((acc, rec) => {
            const uid = rec.submittedBy?._id || 'unassigned';
            if (!acc[uid]) {
                acc[uid] = {
                    user: rec.submittedBy || { name: 'Unknown User', _id: 'unassigned' },
                    records: []
                };
            }
            acc[uid].records.push(rec);
            return acc;
        }, {})
    );

    const selectedGroup = groupedByUser.find(g => g.user._id === selectedUserId);

    const updateRecord = (updated) => {
        setSubmissions(prev => prev.map(r => r._id === updated._id ? updated : r));
    };

    return (
        <div className="space-y-5 page-enter">
            <div>
                <h1 className="page-title">Form Reports</h1>
                <p className="page-subtitle">View and comment on employee form submissions</p>
            </div>

            {/* Tab Bar */}
            <div className="card p-1.5 flex gap-1">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                activeTab === tab.key
                                    ? 'bg-brand-blue text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="card p-10 flex items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading submissions...
                </div>
            ) : groupedByUser.length === 0 ? (
                <div className="card p-10 text-center text-slate-400">
                    <p className="font-semibold">No submissions yet</p>
                </div>
            ) : selectedGroup ? (
                <div className="flex gap-4 items-start">
                    {/* Left: User Cards (desktop only when detail is open) */}
                    <div className="hidden sm:flex sm:flex-col gap-2 w-72 shrink-0">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide px-1">
                            {groupedByUser.length} employee{groupedByUser.length !== 1 ? 's' : ''}
                        </p>
                        {groupedByUser.map(group => (
                            <UserCard
                                key={group.user._id}
                                group={group}
                                isSelected={selectedUserId === group.user._id}
                                onClick={() => setSelectedUserId(
                                    selectedUserId === group.user._id ? null : group.user._id
                                )}
                            />
                        ))}
                    </div>

                    {/* Right: Detail panel */}
                    <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSelectedUserId(null)}
                                className="sm:hidden p-1.5 rounded-lg border border-slate-200 text-slate-500"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div>
                                <p className="font-bold text-slate-800">{selectedGroup.user.name}</p>
                                <p className="text-xs text-slate-400">
                                    {selectedGroup.records.length} submission{selectedGroup.records.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        {selectedGroup.records.map(record => (
                            <SubmissionCard
                                key={record._id}
                                record={record}
                                tabKey={activeTab}
                                apiPath={currentTab.apiPath}
                                onUpdate={updateRecord}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                /* No user selected: full-width user cards grid */
                <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide px-1">
                        {groupedByUser.length} employee{groupedByUser.length !== 1 ? 's' : ''}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {groupedByUser.map(group => (
                            <UserCard
                                key={group.user._id}
                                group={group}
                                isSelected={false}
                                onClick={() => setSelectedUserId(group.user._id)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormsAdmin;
