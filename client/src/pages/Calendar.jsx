import React, { useState, useEffect, useCallback } from 'react';
import {
    ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon,
    Clock, MapPin, Bell, X, Pencil, Trash2, AlertCircle, CheckCircle2,
    Link2, Unlink, ExternalLink, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ScheduleModal from '../components/ScheduleModal';

const API = import.meta.env.VITE_API_URL || '/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
}

function isSameDay(a, b) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

const REMINDER_LABELS = {
    0:    'No reminder',
    15:   '15 mins before',
    60:   '1 hour before',
    180:  '3 hours before',
    1440: '1 day before',
    2880: '2 days before',
};

const TYPE_BADGE = {
    generic:    { label: 'B2B', cls: 'bg-blue-50 text-blue-700 border-blue-100' },
    home_visit: { label: 'Home', cls: 'bg-orange-50 text-orange-700 border-orange-100' },
};

// Google Calendar icon (inline SVG)
const GoogleIcon = ({ className = 'w-4 h-4' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M21.35 11.1h-9.18v2.73h5.51c-.24 1.27-.97 2.34-2.05 3.06l3.32 2.58c1.94-1.79 3.06-4.42 3.06-7.53 0-.65-.06-1.27-.17-1.84z" fill="#4285F4"/>
        <path d="M12.17 22c2.77 0 5.1-.92 6.8-2.49l-3.32-2.58c-.92.62-2.1.99-3.48.99-2.68 0-4.95-1.81-5.76-4.24l-3.42 2.65C4.73 19.78 8.17 22 12.17 22z" fill="#34A853"/>
        <path d="M6.41 14.17A5.9 5.9 0 016.07 12c0-.76.13-1.5.34-2.17L3 7.18A10 10 0 002 12c0 1.62.39 3.15 1.08 4.5l3.33-2.33z" fill="#FBBC05"/>
        <path d="M12.17 5.83c1.51 0 2.87.52 3.94 1.54l2.96-2.96C17.25 2.77 14.92 2 12.17 2 8.17 2 4.73 4.22 3 7.18l3.41 2.65c.81-2.43 3.08-4 5.76-4z" fill="#EA4335"/>
    </svg>
);

export default function Calendar() {
    const { user } = useAuth();
    const today = new Date();

    const [viewYear,  setViewYear]  = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [schedules, setSchedules] = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState(null);

    // Modal state
    const [modalOpen,    setModalOpen]    = useState(false);
    const [editSchedule, setEditSchedule] = useState(null);
    const [defaultDate,  setDefaultDate]  = useState(null);

    // Detail drawer
    const [drawerItem, setDrawerItem] = useState(null);

    // Reminder notification banner
    const [remindersFound, setRemindersFound] = useState(0);

    // ─── Google Calendar state ─────────────────────────────────────────
    const [gcalConnected,   setGcalConnected]   = useState(false);
    const [gcalEmail,       setGcalEmail]       = useState(null);
    const [gcalEvents,      setGcalEvents]      = useState([]);
    const [gcalLoading,     setGcalLoading]     = useState(false);
    const [showGoogleEvents, setShowGoogleEvents] = useState(true);
    const [gcalBanner,      setGcalBanner]      = useState(null); // 'connected' | 'error'

    // Check for ?gcal= query param on mount (after OAuth redirect)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const gcalParam = params.get('gcal');
        if (gcalParam === 'connected') {
            setGcalBanner('connected');
            // clean URL
            window.history.replaceState({}, '', window.location.pathname);
        } else if (gcalParam === 'error') {
            setGcalBanner('error');
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    // Fetch Google Calendar connection status
    const fetchGcalStatus = useCallback(async () => {
        try {
            const res = await fetch(`${API}/google-calendar/status`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setGcalConnected(data.connected);
                setGcalEmail(data.email);
            }
        } catch { /* non-critical */ }
    }, []);

    // Fetch Google Calendar events for the current month
    const fetchGcalEvents = useCallback(async () => {
        if (!gcalConnected) return;
        setGcalLoading(true);
        try {
            const start = new Date(viewYear, viewMonth, 1).toISOString();
            const end   = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59).toISOString();
            const res   = await fetch(`${API}/google-calendar/events?start=${start}&end=${end}`, { credentials: 'include' });
            const data  = await res.json();
            if (data.success) setGcalEvents(data.data);
        } catch {
            console.error('Failed to load Google Calendar events');
        } finally {
            setGcalLoading(false);
        }
    }, [gcalConnected, viewYear, viewMonth]);

    useEffect(() => { fetchGcalStatus(); }, [fetchGcalStatus]);
    useEffect(() => { fetchGcalEvents(); }, [fetchGcalEvents]);

    const handleConnectGoogle = async () => {
        try {
            const res  = await fetch(`${API}/google-calendar/auth-url`, { credentials: 'include' });
            const data = await res.json();
            if (data.success && data.url) {
                window.location.href = data.url;
            }
        } catch {
            alert('Failed to start Google Calendar connection. Please try again.');
        }
    };

    const handleDisconnectGoogle = async () => {
        if (!window.confirm('Disconnect Google Calendar? Your synced events will remain on Google but new visits won\'t sync.')) return;
        try {
            await fetch(`${API}/google-calendar/disconnect`, { method: 'POST', credentials: 'include' });
            setGcalConnected(false);
            setGcalEmail(null);
            setGcalEvents([]);
        } catch {
            alert('Failed to disconnect. Please try again.');
        }
    };

    // ─── Local schedules ───────────────────────────────────────────────
    const fetchSchedules = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const start = new Date(viewYear, viewMonth, 1).toISOString();
            const end   = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59).toISOString();
            const res   = await fetch(`${API}/calendar?start=${start}&end=${end}`, { credentials: 'include' });
            const data  = await res.json();
            if (data.success) setSchedules(data.data);
            else setError(data.message);
        } catch {
            setError('Failed to load scheduled visits');
        } finally {
            setLoading(false);
        }
    }, [viewYear, viewMonth]);

    // Trigger past-due reminders on mount
    useEffect(() => {
        fetch(`${API}/calendar/reminders`, { method: 'POST', credentials: 'include' })
            .then(r => r.json())
            .then(d => { if (d.success && d.fired > 0) setRemindersFound(d.fired); })
            .catch(() => {});
    }, []);

    useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

    // Navigation
    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };
    const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

    // Build calendar grid
    const daysInMonth  = getDaysInMonth(viewYear, viewMonth);
    const firstWeekday = getFirstDayOfMonth(viewYear, viewMonth);
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));

    // Merge local schedules + Google Calendar events for a given day
    const schedulesForDay = (date) =>
        schedules.filter(s => isSameDay(new Date(s.scheduledDate), date));

    const googleEventsForDay = (date) => {
        if (!showGoogleEvents || !gcalConnected) return [];
        return gcalEvents.filter(e => {
            const eventDate = new Date(e.start);
            return isSameDay(eventDate, date);
        });
    };

    const handleDayClick = (date) => {
        setDefaultDate(date);
        setEditSchedule(null);
        setModalOpen(true);
    };

    const handleEditClick = (item) => {
        setEditSchedule(item);
        setDefaultDate(new Date(item.scheduledDate));
        setDrawerItem(null);
        setModalOpen(true);
    };

    const handleDeleteClick = async (item) => {
        if (!window.confirm(`Delete "${item.title}"?`)) return;
        try {
            await fetch(`${API}/calendar/${item._id}`, { method: 'DELETE', credentials: 'include' });
            setDrawerItem(null);
            fetchSchedules();
        } catch {
            alert('Failed to delete. Please try again.');
        }
    };

    const handleModalSave = () => {
        setModalOpen(false);
        setEditSchedule(null);
        fetchSchedules();
        if (gcalConnected) fetchGcalEvents();
    };

    const formatTime = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const formatFull = (iso) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    return (
        <div className="page-enter">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <span className="w-10 h-10 rounded-2xl bg-brand-blue/10 flex items-center justify-center">
                            <CalendarIcon className="w-5 h-5 text-brand-blue" />
                        </span>
                        Visit Calendar
                    </h1>
                    <p className="page-subtitle">Schedule upcoming visits and set reminders</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Google Calendar connect/disconnect */}
                    {gcalConnected ? (
                        <button
                            onClick={handleDisconnectGoogle}
                            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                            title={`Connected: ${gcalEmail || 'Google Calendar'}`}
                        >
                            <GoogleIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">{gcalEmail || 'Connected'}</span>
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                        </button>
                    ) : (
                        <button
                            onClick={handleConnectGoogle}
                            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all"
                        >
                            <GoogleIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Connect Google Calendar</span>
                            <Link2 className="w-3.5 h-3.5 sm:hidden" />
                        </button>
                    )}
                    <button
                        className="btn-primary"
                        onClick={() => { setEditSchedule(null); setDefaultDate(new Date()); setModalOpen(true); }}
                    >
                        <Plus className="w-4 h-4" /> Schedule Visit
                    </button>
                </div>
            </div>

            {/* Google Calendar connection banner */}
            {gcalBanner === 'connected' && (
                <div className="mb-4 flex items-center gap-3 px-5 py-3 rounded-2xl bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span>Google Calendar connected successfully! Your events will now appear on the calendar.</span>
                    <button onClick={() => setGcalBanner(null)} className="ml-auto text-green-500 hover:text-green-700">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
            {gcalBanner === 'error' && (
                <div className="mb-4 flex items-center gap-3 px-5 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Failed to connect Google Calendar. Please try again.</span>
                    <button onClick={() => setGcalBanner(null)} className="ml-auto text-red-500 hover:text-red-700">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Reminder Banner */}
            {remindersFound > 0 && (
                <div className="mb-4 flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
                    <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                        {remindersFound} upcoming visit reminder{remindersFound > 1 ? 's' : ''} — check your notification bell.
                    </span>
                    <button onClick={() => setRemindersFound(0)} className="ml-auto text-amber-500 hover:text-amber-700">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Calendar Grid */}
                <div className="xl:col-span-3 card !p-0 overflow-hidden">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <button onClick={prevMonth} className="btn-ghost !px-2 !py-2">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-extrabold text-slate-900">
                                {MONTHS[viewMonth]} {viewYear}
                            </h2>
                            <button onClick={goToday} className="text-xs font-bold text-brand-blue hover:underline">Today</button>
                            {gcalConnected && (
                                <>
                                    <span className="w-px h-4 bg-slate-200" />
                                    <button
                                        onClick={() => setShowGoogleEvents(v => !v)}
                                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                                            showGoogleEvents
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-slate-50 text-slate-400 border-slate-200'
                                        }`}
                                    >
                                        <GoogleIcon className="w-3 h-3" />
                                        Google
                                    </button>
                                    <button
                                        onClick={fetchGcalEvents}
                                        className="text-slate-400 hover:text-brand-blue transition-colors"
                                        title="Refresh Google events"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${gcalLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                </>
                            )}
                        </div>
                        <button onClick={nextMonth} className="btn-ghost !px-2 !py-2">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 border-b border-slate-100">
                        {DAYS.map(d => (
                            <div key={d} className="text-center py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Date Grid */}
                    {loading ? (
                        <div className="flex items-center justify-center py-24 text-slate-400 text-sm gap-2">
                            <div className="w-5 h-5 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
                            Loading…
                        </div>
                    ) : (
                        <div className="grid grid-cols-7">
                            {cells.map((date, idx) => {
                                if (!date) return (
                                    <div key={`empty-${idx}`} className="min-h-[90px] border-b border-r border-slate-50 bg-slate-50/40" />
                                );
                                const daySchedules = schedulesForDay(date);
                                const dayGoogleEvents = googleEventsForDay(date);
                                const totalItems = daySchedules.length + dayGoogleEvents.length;
                                const isToday    = isSameDay(date, today);
                                const isPast     = date < today && !isToday;
                                const isLastCol  = (idx + 1) % 7 === 0;
                                return (
                                    <div
                                        key={date.toISOString()}
                                        onClick={() => handleDayClick(date)}
                                        className={`
                                            min-h-[90px] p-2 border-b border-r border-slate-100 cursor-pointer
                                            transition-all duration-150 hover:bg-blue-50/40 relative group
                                            ${isLastCol ? 'border-r-0' : ''}
                                            ${isPast ? 'bg-slate-50/60' : ''}
                                        `}
                                    >
                                        {/* Date number */}
                                        <div className={`
                                            inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-bold mb-1
                                            ${isToday ? 'bg-brand-blue text-white shadow-md' : 'text-slate-700 group-hover:bg-brand-blue/10'}
                                        `}>
                                            {date.getDate()}
                                        </div>

                                        {/* Events */}
                                        <div className="space-y-0.5">
                                            {/* Local schedules */}
                                            {daySchedules.slice(0, showGoogleEvents && dayGoogleEvents.length ? 2 : 3).map(s => (
                                                <div
                                                    key={s._id}
                                                    onClick={e => { e.stopPropagation(); setDrawerItem(s); }}
                                                    className={`
                                                        text-[10px] font-semibold px-1.5 py-0.5 rounded-md cursor-pointer truncate
                                                        transition-all hover:scale-[1.02] border
                                                        ${s.visitType === 'home_visit'
                                                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                                                            : 'bg-blue-50 text-blue-700 border-blue-200'}
                                                    `}
                                                >
                                                    {formatTime(s.scheduledDate)} {s.title}
                                                </div>
                                            ))}
                                            {/* Google Calendar events */}
                                            {dayGoogleEvents.slice(0, 2).map(e => (
                                                <div
                                                    key={e.id}
                                                    onClick={ev => { ev.stopPropagation(); setDrawerItem({ ...e, _isGoogle: true }); }}
                                                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md cursor-pointer truncate
                                                        transition-all hover:scale-[1.02] border bg-emerald-50 text-emerald-700 border-emerald-200"
                                                >
                                                    {formatTime(e.start)} {e.title}
                                                </div>
                                            ))}
                                            {totalItems > 3 && (
                                                <div className="text-[10px] text-slate-400 font-semibold pl-1">
                                                    +{totalItems - 3} more
                                                </div>
                                            )}
                                        </div>

                                        {/* Add hover hint */}
                                        <Plus className="w-3.5 h-3.5 text-slate-300 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 px-6 py-4 text-red-600 text-sm">
                            <AlertCircle className="w-4 h-4" /> {error}
                        </div>
                    )}
                </div>

                {/* Right Panel — Detail Drawer OR Upcoming */}
                <div className="xl:col-span-1 space-y-4">
                    {drawerItem ? (
                        drawerItem._isGoogle ? (
                            <GoogleEventDrawer item={drawerItem} onClose={() => setDrawerItem(null)} formatFull={formatFull} />
                        ) : (
                            <div className="card !p-5 animate-[fadeIn_0.2s_ease]">
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="font-extrabold text-slate-900 text-base leading-tight pr-2">{drawerItem.title}</h3>
                                    <button onClick={() => setDrawerItem(null)} className="text-slate-400 hover:text-slate-600 shrink-0">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-2.5 text-sm text-slate-600 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                        {formatFull(drawerItem.scheduledDate)}
                                    </div>
                                    {drawerItem.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                            {drawerItem.location}
                                        </div>
                                    )}
                                    {drawerItem.reminderOffset > 0 && (
                                        <div className="flex items-center gap-2">
                                            <Bell className="w-4 h-4 text-slate-400 shrink-0" />
                                            {REMINDER_LABELS[drawerItem.reminderOffset]}
                                            {drawerItem.reminderSent && (
                                                <span className="ml-auto flex items-center gap-1 text-[10px] text-green-600 font-bold">
                                                    <CheckCircle2 className="w-3 h-3" /> Sent
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <span className={`badge border text-[10px] ${TYPE_BADGE[drawerItem.visitType]?.cls}`}>
                                            {TYPE_BADGE[drawerItem.visitType]?.label || drawerItem.visitType}
                                        </span>
                                        {drawerItem.googleCalendarEventId && (
                                            <span className="badge border text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                                                <GoogleIcon className="w-3 h-3" /> Synced
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {drawerItem.notes && (
                                    <p className="text-sm text-slate-500 bg-slate-50/80 rounded-xl px-3 py-2 mb-4 leading-relaxed">
                                        {drawerItem.notes}
                                    </p>
                                )}

                                <div className="flex gap-2">
                                    <button onClick={() => handleEditClick(drawerItem)} className="btn-outline flex-1 !py-2 !text-xs">
                                        <Pencil className="w-3.5 h-3.5" /> Edit
                                    </button>
                                    <button onClick={() => handleDeleteClick(drawerItem)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 text-xs font-semibold rounded-xl hover:bg-red-50 transition-all">
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            </div>
                        )
                    ) : (
                        <UpcomingPanel schedules={schedules} gcalEvents={showGoogleEvents ? gcalEvents : []} today={today} onSelect={setDrawerItem} formatFull={formatFull} />
                    )}
                </div>
            </div>

            {/* Schedule Modal */}
            {modalOpen && (
                <ScheduleModal
                    defaultDate={defaultDate}
                    editData={editSchedule}
                    onClose={() => { setModalOpen(false); setEditSchedule(null); }}
                    onSaved={handleModalSave}
                    gcalConnected={gcalConnected}
                />
            )}
        </div>
    );
}

// ─── Google Event Drawer ────────────────────────────────────────────────────────
function GoogleEventDrawer({ item, onClose, formatFull }) {
    return (
        <div className="card !p-5 animate-[fadeIn_0.2s_ease]">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                    <h3 className="font-extrabold text-slate-900 text-base leading-tight pr-2">{item.title}</h3>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-2.5 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    {formatFull(item.start)}
                </div>
                {item.location && (
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        {item.location}
                    </div>
                )}
                <div>
                    <span className="badge border text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        Google Calendar
                    </span>
                </div>
            </div>

            {item.description && (
                <p className="text-sm text-slate-500 bg-slate-50/80 rounded-xl px-3 py-2 mb-4 leading-relaxed">
                    {item.description}
                </p>
            )}

            {item.htmlLink && (
                <a
                    href={item.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline w-full !py-2 !text-xs justify-center"
                >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in Google Calendar
                </a>
            )}
        </div>
    );
}

// ─── Upcoming Panel (right side when no drawer is open) ───────────────────────
function UpcomingPanel({ schedules, gcalEvents, today, onSelect, formatFull }) {
    const upcoming = [
        ...schedules
            .filter(s => new Date(s.scheduledDate) >= today)
            .map(s => ({ ...s, _sortDate: new Date(s.scheduledDate), _isGoogle: false })),
        ...gcalEvents
            .filter(e => new Date(e.start) >= today)
            .map(e => ({ ...e, _sortDate: new Date(e.start), _isGoogle: true }))
    ]
        .sort((a, b) => a._sortDate - b._sortDate)
        .slice(0, 8);

    return (
        <div className="card !p-5">
            <h3 className="font-extrabold text-slate-900 text-sm mb-4">This Month's Upcoming</h3>
            {upcoming.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No upcoming visits</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {upcoming.map(s => (
                        <button
                            key={s._isGoogle ? s.id : s._id}
                            onClick={() => onSelect(s)}
                            className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
                        >
                            <div className="flex items-start gap-2.5">
                                <div className={`shrink-0 mt-0.5 w-2 h-2 rounded-full ${
                                    s._isGoogle
                                        ? 'bg-emerald-400'
                                        : s.visitType === 'home_visit' ? 'bg-orange-400' : 'bg-brand-blue'
                                }`} />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
                                        {s.title}
                                        {s._isGoogle && <GoogleIcon className="w-3 h-3 shrink-0" />}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        {formatFull(s._isGoogle ? s.start : s.scheduledDate)}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
