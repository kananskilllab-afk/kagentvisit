import React, { useEffect, useState } from 'react';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '/api';

function timeUntil(date) {
    const diff = new Date(date) - new Date();
    if (diff < 0) return 'Past';
    const days    = Math.floor(diff / 86400000);
    const hours   = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (days > 0)    return `in ${days}d ${hours}h`;
    if (hours > 0)   return `in ${hours}h ${minutes}m`;
    if (minutes > 0) return `in ${minutes}m`;
    return 'Now';
}

export default function UpcomingVisitsWidget() {
    const [visits,  setVisits]  = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const now = new Date();
        const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // next 30 days
        fetch(`${API}/calendar?start=${now.toISOString()}&end=${end.toISOString()}`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    setVisits(
                        d.data
                            .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
                            .slice(0, 5)
                    );
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return null;
    if (visits.length === 0) return null;

    return (
        <div className="card !p-0 overflow-hidden">
            {/* Card Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100/80">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                        <CalendarClock className="w-4 h-4 text-brand-blue" />
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Upcoming Visits</h3>
                </div>
                <Link
                    to="/calendar"
                    className="text-xs font-bold text-brand-blue hover:underline flex items-center gap-1"
                >
                    View Calendar <ChevronRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100/80">
                {visits.map(v => {
                    const d = new Date(v.scheduledDate);
                    const isToday = new Date().toDateString() === d.toDateString();
                    return (
                        <Link
                            key={v._id}
                            to="/calendar"
                            className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/80 transition-all group"
                        >
                            {/* Date badge */}
                            <div className={`shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-xl text-center
                                ${isToday ? 'bg-brand-blue text-white shadow-md' : 'bg-slate-100 text-slate-700'}`}>
                                <span className="text-[10px] font-bold uppercase leading-none">
                                    {d.toLocaleString('en-IN', { month: 'short' })}
                                </span>
                                <span className="text-sm font-extrabold leading-none">
                                    {d.getDate()}
                                </span>
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-brand-blue transition-colors">
                                    {v.title}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    {v.location ? ` · ${v.location}` : ''}
                                </p>
                            </div>

                            {/* Time until */}
                            <div className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full
                                ${isToday ? 'bg-brand-blue/10 text-brand-blue' : 'bg-slate-100 text-slate-500'}`}>
                                {timeUntil(v.scheduledDate)}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
