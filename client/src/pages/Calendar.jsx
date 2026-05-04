import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, Plus, Calendar as CalIcon, Clock, MapPin,
    Bell, X, Pencil, Trash2, AlertCircle, CheckCircle2, Link2, Unlink,
    ExternalLink, RefreshCw, Filter, List, LayoutGrid, Rows, Building2,
    Users, IndianRupee, Copy, XCircle, ChevronDown, Search, Wifi, WifiOff,
    Sparkles, CalendarDays
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PlanModal from '../components/PlanModal';

const API = import.meta.env.VITE_API_URL || '/api';

const DAYS        = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS      = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_CFG = {
    pending:   { bar: 'bg-amber-400',  pill: 'bg-amber-50 border-amber-200 text-amber-800',  badge: 'bg-amber-100 text-amber-700',  label: 'Pending'   },
    attended:  { bar: 'bg-emerald-500',pill: 'bg-emerald-50 border-emerald-200 text-emerald-800', badge: 'bg-emerald-100 text-emerald-700', label: 'Attended' },
    missed:    { bar: 'bg-red-400',    pill: 'bg-red-50 border-red-200 text-red-800',          badge: 'bg-red-100 text-red-700',    label: 'Missed'    },
    cancelled: { bar: 'bg-slate-300',  pill: 'bg-slate-50 border-slate-200 text-slate-400',   badge: 'bg-slate-100 text-slate-500', label: 'Cancelled' },
};

const PLAN_DOT = {
    draft:       'bg-slate-400',
    scheduled:   'bg-blue-500',
    in_progress: 'bg-amber-500',
    completed:   'bg-emerald-500',
    cancelled:   'bg-red-400',
    closed:      'bg-slate-600',
};

const VIEWS = ['month', 'week', 'day', 'agenda'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth()    === b.getMonth()    &&
        a.getDate()     === b.getDate();
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
function fmtFull(d) {
    return new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function initials(name = '') {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function savedFilters() {
    try { return JSON.parse(localStorage.getItem('cal_filters') || '{}'); } catch { return {}; }
}

// ── EventPill ─────────────────────────────────────────────────────────────────
function EventPill({ schedule, compact = false, onClick }) {
    const cfg    = STATUS_CFG[schedule.status || 'pending'] || STATUS_CFG.pending;
    const plan   = schedule.visitPlanRef;
    const agent  = schedule.agentId;
    const photo  = schedule.clientPhoto?.verificationStatus;

    return (
        <div
            className={`flex items-stretch rounded-lg overflow-hidden border cursor-pointer hover:shadow-meridian-card transition-all group ${cfg.pill}`}
            onClick={e => { e.stopPropagation(); onClick(schedule); }}
            title={`${schedule.title}${agent ? ' · ' + agent.name : ''}`}
        >
            <div className={`w-1.5 flex-shrink-0 ${cfg.bar}`} />
            <div className="flex-1 min-w-0 px-1.5 py-0.5">
                <div className="flex items-center gap-1 min-w-0">
                    {plan && (
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PLAN_DOT[plan.status] || 'bg-gray-400'}`} />
                    )}
                    <span className="text-xs font-semibold truncate leading-tight">{schedule.title}</span>
                    {photo === 'pending' && (
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400 ml-auto" title="Photo pending" />
                    )}
                </div>
                {!compact && (
                    <div className="text-[10px] opacity-60 mt-0.5">{fmtTime(schedule.scheduledDate)}</div>
                )}
            </div>
            {!compact && agent && (
                <div className="flex-shrink-0 flex items-center pr-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[8px] flex items-center justify-center font-bold">
                        {initials(agent.name)}
                    </span>
                </div>
            )}
        </div>
    );
}

// ── MonthView ─────────────────────────────────────────────────────────────────
function MonthView({ year, month, schedules, today, onDayClick, onEventClick }) {
    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    const schedulesForDay = (date) =>
        schedules.filter(s => sameDay(new Date(s.scheduledDate), date));

    return (
        <div className="flex-1 flex flex-col overflow-auto">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 flex-shrink-0">
                {DAYS.map((d, i) => (
                    <div key={d} className={`text-center text-[11px] font-bold py-2.5 tracking-wide uppercase
                        ${i === 0 || i === 6 ? 'text-slate-400' : 'text-slate-500'}`}>
                        {d}
                    </div>
                ))}
            </div>
            {/* Cells */}
            <div className="grid grid-cols-7 flex-1">
                {cells.map((date, idx) => {
                    if (!date) return (
                        <div key={`e-${idx}`}
                            className="min-h-[7rem] border-b border-r border-slate-100 bg-slate-50/40" />
                    );
                    const ds      = schedulesForDay(date);
                    const isToday = sameDay(date, today);
                    const isWknd  = date.getDay() === 0 || date.getDay() === 6;
                    return (
                        <div
                            key={date.toISOString()}
                            onClick={() => onDayClick(date)}
                            className={`min-h-[7rem] border-b border-r border-slate-100 p-1.5 overflow-hidden cursor-pointer transition-colors group
                                ${isToday ? 'bg-blue-50/70' : isWknd ? 'bg-slate-50/60' : 'hover:bg-blue-50/20'}`}
                        >
                            <div className="flex items-start justify-between mb-1">
                                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors
                                    ${isToday ? 'bg-blue-600 text-white shadow-sm' : isWknd ? 'text-slate-400' : 'text-slate-600 group-hover:text-blue-600'}`}>
                                    {date.getDate()}
                                </span>
                                {ds.length > 0 && (
                                    <span className="text-[9px] text-slate-400 font-medium">{ds.length} visit{ds.length !== 1 ? 's' : ''}</span>
                                )}
                            </div>
                            <div className="space-y-0.5">
                                {ds.slice(0, 3).map(s => (
                                    <EventPill key={s._id} schedule={s} compact onClick={onEventClick} />
                                ))}
                                {ds.length > 3 && (
                                    <div className="text-[10px] text-blue-500 font-semibold pl-2 py-0.5 bg-blue-50 rounded">
                                        +{ds.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── WeekView ──────────────────────────────────────────────────────────────────
function WeekView({ weekStart, schedules, today, onSlotClick, onEventClick }) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
        <div className="flex-1 overflow-auto">
            {/* Column headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 sticky top-0 z-10">
                {days.map((d, i) => {
                    const isToday = sameDay(d, today);
                    const isWknd  = i === 0 || i === 6;
                    return (
                        <div key={d.toISOString()}
                            className={`text-center py-3 border-r border-slate-100 last:border-r-0
                                ${isToday ? 'bg-blue-50' : ''}`}>
                            <div className={`text-[11px] font-bold uppercase tracking-wide mb-1
                                ${isWknd ? 'text-slate-400' : 'text-slate-500'}`}>
                                {DAYS[d.getDay()]}
                            </div>
                            <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-bold transition-all
                                ${isToday ? 'bg-blue-600 text-white shadow-sm' : isWknd ? 'text-slate-400' : 'text-slate-700'}`}>
                                {d.getDate()}
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Day columns */}
            <div className="grid grid-cols-7 min-h-64">
                {days.map((d, i) => {
                    const dayS   = schedules.filter(s => sameDay(new Date(s.scheduledDate), d));
                    const isToday = sameDay(d, today);
                    return (
                        <div
                            key={d.toISOString()}
                            onClick={() => onSlotClick(d)}
                            className={`border-r border-slate-100 last:border-r-0 p-1.5 space-y-1 cursor-pointer min-h-32 transition-colors
                                ${isToday ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'}`}
                        >
                            {dayS.map(s => <EventPill key={s._id} schedule={s} onClick={onEventClick} />)}
                            {dayS.length === 0 && (
                                <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <Plus className="w-4 h-4 text-slate-300" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── DayView ───────────────────────────────────────────────────────────────────
function DayView({ date, schedules, onEventClick, onAddClick }) {
    const dayS = schedules.filter(s => sameDay(new Date(s.scheduledDate), date));

    return (
        <div className="flex-1 overflow-auto p-5">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">{fmtFull(date)}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{dayS.length} visit{dayS.length !== 1 ? 's' : ''} scheduled</p>
                    </div>
                    <button onClick={() => onAddClick(date)}
                    className="btn-primary px-3 py-2 text-sm">
                        <Plus className="w-4 h-4" /> New Plan
                    </button>
                </div>

                {dayS.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                            <CalendarDays className="w-8 h-8 opacity-40" />
                        </div>
                        <p className="text-sm font-medium mb-1">No visits scheduled</p>
                        <p className="text-xs mb-4">Free day — a great time to plan ahead.</p>
                        <button onClick={() => onAddClick(date)}
                            className="text-blue-600 text-sm font-semibold hover:underline">
                            Create a visit plan →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {dayS.map(s => {
                            const cfg = STATUS_CFG[s.status || 'pending'] || STATUS_CFG.pending;
                            return (
                                <div key={s._id} onClick={() => onEventClick(s)}
                                    className="flex items-stretch gap-0 rounded-lg border border-meridian-border overflow-hidden hover:shadow-meridian-card cursor-pointer transition-all bg-white group">
                                    <div className={`w-1.5 flex-shrink-0 ${cfg.bar}`} />
                                    <div className="flex-1 p-4 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h4 className="font-semibold text-slate-800 text-sm leading-snug">{s.title}</h4>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {fmtTime(s.scheduledDate)}
                                                {s.scheduledEndDate && ` – ${fmtTime(s.scheduledEndDate)}`}
                                            </span>
                                            {s.agentId && (
                                                <span className="flex items-center gap-1">
                                                    <Building2 className="w-3 h-3" />
                                                    {s.agentId.name}
                                                </span>
                                            )}
                                            {s.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {s.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── AgendaView ────────────────────────────────────────────────────────────────
function AgendaView({ schedules, onEventClick, onAddClick }) {
    const groups = {};
    schedules.forEach(s => {
        const d   = new Date(s.scheduledDate);
        const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (!groups[key]) groups[key] = { date: d, items: [] };
        groups[key].items.push(s);
    });
    const sortedKeys = Object.keys(groups).sort();

    if (sortedKeys.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center flex-col gap-3 text-slate-400 p-8">
                <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-2">
                    <CalendarDays className="w-10 h-10 opacity-30" />
                </div>
                <p className="text-sm font-medium">No upcoming visits in the next 30 days</p>
                <button onClick={() => onAddClick(new Date())}
                    className="mt-1 text-blue-600 text-sm font-semibold hover:underline">
                    Schedule a visit →
                </button>
            </div>
        );
    }

    const today = new Date();

    return (
        <div className="flex-1 overflow-auto">
            {sortedKeys.map(key => {
                const { date, items } = groups[key];
                const isToday  = sameDay(date, today);
                const isPast   = date < today && !isToday;
                return (
                    <div key={key} className="border-b border-slate-100 last:border-0">
                        {/* Date header */}
                        <div className={`sticky top-0 z-10 px-5 py-2.5 flex items-center gap-3 border-b border-slate-100
                            ${isToday ? 'bg-blue-50' : 'bg-slate-50/90 backdrop-blur-sm'}`}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0
                                ${isToday ? 'bg-blue-600 text-white shadow-sm' : isPast ? 'bg-slate-200 text-slate-500' : 'bg-white border border-slate-200 text-slate-700'}`}>
                                {date.getDate()}
                            </div>
                            <div>
                                <div className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-blue-700' : 'text-slate-500'}`}>
                                    {isToday ? 'Today' : DAYS_FULL[date.getDay()]}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                    {MONTHS_SHORT[date.getMonth()]} {date.getFullYear()}
                                </div>
                            </div>
                            <span className="ml-auto text-[10px] text-slate-400 font-medium">{items.length} visit{items.length !== 1 ? 's' : ''}</span>
                        </div>
                        {/* Events */}
                        <div className="px-5 py-3 space-y-2">
                            {items.map(s => {
                                const cfg = STATUS_CFG[s.status || 'pending'] || STATUS_CFG.pending;
                                return (
                                    <div key={s._id} onClick={() => onEventClick(s)}
                                        className="flex items-center gap-3 p-3 rounded-lg border border-meridian-border hover:shadow-meridian-card hover:border-meridian-blue/30 cursor-pointer transition-all bg-white group">
                                        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${cfg.bar}`} />
                                        <div className="flex-shrink-0 text-xs text-slate-400 font-medium w-16">
                                            {fmtTime(s.scheduledDate)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-semibold text-slate-800 block truncate">{s.title}</span>
                                            {s.agentId && (
                                                <span className="text-xs text-slate-400">{s.agentId.name}{s.agentId.city ? ` · ${s.agentId.city}` : ''}</span>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
                                            {cfg.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Schedule Drawer ───────────────────────────────────────────────────────────
function ScheduleDrawer({ schedule, balance, onClose, onEdit, onDelete }) {
    if (!schedule) return null;
    const plan = schedule.visitPlanRef;
    const cfg  = STATUS_CFG[schedule.status || 'pending'] || STATUS_CFG.pending;

    const spent   = balance?.spentAmount   || 0;
    const granted = balance?.grantedAmount || 0;
    const pct     = granted > 0 ? Math.min(100, (spent / granted) * 100) : 0;

    return (
        <div className="w-80 border-l border-meridian-border bg-white overflow-y-auto flex flex-col shadow-xl">
            {/* Header */}
            <div className="relative bg-meridian-navy p-5 pb-4">
                <button onClick={onClose}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                </button>
                <div className="pr-8">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${cfg.badge}`}>
                        {cfg.label}
                    </span>
                    <h3 className="font-bold text-white text-sm leading-snug">{schedule.title}</h3>
                    {schedule.agentId && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold text-white">
                                {initials(schedule.agentId.name)}
                            </div>
                            <span className="text-white/70 text-xs">{schedule.agentId.name}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Details */}
            <div className="flex-1 p-4 space-y-3">
                {/* Time */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <div className="text-xs font-bold text-slate-700">
                            {fmtDate(schedule.scheduledDate)} · {fmtTime(schedule.scheduledDate)}
                            {schedule.scheduledEndDate && ` – ${fmtTime(schedule.scheduledEndDate)}`}
                        </div>
                        {schedule.scheduledEndDate && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                                {Math.round((new Date(schedule.scheduledEndDate) - new Date(schedule.scheduledDate)) / 60000)} min
                            </div>
                        )}
                    </div>
                </div>

                {/* Location */}
                {schedule.location && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-slate-700">{schedule.location}</span>
                    </div>
                )}

                {/* Agent */}
                {schedule.agentId?.city && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div>
                            <div className="text-xs font-semibold text-slate-700">{schedule.agentId.name}</div>
                            <div className="text-[10px] text-slate-400">{schedule.agentId.city}{schedule.agentId.state ? `, ${schedule.agentId.state}` : ''}</div>
                        </div>
                    </div>
                )}

                {/* Client Photo */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Client Photo</div>
                        {!schedule.clientPhoto?.uploadRef ? (
                            <span className="text-xs text-orange-600 font-semibold">Not uploaded</span>
                        ) : (
                            <span className={`text-xs font-semibold capitalize ${
                                schedule.clientPhoto.verificationStatus === 'verified' ? 'text-emerald-600' :
                                schedule.clientPhoto.verificationStatus === 'rejected' ? 'text-red-600' :
                                'text-amber-600'
                            }`}>
                                {schedule.clientPhoto.verificationStatus}
                            </span>
                        )}
                    </div>
                </div>

                {/* Visit Plan */}
                {plan && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/50 overflow-hidden">
                        <div className="px-3 py-2.5 border-b border-blue-100 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PLAN_DOT[plan.status] || 'bg-slate-400'}`} />
                            <span className="text-xs font-bold text-slate-700 truncate">{plan.title}</span>
                        </div>
                        <div className="p-3 space-y-2">
                            <div className="text-[10px] text-slate-500">
                                {plan.city} · {plan.planType === 'multi_same_city' ? 'Multi-visit' : 'Single visit'}
                            </div>
                            {balance && granted > 0 && (
                                <div>
                                    <div className="flex justify-between text-[10px] mb-1.5">
                                        <span className="text-slate-500 font-medium">Budget used</span>
                                        <span className={`font-bold ${spent > granted ? 'text-red-600' : 'text-emerald-700'}`}>
                                            ₹{(granted - spent).toLocaleString('en-IN')} left
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${
                                            pct > 100 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                        }`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="text-[9px] text-slate-400 mt-1 text-right">
                                        ₹{spent.toLocaleString('en-IN')} / ₹{granted.toLocaleString('en-IN')}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Notes */}
                {schedule.notes && (
                    <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                        <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">Notes</div>
                        <p className="text-xs text-slate-600 leading-relaxed">{schedule.notes}</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-100 flex gap-2">
                <button onClick={() => onEdit(schedule)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 py-2 rounded-xl transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Edit Plan
                </button>
                <button onClick={() => onDelete(schedule)}
                    className="flex items-center justify-center gap-1.5 text-sm font-semibold text-red-500 border border-red-100 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

// ── Filter Bar ────────────────────────────────────────────────────────────────
function FilterBar({ filters, onChange, agents }) {
    const sel = 'text-xs border border-meridian-border rounded-lg px-2.5 py-1.5 bg-white focus:ring-1 focus:ring-blue-300 focus:border-meridian-blue text-meridian-text outline-none cursor-pointer';
    return (
        <div className="flex items-center gap-2 flex-wrap bg-white border-b border-meridian-border px-4 py-2.5 shadow-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Filters</span>
            <div className="w-px h-4 bg-slate-200" />
            <select className={sel} value={filters.agent || ''}
                onChange={e => onChange({ ...filters, agent: e.target.value || undefined })}>
                <option value="">All agents</option>
                {agents.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
            <select className={sel} value={filters.status || ''}
                onChange={e => onChange({ ...filters, status: e.target.value || undefined })}>
                <option value="">All statuses</option>
                {['pending','attended','missed','cancelled'].map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
            </select>
            <select className={sel} value={filters.planStatus || ''}
                onChange={e => onChange({ ...filters, planStatus: e.target.value || undefined })}>
                <option value="">All plan stages</option>
                {['draft','scheduled','in_progress','completed','cancelled','closed'].map(s => (
                    <option key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
                ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
                <input type="checkbox" checked={!!filters.hasOpenClaim}
                    onChange={e => onChange({ ...filters, hasOpenClaim: e.target.checked || undefined })}
                    className="accent-blue-600" />
                Open claim
            </label>
            {Object.values(filters).some(Boolean) && (
                <button onClick={() => onChange({})}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2.5 py-1.5 rounded-lg border border-red-100 bg-red-50 hover:bg-red-100 transition-colors font-semibold">
                    <XCircle className="w-3 h-3" /> Clear
                </button>
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

    const viewParam = searchParams.get('view') || 'month';
    const dateParam = searchParams.get('date');
    const [view, setView]       = useState(VIEWS.includes(viewParam) ? viewParam : 'month');
    const [curDate, setCurDate] = useState(dateParam ? new Date(dateParam) : today);

    const [schedules, setSchedules]         = useState([]);
    const [agents, setAgents]               = useState([]);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState(null);
    const [filters, setFilters]             = useState(savedFilters);
    const [drawerSchedule, setDrawerSchedule] = useState(null);
    const [drawerBalance, setDrawerBalance] = useState(null);
    const [showFilters, setShowFilters]     = useState(false);
    const [planModal, setPlanModal]         = useState({ open: false, defaultDate: null });

    // Google Calendar
    const [googleConnected, setGoogleConnected] = useState(false);
    const [gcalEmail, setGcalEmail]             = useState(null);
    const [toastMessage, setToastMessage]       = useState(null);

    const viewYear  = curDate.getFullYear();
    const viewMonth = curDate.getMonth();
    const weekStart = startOfWeek(curDate);

    // ── Persist view + date to URL ────────────────────────────────────────────
    useEffect(() => {
        setSearchParams({ view, date: curDate.toISOString().slice(0, 10) }, { replace: true });
    }, [view, curDate]);

    // ── Persist filters ───────────────────────────────────────────────────────
    useEffect(() => {
        localStorage.setItem('cal_filters', JSON.stringify(filters));
    }, [filters]);

    // ── Google Calendar status ────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const res  = await fetch(`${API}/google-calendar/status`, { credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    setGoogleConnected(data.connected);   // ← flat response, not data.data
                    setGcalEmail(data.email || null);
                }
            } catch { /* non-critical */ }
        })();

        // Handle OAuth callback params
        const gcalStatus = searchParams.get('gcal');
        if (gcalStatus === 'connected') {
            setToastMessage({ type: 'success', text: 'Google Calendar connected successfully!' });
            // Refresh status after connect
            setTimeout(async () => {
                try {
                    const res  = await fetch(`${API}/google-calendar/status`, { credentials: 'include' });
                    const data = await res.json();
                    if (data.success) { setGoogleConnected(data.connected); setGcalEmail(data.email || null); }
                } catch { /* ignore */ }
            }, 800);
        } else if (gcalStatus === 'error') {
            setToastMessage({ type: 'error', text: 'Failed to connect Google Calendar. Please try again.' });
        }
        if (gcalStatus) {
            const sp = new URLSearchParams(searchParams);
            sp.delete('gcal');
            setSearchParams(sp, { replace: true });
            setTimeout(() => setToastMessage(null), 4000);
        }
    }, []);

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            if (e.key === 't' || e.key === 'T') setCurDate(new Date());
            if (e.key === 'n' || e.key === 'N') setPlanModal({ open: true, defaultDate: curDate });
            if (e.key === '1') setView('month');
            if (e.key === '2') setView('week');
            if (e.key === '3') setView('day');
            if (e.key === '4') setView('agenda');
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [curDate]);

    // ── Fetch schedules ───────────────────────────────────────────────────────
    const fetchSchedules = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            let start, end;
            if (view === 'month') {
                start = new Date(viewYear, viewMonth, 1);
                end   = new Date(viewYear, viewMonth + 1, 0);
            } else if (view === 'week') {
                start = weekStart;
                end   = addDays(weekStart, 6);
            } else if (view === 'day') {
                start = new Date(curDate); start.setHours(0,0,0,0);
                end   = new Date(curDate); end.setHours(23,59,59,999);
            } else {
                start = new Date(); start.setHours(0,0,0,0);
                end   = addDays(start, 30);
            }
            const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
            if (filters.agent)      params.set('agent',      filters.agent);
            if (filters.planStatus) params.set('planStatus', filters.planStatus);
            if (filters.hasOpenClaim) params.set('hasOpenClaim', 'true');

            const res  = await fetch(`${API}/calendar?${params}`, { credentials: 'include' });
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

    // ── Drawer balance ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!drawerSchedule?.visitPlanRef?._id) { setDrawerBalance(null); return; }
        fetch(`${API}/visit-plans/${drawerSchedule.visitPlanRef._id}/balance`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => setDrawerBalance(d.data || null))
            .catch(() => setDrawerBalance(null));
    }, [drawerSchedule]);

    // ── Navigation ────────────────────────────────────────────────────────────
    const navigate_cal = (dir) => {
        const d = new Date(curDate);
        if (view === 'month')      d.setMonth(d.getMonth() + dir);
        else if (view === 'week')  d.setDate(d.getDate() + dir * 7);
        else                       d.setDate(d.getDate() + dir);
        setCurDate(d);
    };

    const headerLabel = () => {
        if (view === 'month')  return `${MONTHS[viewMonth]} ${viewYear}`;
        if (view === 'week')   return `${fmtDate(weekStart)} – ${fmtDate(addDays(weekStart, 6))}`;
        if (view === 'day')    return fmtFull(curDate);
        return 'Next 30 days';
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async (schedule) => {
        if (!window.confirm(`Delete "${schedule.title}"?`)) return;
        try {
            const r = await fetch(`${API}/calendar/${schedule._id}`, { method: 'DELETE', credentials: 'include' });
            const d = await r.json();
            if (!d.success) throw new Error(d.message);
            setDrawerSchedule(null);
            fetchSchedules();
        } catch (e) { alert(e.message); }
    };

    // ── Google Calendar toggle ────────────────────────────────────────────────
    const handleGoogleCalendarToggle = async () => {
        if (googleConnected) {
            if (!window.confirm('Disconnect Google Calendar? Future schedules will not sync.')) return;
            try {
                const res  = await fetch(`${API}/google-calendar/disconnect`, { method: 'POST', credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    setGoogleConnected(false);
                    setGcalEmail(null);
                    setToastMessage({ type: 'success', text: 'Google Calendar disconnected.' });
                    setTimeout(() => setToastMessage(null), 3000);
                }
            } catch { alert('Failed to disconnect Google Calendar'); }
        } else {
            try {
                const res  = await fetch(`${API}/google-calendar/auth-url`, { credentials: 'include' });
                const data = await res.json();
                if (data.success && data.url) window.location.href = data.url;
            } catch { alert('Failed to get Google Calendar authorization URL'); }
        }
    };

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    return (
        <div className="h-screen flex flex-col bg-meridian-bg">
            {/* ── Toolbar ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-meridian-border shadow-meridian-card flex-shrink-0">
                {/* Nav */}
                <div className="flex items-center gap-0.5">
                    <button onClick={() => navigate_cal(-1)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCurDate(new Date())}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                        Today
                    </button>
                    <button onClick={() => navigate_cal(1)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                <h2 className="font-bold text-slate-800 text-sm min-w-0 truncate ml-1">{headerLabel()}</h2>

                {loading && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin ml-1" />}

                <div className="ml-auto flex items-center gap-1.5">
                    {/* View switcher */}
                    <div className="hidden sm:flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 text-xs">
                        {[
                            { key: 'month',  icon: LayoutGrid, label: 'Month'  },
                            { key: 'week',   icon: Rows,       label: 'Week'   },
                            { key: 'day',    icon: CalIcon,    label: 'Day'    },
                            { key: 'agenda', icon: List,       label: 'Agenda' },
                        ].map(({ key, icon: Icon, label }) => (
                            <button key={key} onClick={() => setView(key)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 transition-all font-medium
                                    ${view === key
                                        ? 'bg-meridian-navy text-white shadow-inner'
                                        : 'text-slate-600 hover:bg-white hover:text-slate-800'}`}>
                                <Icon className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">{label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Filters */}
                    <button onClick={() => setShowFilters(f => !f)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all
                            ${activeFilterCount > 0
                                ? 'border-brand-gold bg-brand-gold text-white shadow-sm'
                                : 'border-meridian-border text-meridian-sub hover:bg-meridian-bg bg-white'}`}>
                        <Filter className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Filter</span>
                        {activeFilterCount > 0 && (
                            <span className="w-4 h-4 bg-white/30 rounded-full text-[10px] font-bold flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {/* Google Calendar */}
                    <button onClick={handleGoogleCalendarToggle}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all
                            ${googleConnected
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                        title={googleConnected ? `Connected: ${gcalEmail || 'Google Calendar'}` : 'Connect Google Calendar'}>
                        {googleConnected
                            ? <><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="hidden sm:inline">GCal On</span></>
                            : <><Link2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Connect GCal</span></>
                        }
                    </button>

                    {/* New Plan */}
                    <button onClick={() => setPlanModal({ open: true, defaultDate: curDate })}
                        className="btn-primary px-3 py-1.5 text-xs">
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">New Plan</span>
                    </button>
                </div>
            </div>

            {/* ── Keyboard hints ─────────────────────────────────────── */}
            <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 bg-slate-100/80 border-b border-slate-200 text-[10px] text-slate-400">
                {[['T','Today'],['N','New plan'],['1–4','Switch view']].map(([k,d]) => (
                    <span key={k}><kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-[9px]">{k}</kbd> {d}</span>
                ))}
            </div>

            {/* ── Filter bar ─────────────────────────────────────────── */}
            {showFilters && <FilterBar filters={filters} onChange={setFilters} agents={agents} />}

            {/* ── Error ──────────────────────────────────────────────── */}
            {error && (
                <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2 shadow-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                    <button onClick={fetchSchedules} className="ml-auto text-red-600 font-semibold hover:underline text-xs">Retry</button>
                </div>
            )}

            {/* ── Toast ──────────────────────────────────────────────── */}
            {toastMessage && (
                <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-semibold animate-fade-in border
                    ${toastMessage.type === 'error'
                        ? 'bg-white text-red-700 border-red-200 shadow-red-100'
                        : 'bg-white text-emerald-700 border-emerald-200 shadow-emerald-100'}`}>
                    {toastMessage.type === 'error'
                        ? <AlertCircle className="w-4 h-4 text-red-500" />
                        : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {toastMessage.text}
                </div>
            )}

            {/* ── Main content + drawer ──────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden bg-white border-t border-meridian-border">
                    {view === 'month' && (
                        <MonthView
                            year={viewYear} month={viewMonth}
                            schedules={schedules} today={today}
                            onDayClick={d => setPlanModal({ open: true, defaultDate: d })}
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
                            if (s.visitPlanRef?._id) navigate(`/visit-plans/${s.visitPlanRef._id}`);
                        }}
                        onDelete={handleDelete}
                    />
                )}
            </div>

            {/* ── Plan modal ──────────────────────────────────────────── */}
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
