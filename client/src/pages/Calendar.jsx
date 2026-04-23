import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, Clock, MapPin,
    Bell, X, Pencil, Trash2, AlertCircle, CheckCircle2, Link2, Unlink,
    ExternalLink, RefreshCw, Filter, List, LayoutGrid, Rows, Building2,
    Users, IndianRupee, Copy, XCircle, ChevronDown, Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PlanModal from '../components/PlanModal';

const API = import.meta.env.VITE_API_URL || '/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

const STATUS_STYLE = {
    pending:   'bg-blue-50 border-blue-200 text-blue-800',
    attended:  'bg-green-50 border-green-200 text-green-800',
    missed:    'bg-red-50 border-red-200 text-red-800',
    cancelled: 'bg-gray-50 border-gray-200 text-gray-500 line-through opacity-60',
};

const PLAN_STATUS_DOT = {
    draft:       'bg-gray-400',
    scheduled:   'bg-blue-500',
    in_progress: 'bg-yellow-500',
    completed:   'bg-green-500',
    cancelled:   'bg-red-400',
    closed:      'bg-gray-600',
};

const VIEWS = ['month', 'week', 'day', 'agenda'];

// ── Helpers ──────────────────────────────────────────────────────────────────
function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

function startOfWeek(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
}

function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function fmtTime(d) {
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDate(d) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function initials(name = '') {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function savedFilters() {
    try { return JSON.parse(localStorage.getItem('cal_filters') || '{}'); } catch { return {}; }
}

// ── EventPill ─────────────────────────────────────────────────────────────────
function EventPill({ schedule, compact = false, onClick }) {
    const plan = schedule.visitPlanRef;
    const agent = schedule.agentId;
    const status = schedule.status || 'pending';
    const cls = STATUS_STYLE[status] || STATUS_STYLE.pending;
    const photoStatus = schedule.clientPhoto?.verificationStatus;

    return (
        <div
            className={`rounded border px-1.5 py-0.5 text-xs cursor-pointer hover:shadow-sm transition-shadow ${cls} ${compact ? 'truncate' : ''}`}
            onClick={e => { e.stopPropagation(); onClick(schedule); }}
            title={`${schedule.title}${agent ? ' · ' + agent.name : ''}`}
        >
            <div className="flex items-center gap-1 min-w-0">
                {plan && (
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PLAN_STATUS_DOT[plan.status] || 'bg-gray-400'}`} />
                )}
                <span className="truncate font-medium">{schedule.title}</span>
                {agent && !compact && (
                    <span className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[9px] flex items-center justify-center font-bold">
                        {initials(agent.name)}
                    </span>
                )}
                {photoStatus === 'pending' && (
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400" title="Photo pending verification" />
                )}
            </div>
            {!compact && (
                <div className="text-[10px] opacity-70 mt-0.5">{fmtTime(schedule.scheduledDate)}</div>
            )}
        </div>
    );
}

// ── MonthView ────────────────────────────────────────────────────────────────
function MonthView({ year, month, schedules, today, onDayClick, onEventClick }) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    const schedulesForDay = (date) =>
        schedules.filter(s => sameDay(new Date(s.scheduledDate), date));

    return (
        <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-7 border-b border-gray-200">
                {DAYS.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 flex-1">
                {cells.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} className="h-28 border-b border-r border-gray-100 bg-gray-50/40" />;
                    const daySchedules = schedulesForDay(date);
                    const isToday = sameDay(date, today);
                    return (
                        <div
                            key={date.toISOString()}
                            className={`h-28 border-b border-r border-gray-100 p-1 overflow-hidden cursor-pointer hover:bg-blue-50/30 transition-colors
                                ${isToday ? 'bg-blue-50/50' : ''}`}
                            onClick={() => onDayClick(date)}
                        >
                            <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1
                                ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                                {date.getDate()}
                            </div>
                            <div className="space-y-0.5">
                                {daySchedules.slice(0, 3).map(s => (
                                    <EventPill key={s._id} schedule={s} compact onClick={onEventClick} />
                                ))}
                                {daySchedules.length > 3 && (
                                    <div className="text-[10px] text-gray-500 pl-1">+{daySchedules.length - 3} more</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── WeekView ─────────────────────────────────────────────────────────────────
function WeekView({ weekStart, schedules, today, onSlotClick, onEventClick }) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
        <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-7 border-b border-gray-200">
                {days.map(d => (
                    <div key={d.toISOString()} className={`text-center py-2 text-xs font-semibold
                        ${sameDay(d, today) ? 'text-blue-600' : 'text-gray-500'}`}>
                        <div>{DAYS[d.getDay()]}</div>
                        <div className={`w-7 h-7 mx-auto flex items-center justify-center rounded-full
                            ${sameDay(d, today) ? 'bg-blue-600 text-white' : ''}`}>
                            {d.getDate()}
                        </div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {days.map(d => {
                    const dayS = schedules.filter(s => sameDay(new Date(s.scheduledDate), d));
                    return (
                        <div
                            key={d.toISOString()}
                            className={`min-h-40 border-r border-gray-100 p-1 space-y-1 cursor-pointer hover:bg-blue-50/20
                                ${sameDay(d, today) ? 'bg-blue-50/30' : ''}`}
                            onClick={() => onSlotClick(d)}
                        >
                            {dayS.map(s => <EventPill key={s._id} schedule={s} onClick={onEventClick} />)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── DayView ──────────────────────────────────────────────────────────────────
function DayView({ date, schedules, onEventClick, onAddClick }) {
    const dayS = schedules.filter(s => sameDay(new Date(s.scheduledDate), date));
    return (
        <div className="flex-1 overflow-auto p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">
                    {date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => onAddClick(date)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                    <Plus className="w-4 h-4" /> Schedule visit
                </button>
            </div>
            {dayS.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <CalIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No visits scheduled for this day</p>
                    <button onClick={() => onAddClick(date)} className="mt-3 text-blue-600 text-sm hover:underline">
                        Create a visit plan
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {dayS.map(s => (
                        <div key={s._id} onClick={() => onEventClick(s)}
                            className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:shadow-sm cursor-pointer transition-shadow bg-white">
                            <div className="text-xs text-gray-500 pt-0.5 w-16 flex-shrink-0">
                                {fmtTime(s.scheduledDate)}
                                {s.scheduledEndDate && <><br />{fmtTime(s.scheduledEndDate)}</>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-800">{s.title}</div>
                                {s.agentId && <div className="text-xs text-gray-500">{s.agentId.name}</div>}
                                {s.location && <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{s.location}</div>}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[s.status || 'pending']}`}>
                                {s.status || 'pending'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── AgendaView ────────────────────────────────────────────────────────────────
function AgendaView({ schedules, onEventClick, onAddClick }) {
    const groups = {};
    schedules.forEach(s => {
        const key = new Date(s.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
    });
    const sortedKeys = Object.keys(groups).sort((a, b) =>
        new Date(groups[a][0].scheduledDate) - new Date(groups[b][0].scheduledDate)
    );

    if (sortedKeys.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-400 p-8">
                <CalIcon className="w-12 h-12 opacity-30" />
                <p className="text-sm">No upcoming visits in this period.</p>
                <button onClick={() => onAddClick(new Date())} className="text-blue-600 text-sm hover:underline">
                    Schedule a visit to start claiming
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto divide-y divide-gray-100">
            {sortedKeys.map(key => (
                <div key={key} className="px-4 py-3">
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{key}</div>
                    <div className="space-y-1.5">
                        {groups[key].map(s => (
                            <div key={s._id} onClick={() => onEventClick(s)}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                <div className="text-xs text-gray-400 w-14">{fmtTime(s.scheduledDate)}</div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-gray-800">{s.title}</span>
                                    {s.agentId && <span className="text-xs text-gray-500 ml-2">{s.agentId.name}</span>}
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[s.status || 'pending']}`}>
                                    {s.status || 'pending'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Schedule Drawer ───────────────────────────────────────────────────────────
function ScheduleDrawer({ schedule, balance, onClose, onEdit, onDelete }) {
    if (!schedule) return null;
    const plan = schedule.visitPlanRef;

    return (
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800 truncate">{schedule.title}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="p-4 space-y-3 text-sm flex-1">
                <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{fmtDate(schedule.scheduledDate)} · {fmtTime(schedule.scheduledDate)}
                        {schedule.scheduledEndDate && ` – ${fmtTime(schedule.scheduledEndDate)}`}
                    </span>
                </div>
                {schedule.location && (
                    <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{schedule.location}</span>
                    </div>
                )}
                {schedule.agentId && (
                    <div className="flex items-center gap-2 text-gray-600">
                        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{schedule.agentId.name}{schedule.agentId.city ? ` · ${schedule.agentId.city}` : ''}</span>
                    </div>
                )}

                {/* Client photo status */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Client photo:</span>
                    {!schedule.clientPhoto?.uploadRef ? (
                        <span className="text-xs text-orange-600 font-medium">Not uploaded</span>
                    ) : (
                        <span className={`text-xs font-medium ${
                            schedule.clientPhoto.verificationStatus === 'verified' ? 'text-green-600' :
                            schedule.clientPhoto.verificationStatus === 'rejected' ? 'text-red-600' :
                            'text-yellow-600'
                        }`}>
                            {schedule.clientPhoto.verificationStatus}
                        </span>
                    )}
                </div>

                {plan && (
                    <div className="rounded-lg border border-gray-200 p-3 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${PLAN_STATUS_DOT[plan.status]}`} />
                            <span className="font-medium text-gray-700">{plan.title}</span>
                        </div>
                        <div className="text-xs text-gray-500">{plan.city} · {plan.planType === 'multi_same_city' ? 'Multi-visit' : 'Single'}</div>
                        {balance && (
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-500">Balance</span>
                                    <span className={`font-medium ${balance.spentAmount > balance.grantedAmount ? 'text-red-600' : 'text-green-700'}`}>
                                        ₹{((balance.grantedAmount || 0) - (balance.spentAmount || 0)).toLocaleString('en-IN')} left
                                    </span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${
                                        (balance.spentAmount / balance.grantedAmount) > 1 ? 'bg-red-500' :
                                        (balance.spentAmount / balance.grantedAmount) > 0.7 ? 'bg-yellow-500' :
                                        'bg-green-500'
                                    }`} style={{ width: `${Math.min(100, ((balance.spentAmount || 0) / (balance.grantedAmount || 1)) * 100)}%` }} />
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                    ₹{(balance.spentAmount || 0).toLocaleString('en-IN')} / ₹{(balance.grantedAmount || 0).toLocaleString('en-IN')} granted
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {schedule.notes && (
                    <p className="text-xs text-gray-500 italic">{schedule.notes}</p>
                )}
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2">
                <button onClick={() => onEdit(schedule)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm text-blue-600 hover:bg-blue-50 py-1.5 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => onDelete(schedule)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm text-red-500 hover:bg-red-50 py-1.5 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
            </div>
        </div>
    );
}

// ── Filter Bar ────────────────────────────────────────────────────────────────
function FilterBar({ filters, onChange, agents }) {
    return (
        <div className="flex items-center gap-2 flex-wrap bg-gray-50 border-b border-gray-200 px-4 py-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                value={filters.agent || ''} onChange={e => onChange({ ...filters, agent: e.target.value || undefined })}>
                <option value="">All agents</option>
                {agents.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
            <select className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                value={filters.status || ''} onChange={e => onChange({ ...filters, status: e.target.value || undefined })}>
                <option value="">All statuses</option>
                {['pending','attended','missed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                value={filters.planStatus || ''} onChange={e => onChange({ ...filters, planStatus: e.target.value || undefined })}>
                <option value="">All plan statuses</option>
                {['draft','scheduled','in_progress','completed','cancelled','closed'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={!!filters.hasOpenClaim}
                    onChange={e => onChange({ ...filters, hasOpenClaim: e.target.checked || undefined })} />
                Open claim
            </label>
            {Object.values(filters).some(Boolean) && (
                <button onClick={() => onChange({})}
                    className="text-xs text-red-500 hover:text-red-700 ml-1">Clear</button>
            )}
        </div>
    );
}

// ── Main Calendar Page ────────────────────────────────────────────────────────
export default function Calendar() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const today = new Date();

    // View state from URL
    const viewParam = searchParams.get('view') || 'month';
    const dateParam = searchParams.get('date');
    const [view, setView] = useState(VIEWS.includes(viewParam) ? viewParam : 'month');
    const [curDate, setCurDate] = useState(dateParam ? new Date(dateParam) : today);

    const [schedules, setSchedules] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState(savedFilters);

    const [drawerSchedule, setDrawerSchedule] = useState(null);
    const [drawerBalance, setDrawerBalance] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    const [planModal, setPlanModal] = useState({ open: false, defaultDate: null });

    // Google Calendar State
    const [googleConnected, setGoogleConnected] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    // Derived date ranges
    const viewYear = curDate.getFullYear();
    const viewMonth = curDate.getMonth();
    const weekStart = startOfWeek(curDate);

    // ── Persist view + date to URL ──────────────────────────────────────────
    useEffect(() => {
        const d = curDate.toISOString().slice(0, 10);
        setSearchParams({ view, date: d }, { replace: true });
    }, [view, curDate]);

    // ── Persist filters to localStorage ────────────────────────────────────
    useEffect(() => {
        localStorage.setItem('cal_filters', JSON.stringify(filters));
    }, [filters]);

    // ── Check Google Calendar Status ────────────────────────────────────────
    useEffect(() => {
        const fetchGcalStatus = async () => {
            try {
                const res = await fetch(`${API}/google-calendar/status`, { credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    setGoogleConnected(data.data.connected);
                }
            } catch (e) { }
        };
        fetchGcalStatus();

        // Handle gcal callback params
        const gcalStatus = searchParams.get('gcal');
        if (gcalStatus === 'connected') {
            setToastMessage({ type: 'success', text: 'Successfully connected to Google Calendar!' });
            searchParams.delete('gcal');
            setSearchParams(searchParams, { replace: true });
        } else if (gcalStatus === 'error') {
            setToastMessage({ type: 'error', text: 'Failed to connect to Google Calendar.' });
            searchParams.delete('gcal');
            setSearchParams(searchParams, { replace: true });
        }

        if (gcalStatus) {
            setTimeout(() => setToastMessage(null), 3000);
        }
    }, []);

    // ── Keyboard shortcuts ──────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            switch (e.key) {
                case 't': case 'T': setCurDate(new Date()); break;
                case 'n': case 'N': setPlanModal({ open: true, defaultDate: curDate }); break;
                case 'ArrowLeft':  navigate(-1); break;
                case 'ArrowRight': navigate(1); break;
                case '1': setView('month'); break;
                case '2': setView('week'); break;
                case '3': setView('day'); break;
                case '4': setView('agenda'); break;
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [curDate]);

    // ── Fetch ───────────────────────────────────────────────────────────────
    const fetchSchedules = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            let start, end;
            if (view === 'month') {
                start = new Date(viewYear, viewMonth, 1);
                end = new Date(viewYear, viewMonth + 1, 0);
            } else if (view === 'week') {
                start = weekStart;
                end = addDays(weekStart, 6);
            } else if (view === 'day') {
                start = new Date(curDate); start.setHours(0,0,0,0);
                end = new Date(curDate); end.setHours(23,59,59,999);
            } else { // agenda — next 30 days
                start = new Date(); start.setHours(0,0,0,0);
                end = addDays(start, 30);
            }

            const params = new URLSearchParams({
                start: start.toISOString(),
                end: end.toISOString()
            });
            if (filters.agent) params.set('agent', filters.agent);
            if (filters.planStatus) params.set('planStatus', filters.planStatus);
            if (filters.hasOpenClaim) params.set('hasOpenClaim', 'true');

            const res = await fetch(`${API}/calendar?${params}`, { credentials: 'include' });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            let list = data.data;
            if (filters.status) list = list.filter(s => s.status === filters.status);
            setSchedules(list);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [view, viewYear, viewMonth, weekStart.toISOString(), curDate.toISOString(), filters]);

    useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

    useEffect(() => {
        fetch(`${API}/agents?active=true`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => { if (d.success) setAgents(d.data || []); })
            .catch(() => {});
    }, []);

    // ── Balance for drawer ──────────────────────────────────────────────────
    useEffect(() => {
        if (!drawerSchedule?.visitPlanRef?._id) { setDrawerBalance(null); return; }
        fetch(`${API}/visit-plans/${drawerSchedule.visitPlanRef._id}/balance`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => setDrawerBalance(d.data || null))
            .catch(() => setDrawerBalance(null));
    }, [drawerSchedule]);

    // ── Navigation ──────────────────────────────────────────────────────────
    const navigate_cal = (dir) => {
        const d = new Date(curDate);
        if (view === 'month') d.setMonth(d.getMonth() + dir);
        else if (view === 'week') d.setDate(d.getDate() + dir * 7);
        else d.setDate(d.getDate() + dir);
        setCurDate(d);
    };

    const headerLabel = () => {
        if (view === 'month') return `${MONTHS[viewMonth]} ${viewYear}`;
        if (view === 'week') {
            const ws = weekStart;
            const we = addDays(ws, 6);
            return `${fmtDate(ws)} – ${fmtDate(we)}`;
        }
        if (view === 'day') return curDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        return 'Upcoming 30 days';
    };

    // ── Delete handler ──────────────────────────────────────────────────────
    const handleDelete = async (schedule) => {
        if (!window.confirm(`Delete "${schedule.title}"?`)) return;
        try {
            const r = await fetch(`${API}/calendar/${schedule._id}`, { method: 'DELETE', credentials: 'include' });
            const d = await r.json();
            if (!d.success) throw new Error(d.message);
            setDrawerSchedule(null);
            fetchSchedules();
        } catch (e) {
            alert(e.message);
        }
    };

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    // ── Google Calendar Toggle Handler ──────────────────────────────────────
    const handleGoogleCalendarToggle = async () => {
        if (googleConnected) {
            if (!window.confirm('Disconnect Google Calendar? Future schedules will not sync.')) return;
            try {
                const res = await fetch(`${API}/google-calendar/disconnect`, { method: 'POST', credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    setGoogleConnected(false);
                    setToastMessage({ type: 'success', text: 'Google Calendar disconnected.' });
                    setTimeout(() => setToastMessage(null), 3000);
                }
            } catch (e) {
                alert('Failed to disconnect Google Calendar');
            }
        } else {
            // Get Auth URL and redirect
            try {
                const res = await fetch(`${API}/google-calendar/auth-url`, { credentials: 'include' });
                const data = await res.json();
                if (data.success && data.url) {
                    window.location.href = data.url;
                }
            } catch (e) {
                alert('Failed to get Google Calendar authorization URL');
            }
        }
    };

    return (
        <div className="h-screen flex flex-col bg-white">
            {/* ── Toolbar ── */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-1">
                    <button onClick={() => navigate_cal(-1)} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCurDate(new Date())}
                        className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">
                        Today
                    </button>
                    <button onClick={() => navigate_cal(1)} className="p-1.5 rounded hover:bg-gray-100 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                <h2 className="font-semibold text-gray-800 text-sm min-w-0">{headerLabel()}</h2>

                <div className="ml-auto flex items-center gap-1.5">
                    {/* View switcher */}
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                        {[
                            { key: 'month', icon: LayoutGrid, label: 'Month' },
                            { key: 'week',  icon: Rows, label: 'Week' },
                            { key: 'day',   icon: CalIcon, label: 'Day' },
                            { key: 'agenda', icon: List, label: 'Agenda' },
                        ].map(({ key, icon: Icon, label }) => (
                            <button key={key} onClick={() => setView(key)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 transition-colors
                                    ${view === key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                                <Icon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Filters toggle */}
                    <button onClick={() => setShowFilters(f => !f)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors
                            ${activeFilterCount > 0 ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        <Filter className="w-3.5 h-3.5" />
                        {activeFilterCount > 0 && <span className="font-semibold">{activeFilterCount}</span>}
                    </button>

                    {/* Google Calendar Toggle */}
                    <button onClick={handleGoogleCalendarToggle}
                        className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors
                            ${googleConnected ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {googleConnected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{googleConnected ? 'GCal Connected' : 'Connect GCal'}</span>
                    </button>

                    {/* New plan */}
                    <button onClick={() => setPlanModal({ open: true, defaultDate: curDate })}
                        className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> New Plan
                    </button>

                    {loading && <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />}
                </div>
            </div>

            {/* ── Keyboard hints ── */}
            <div className="hidden md:flex items-center gap-3 px-4 py-1 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400">
                <span><kbd className="font-mono bg-gray-200 px-1 rounded">T</kbd> Today</span>
                <span><kbd className="font-mono bg-gray-200 px-1 rounded">N</kbd> New plan</span>
                <span><kbd className="font-mono bg-gray-200 px-1 rounded">1</kbd>–<kbd className="font-mono bg-gray-200 px-1 rounded">4</kbd> Views</span>
            </div>

            {/* ── Filter bar ── */}
            {showFilters && <FilterBar filters={filters} onChange={setFilters} agents={agents} />}

            {/* ── Error ── */}
            {error && (
                <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                    <button onClick={fetchSchedules} className="ml-auto text-red-600 hover:underline">Retry</button>
                </div>
            )}

            {/* ── Toast ── */}
            {toastMessage && (
                <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-medium animate-fade-in
                    ${toastMessage.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                    {toastMessage.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {toastMessage.text}
                </div>
            )}

            {/* ── Main content + drawer ── */}
            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                    {view === 'month' && (
                        <MonthView
                            year={viewYear} month={viewMonth}
                            schedules={schedules} today={today}
                            onDayClick={d => { setCurDate(d); setView('day'); }}
                            onEventClick={s => setDrawerSchedule(s)}
                        />
                    )}
                    {view === 'week' && (
                        <WeekView
                            weekStart={weekStart}
                            schedules={schedules} today={today}
                            onSlotClick={d => setPlanModal({ open: true, defaultDate: d })}
                            onEventClick={s => setDrawerSchedule(s)}
                        />
                    )}
                    {view === 'day' && (
                        <DayView
                            date={curDate}
                            schedules={schedules}
                            onEventClick={s => setDrawerSchedule(s)}
                            onAddClick={d => setPlanModal({ open: true, defaultDate: d })}
                        />
                    )}
                    {view === 'agenda' && (
                        <AgendaView
                            schedules={schedules}
                            onEventClick={s => setDrawerSchedule(s)}
                            onAddClick={d => setPlanModal({ open: true, defaultDate: d })}
                        />
                    )}
                </div>

                {/* Drawer */}
                {drawerSchedule && (
                    <ScheduleDrawer
                        schedule={drawerSchedule}
                        balance={drawerBalance}
                        onClose={() => setDrawerSchedule(null)}
                        onEdit={s => {
                            setDrawerSchedule(null);
                            if (s.visitPlanRef?._id) {
                                navigate(`/visit-plans/${s.visitPlanRef._id}`);
                            }
                        }}
                        onDelete={handleDelete}
                    />
                )}
            </div>

            {/* ── Plan creation modal ── */}
            {planModal.open && (
                <PlanModal
                    defaultDate={planModal.defaultDate}
                    onClose={() => setPlanModal({ open: false, defaultDate: null })}
                    onSaved={() => { setPlanModal({ open: false, defaultDate: null }); fetchSchedules(); }}
                />
            )}
        </div>
    );
}
