import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, BookOpen, MessageSquare, ChevronRight, BarChart2, Users } from 'lucide-react';

const FORM_DEFS = [
    {
        key: 'post_field_day',
        label: 'Post Field Day',
        description: 'Submit your end-of-day field activity report',
        icon: ClipboardList,
        path: '/post-field-day',
        iconBg: 'bg-brand-green/10',
        iconColor: 'text-brand-green',
        border: 'hover:border-brand-green/30',
    },
    {
        key: 'daily_report',
        label: 'Daily Report',
        description: 'Log your daily meetings, location and activity',
        icon: BookOpen,
        path: '/daily-report',
        iconBg: 'bg-brand-blue/10',
        iconColor: 'text-brand-blue',
        border: 'hover:border-brand-blue/30',
    },
    {
        key: 'post_demo_feedback',
        label: 'Post-Demo Feedback',
        description: 'Submit detailed feedback after a product demonstration',
        icon: MessageSquare,
        path: '/post-demo-feedback',
        iconBg: 'bg-brand-purple/10',
        iconColor: 'text-brand-purple',
        border: 'hover:border-brand-purple/30',
    },
    {
        key: 'post_in_person_visit',
        label: 'Post In-Person Visit',
        description: 'Record post in-person visit outcomes and business notes',
        icon: Users,
        path: '/post-in-person-visit',
        iconBg: 'bg-brand-orange/10',
        iconColor: 'text-brand-orange',
        border: 'hover:border-brand-orange/30',
    },
];

const FormsHub = () => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();

    const accessible = FORM_DEFS.filter(f => user?.formAccess?.includes(f.key));

    return (
        <div className="space-y-6 page-enter">
            <div>
                <h1 className="page-title">Assigned Forms</h1>
                <p className="page-subtitle">Forms assigned to your role or department</p>
            </div>

            {accessible.length === 0 ? (
                <div className="card p-12 text-center text-slate-400 space-y-2">
                    <ClipboardList className="w-10 h-10 mx-auto opacity-30" />
                    <p className="font-semibold text-slate-500">No forms assigned yet</p>
                    <p className="text-sm">Ask your admin to assign forms to your account.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accessible.map(form => {
                        const Icon = form.icon;
                        return (
                            <button
                                key={form.key}
                                onClick={() => navigate(form.path)}
                                className={`card text-left flex flex-col gap-4 transition-all group ${form.border}`}
                            >
                                <div className={`w-12 h-12 rounded-lg ${form.iconBg} flex items-center justify-center shrink-0`}>
                                    <Icon className={`w-6 h-6 ${form.iconColor}`} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-800 text-base">{form.label}</h3>
                                    <p className="text-sm text-slate-400 mt-1">{form.description}</p>
                                </div>
                                <div className={`flex items-center gap-1 text-sm font-bold ${form.iconColor} group-hover:gap-2 transition-all`}>
                                    Open Form <ChevronRight className="w-4 h-4" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {isAdmin && (
                <div className="card border-dashed border-meridian-border bg-meridian-bg">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                            <BarChart2 className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-700 text-sm">Team Submissions</p>
                            <p className="text-xs text-slate-400">View and comment on your team's submitted forms</p>
                        </div>
                        <button
                            onClick={() => navigate('/forms-admin')}
                            className="btn-outline text-sm shrink-0 flex items-center gap-1.5"
                        >
                            View <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormsHub;
