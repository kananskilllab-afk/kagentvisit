import React, { useEffect, useMemo, useState } from 'react';
import { Plus, CheckCircle2, Circle, Trash2, History, Loader2, StickyNote, CalendarClock } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const todayIso = () => new Date().toISOString().slice(0, 10);

const makeDraftItem = (text = '') => ({
    _clientId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    text,
    assignee: '',
    dueDate: '',
    status: 'open',
    history: []
});

const itemKey = item => item._id || item._clientId;

const formatDate = (value) => {
    if (!value) return 'No due date';
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ActionItemTracker = ({
    value,
    onChange,
    visitId,
    readOnly = false,
    compact = false,
    title = 'Action Items'
}) => {
    const { user, isAdmin } = useAuth();
    const [items, setItems] = useState(Array.isArray(value) ? value : []);
    const [draft, setDraft] = useState(makeDraftItem());
    const [noteByItem, setNoteByItem] = useState({});
    const [loading, setLoading] = useState(false);
    const [savingId, setSavingId] = useState(null);
    const [assignableUsers, setAssignableUsers] = useState([]);

    const isPersisted = Boolean(visitId);
    const canEdit = !readOnly && user?.role !== 'accounts';

    useEffect(() => {
        if (!isPersisted) setItems(Array.isArray(value) ? value : []);
    }, [value, isPersisted]);

    useEffect(() => {
        if (!isPersisted) return;
        const loadItems = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/visits/${visitId}/action-items`);
                setItems(res.data.data || []);
            } catch (err) {
                console.error('Failed to load action items', err);
            } finally {
                setLoading(false);
            }
        };
        loadItems();
    }, [visitId, isPersisted]);

    useEffect(() => {
        if (!isAdmin) return;
        api.get('/users/assignable')
            .then(res => setAssignableUsers(res.data.data || []))
            .catch(() => setAssignableUsers([]));
    }, [isAdmin]);

    const assigneeOptions = useMemo(() => {
        const map = new Map();
        if (user?._id) map.set(user._id, { _id: user._id, name: `${user.name || 'Me'} (me)` });
        assignableUsers.forEach(u => map.set(u._id, u));
        return Array.from(map.values());
    }, [assignableUsers, user]);

    const emit = (next) => {
        setItems(next);
        onChange?.(next);
    };

    const updateDraft = (updates) => setDraft(prev => ({ ...prev, ...updates }));

    const addItem = async () => {
        const text = draft.text.trim();
        if (!text || !canEdit) return;
        if (isPersisted) {
            setSavingId('new');
            try {
                const res = await api.post(`/visits/${visitId}/action-items`, {
                    text,
                    assignee: draft.assignee || null,
                    dueDate: draft.dueDate || null
                });
                setItems(prev => [...prev, res.data.data]);
                setDraft(makeDraftItem());
            } catch (err) {
                alert(err.response?.data?.message || 'Failed to add action item');
            } finally {
                setSavingId(null);
            }
            return;
        }
        emit([...items, { ...draft, text, createdAt: new Date().toISOString() }]);
        setDraft(makeDraftItem());
    };

    const updateLocalItem = (key, updates) => {
        emit(items.map(item => itemKey(item) === key ? { ...item, ...updates } : item));
    };

    const removeItem = async (item) => {
        const key = itemKey(item);
        if (!canEdit) return;
        if (isPersisted && item._id) {
            setSavingId(key);
            try {
                await api.delete(`/visits/${visitId}/action-items/${item._id}`);
                setItems(prev => prev.filter(candidate => itemKey(candidate) !== key));
            } catch (err) {
                alert(err.response?.data?.message || 'Failed to delete action item');
            } finally {
                setSavingId(null);
            }
            return;
        }
        emit(items.filter(candidate => itemKey(candidate) !== key));
    };

    const saveItemText = async (item, text) => {
        const key = itemKey(item);
        if (!isPersisted || !item._id) {
            updateLocalItem(key, { text });
            return;
        }
        setSavingId(key);
        try {
            const res = await api.put(`/visits/${visitId}/action-items/${item._id}`, {
                text,
                assignee: item.assignee?._id || item.assignee || null,
                dueDate: item.dueDate || null,
                note: noteByItem[key] || ''
            });
            setItems(prev => prev.map(candidate => itemKey(candidate) === key ? res.data.data : candidate));
            setNoteByItem(prev => ({ ...prev, [key]: '' }));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update action item');
        } finally {
            setSavingId(null);
        }
    };

    const changeStatus = async (item) => {
        const key = itemKey(item);
        const status = item.status === 'done' ? 'open' : 'done';
        if (!canEdit) return;
        if (!isPersisted || !item._id) {
            updateLocalItem(key, { status });
            return;
        }
        setSavingId(key);
        try {
            const res = await api.put(`/visits/${visitId}/action-items/${item._id}/status`, {
                status,
                note: noteByItem[key] || ''
            });
            setItems(prev => prev.map(candidate => itemKey(candidate) === key ? res.data.data : candidate));
            setNoteByItem(prev => ({ ...prev, [key]: '' }));
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update status');
        } finally {
            setSavingId(null);
        }
    };

    const openCount = items.filter(item => item.status !== 'done').length;

    return (
        <div className={`${compact ? 'space-y-3' : 'space-y-4'} md:col-span-2`}>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{title}</h3>
                    <p className="text-xs font-semibold text-slate-400">{openCount} open follow-up{openCount === 1 ? '' : 's'}</p>
                </div>
                <span className="rounded-full bg-brand-blue/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-blue">
                    Tracker
                </span>
            </div>

            {canEdit && (
                <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_150px_auto] gap-2">
                        <input
                            value={draft.text}
                            onChange={e => updateDraft({ text: e.target.value })}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addItem();
                                }
                            }}
                            className="input-field h-10"
                            placeholder="Add a follow-up action..."
                        />
                        <select
                            value={draft.assignee}
                            onChange={e => updateDraft({ assignee: e.target.value })}
                            className="input-field h-10"
                        >
                            <option value="">Unassigned</option>
                            {assigneeOptions.map(option => (
                                <option key={option._id} value={option._id}>{option.name}</option>
                            ))}
                        </select>
                        <input
                            type="date"
                            min={todayIso()}
                            value={draft.dueDate}
                            onChange={e => updateDraft({ dueDate: e.target.value })}
                            className="input-field h-10"
                        />
                        <button
                            type="button"
                            onClick={addItem}
                            disabled={!draft.text.trim() || savingId === 'new'}
                            className="btn-primary h-10 px-4 justify-center disabled:opacity-50"
                        >
                            {savingId === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center text-sm font-bold text-slate-400">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-brand-blue" />
                    Loading action items...
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm font-bold text-slate-400">
                    No action items yet.
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map(item => {
                        const key = itemKey(item);
                        const isDone = item.status === 'done';
                        const assigneeName = item.assignee?.name || assigneeOptions.find(u => u._id === item.assignee)?.name || 'Unassigned';
                        return (
                            <div key={key} className={`rounded-2xl border bg-white p-4 shadow-sm ${isDone ? 'border-green-100 bg-green-50/30' : 'border-slate-100'}`}>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-start gap-3">
                                        <button
                                            type="button"
                                            onClick={() => changeStatus(item)}
                                            disabled={!canEdit || savingId === key}
                                            className={`mt-1 rounded-full ${isDone ? 'text-brand-green' : 'text-slate-300 hover:text-brand-blue'}`}
                                            title={isDone ? 'Mark open' : 'Mark done'}
                                        >
                                            {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                        </button>
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <input
                                                value={item.text || ''}
                                                onChange={e => updateLocalItem(key, { text: e.target.value })}
                                                onBlur={e => canEdit && saveItemText(item, e.target.value)}
                                                disabled={!canEdit}
                                                className={`w-full rounded-xl border border-transparent bg-transparent px-0 py-1 text-sm font-bold text-slate-800 outline-none focus:border-brand-blue/20 focus:bg-white focus:px-3 ${isDone ? 'line-through decoration-green-500/50' : ''}`}
                                            />
                                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-400">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1">
                                                    <CalendarClock className="h-3 w-3" />
                                                    {formatDate(item.dueDate)}
                                                </span>
                                                <span className="rounded-full bg-slate-50 px-2 py-1">{assigneeName}</span>
                                                <span className={`rounded-full px-2 py-1 ${isDone ? 'bg-green-100 text-green-700' : 'bg-orange-50 text-brand-orange'}`}>
                                                    {isDone ? 'Done' : 'Open'}
                                                </span>
                                            </div>
                                        </div>
                                        {canEdit && (
                                            <button type="button" onClick={() => removeItem(item)} className="rounded-xl p-2 text-red-400 hover:bg-red-50 hover:text-red-600">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    {isPersisted && canEdit && (
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <div className="relative flex-1">
                                                <StickyNote className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-300" />
                                                <input
                                                    value={noteByItem[key] || ''}
                                                    onChange={e => setNoteByItem(prev => ({ ...prev, [key]: e.target.value }))}
                                                    className="input-field h-9 pl-9 text-xs"
                                                    placeholder="Optional note for the history trail..."
                                                />
                                            </div>
                                            <button type="button" onClick={() => saveItemText(item, item.text || '')} className="btn-outline h-9 px-3 text-xs">
                                                Save Note
                                            </button>
                                        </div>
                                    )}

                                    {item.history?.length > 0 && (
                                        <details className="rounded-xl bg-slate-50 px-3 py-2">
                                            <summary className="flex cursor-pointer items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                                                <History className="h-3.5 w-3.5" />
                                                History ({item.history.length})
                                            </summary>
                                            <div className="mt-2 space-y-1">
                                                {item.history.slice().reverse().map(entry => (
                                                    <div key={entry._id || `${entry.at}_${entry.change}`} className="text-xs text-slate-500">
                                                        <span className="font-bold text-slate-700">{entry.change?.replace('_', ' ')}</span>
                                                        <span> · {formatDate(entry.at)}</span>
                                                        {entry.note && <span> · {entry.note}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ActionItemTracker;
