import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Bell, FileText, Save, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '/api';

const REMINDER_OPTIONS = [
    { value: 0,    label: 'No reminder' },
    { value: 15,   label: '15 minutes before' },
    { value: 60,   label: '1 hour before' },
    { value: 180,  label: '3 hours before' },
    { value: 1440, label: '1 day before' },
    { value: 2880, label: '2 days before' },
];

function toInputDatetime(date) {
    if (!date) return '';
    const d = new Date(date);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const GoogleIcon = ({ className = 'w-4 h-4' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M21.35 11.1h-9.18v2.73h5.51c-.24 1.27-.97 2.34-2.05 3.06l3.32 2.58c1.94-1.79 3.06-4.42 3.06-7.53 0-.65-.06-1.27-.17-1.84z" fill="#4285F4"/>
        <path d="M12.17 22c2.77 0 5.1-.92 6.8-2.49l-3.32-2.58c-.92.62-2.1.99-3.48.99-2.68 0-4.95-1.81-5.76-4.24l-3.42 2.65C4.73 19.78 8.17 22 12.17 22z" fill="#34A853"/>
        <path d="M6.41 14.17A5.9 5.9 0 016.07 12c0-.76.13-1.5.34-2.17L3 7.18A10 10 0 002 12c0 1.62.39 3.15 1.08 4.5l3.33-2.33z" fill="#FBBC05"/>
        <path d="M12.17 5.83c1.51 0 2.87.52 3.94 1.54l2.96-2.96C17.25 2.77 14.92 2 12.17 2 8.17 2 4.73 4.22 3 7.18l3.41 2.65c.81-2.43 3.08-4 5.76-4z" fill="#EA4335"/>
    </svg>
);

export default function ScheduleModal({ defaultDate, editData, onClose, onSaved, gcalConnected }) {
    const isEdit = !!editData;

    const [form, setForm] = useState({
        title:          editData?.title || '',
        scheduledDate:  editData ? toInputDatetime(editData.scheduledDate) : toInputDatetime(defaultDate || new Date()),
        visitType:      editData?.visitType || 'generic',
        reminderOffset: editData?.reminderOffset ?? 60,
        location:       editData?.location || '',
        notes:          editData?.notes || '',
        syncToGoogle:   editData?.syncToGoogle ?? (gcalConnected ? true : false),
    });
    const [saving,  setSaving]  = useState(false);
    const [errMsg,  setErrMsg]  = useState('');

    // Reset form if editData changes
    useEffect(() => {
        if (editData) {
            setForm({
                title:          editData.title || '',
                scheduledDate:  toInputDatetime(editData.scheduledDate),
                visitType:      editData.visitType || 'generic',
                reminderOffset: editData.reminderOffset ?? 60,
                location:       editData.location || '',
                notes:          editData.notes || '',
                syncToGoogle:   editData.syncToGoogle ?? false,
            });
        }
    }, [editData]);

    const handleChange = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrMsg('');
        if (!form.title.trim())      return setErrMsg('Title is required.');
        if (!form.scheduledDate)     return setErrMsg('Date & time is required.');

        setSaving(true);
        try {
            const payload = {
                ...form,
                scheduledDate:  new Date(form.scheduledDate).toISOString(),
                reminderOffset: Number(form.reminderOffset),
            };

            const url    = isEdit ? `${API}/calendar/${editData._id}` : `${API}/calendar`;
            const method = isEdit ? 'PUT' : 'POST';

            const res  = await fetch(url, {
                method,
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            onSaved();
        } catch (err) {
            setErrMsg(err.message || 'Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-[fadeIn_0.15s_ease]"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl pointer-events-auto animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-brand-blue" />
                            </div>
                            <h2 className="text-base font-extrabold text-slate-900">
                                {isEdit ? 'Edit Scheduled Visit' : 'Schedule a Visit'}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                        {/* Title */}
                        <div>
                            <label className="label">
                                <FileText className="inline w-3 h-3 mr-1" /> Visit Title / Company Name
                            </label>
                            <input
                                id="schedule-title"
                                type="text"
                                className="input-field"
                                placeholder="e.g. ABC Education Consultancy"
                                value={form.title}
                                onChange={e => handleChange('title', e.target.value)}
                                required
                            />
                        </div>

                        {/* Date & Time */}
                        <div>
                            <label className="label">
                                <Clock className="inline w-3 h-3 mr-1" /> Date & Time
                            </label>
                            <input
                                id="schedule-date"
                                type="datetime-local"
                                className="input-field"
                                value={form.scheduledDate}
                                onChange={e => handleChange('scheduledDate', e.target.value)}
                                required
                            />
                        </div>

                        {/* Visit Type */}
                        <div>
                            <label className="label">Visit Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[['generic', 'B2B Visit'], ['home_visit', 'Home Visit']].map(([val, lbl]) => (
                                    <button
                                        key={val}
                                        type="button"
                                        onClick={() => handleChange('visitType', val)}
                                        className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                                            form.visitType === val
                                                ? (val === 'home_visit'
                                                    ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                                    : 'bg-brand-blue text-white border-brand-blue shadow-md')
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        {lbl}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reminder */}
                        <div>
                            <label className="label">
                                <Bell className="inline w-3 h-3 mr-1" /> Reminder
                            </label>
                            <select
                                id="schedule-reminder"
                                className="input-field"
                                value={form.reminderOffset}
                                onChange={e => handleChange('reminderOffset', e.target.value)}
                            >
                                {REMINDER_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Location */}
                        <div>
                            <label className="label">
                                <MapPin className="inline w-3 h-3 mr-1" /> Location (optional)
                            </label>
                            <input
                                id="schedule-location"
                                type="text"
                                className="input-field"
                                placeholder="Address or area"
                                value={form.location}
                                onChange={e => handleChange('location', e.target.value)}
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="label">Notes (optional)</label>
                            <textarea
                                id="schedule-notes"
                                className="input-field resize-none"
                                rows={3}
                                placeholder="Any details about this visit…"
                                value={form.notes}
                                onChange={e => handleChange('notes', e.target.value)}
                            />
                        </div>

                        {/* Sync to Google Calendar Toggle */}
                        {gcalConnected && (
                            <div
                                onClick={() => handleChange('syncToGoogle', !form.syncToGoogle)}
                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                    form.syncToGoogle
                                        ? 'bg-emerald-50 border-emerald-200'
                                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <GoogleIcon className="w-5 h-5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold ${form.syncToGoogle ? 'text-emerald-800' : 'text-slate-600'}`}>
                                        Sync to Google Calendar
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                        {form.syncToGoogle ? 'This visit will appear on your Google Calendar' : 'Tap to sync this visit to Google Calendar'}
                                    </p>
                                </div>
                                <div className={`w-10 h-6 rounded-full relative transition-colors ${form.syncToGoogle ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.syncToGoogle ? 'left-5' : 'left-1'}`} />
                                </div>
                            </div>
                        )}

                        {errMsg && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-xl">
                                <X className="w-3.5 h-3.5 shrink-0" /> {errMsg}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={saving}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary flex-1" disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isEdit ? 'Update' : 'Schedule'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
