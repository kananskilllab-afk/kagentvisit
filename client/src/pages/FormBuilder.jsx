import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
    Plus,
    Trash2,
    Edit2,
    Save,
    Settings,
    Layers,
    CheckCircle2,
    MoveUp,
    MoveDown,
    PlusCircle,
    Layout,
    Loader2,
    AlertCircle
} from 'lucide-react';

const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'datetime', 'dropdown', 'multi-select', 'toggle', 'star-rating', 'file', 'action_items'];

const TYPE_COLORS = {
    text: 'bg-brand-sky/10 text-brand-sky',
    textarea: 'bg-brand-purple/10 text-brand-purple',
    number: 'bg-brand-gold/10 text-brand-gold',
    date: 'bg-brand-orange/10 text-brand-orange',
    datetime: 'bg-brand-orange/10 text-brand-orange',
    dropdown: 'bg-brand-blue/10 text-brand-blue',
    'multi-select': 'bg-brand-navy/10 text-brand-navy',
    toggle: 'bg-brand-lime/20 text-green-700',
    'star-rating': 'bg-brand-gold/10 text-brand-gold',
    file: 'bg-slate-100 text-slate-600',
    action_items: 'bg-green-50 text-green-700',
};

const FormBuilder = () => {
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [selectedField, setSelectedField] = useState(null);
    const [version, setVersion] = useState('');
    const [activeFormType, setActiveFormType] = useState('generic');

    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            setSelectedField(null);
            try {
                const res = await api.get(`/form-config?formType=${activeFormType}`);
                if (res.data.data) {
                    setFields(res.data.data.fields || []);
                    setVersion(res.data.data.version || '1.0');
                } else {
                    setFields([]);
                    setVersion('1.0');
                }
            } catch (err) {
                console.error('Error fetching form config:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [activeFormType]);

    const addField = (group) => {
        const newField = {
            id: `field_${Date.now()}`,
            group: group || 'General',
            label: 'New Field',
            type: 'text',
            required: false,
            options: []
        };
        setFields(prev => [...prev, newField]);
        setSelectedField(newField);
    };

    const updateField = (id, updates) => {
        setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
        if (selectedField?.id === id) setSelectedField(prev => ({ ...prev, ...updates }));
    };

    const deleteField = (id) => {
        if (window.confirm('Delete this field?')) {
            setFields(prev => prev.filter(f => f.id !== id));
            if (selectedField?.id === id) setSelectedField(null);
        }
    };

    const moveField = (index, direction) => {
        const newFields = [...fields];
        if (direction === 'up' && index > 0) {
            [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
        } else if (direction === 'down' && index < fields.length - 1) {
            [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
        }
        setFields(newFields);
    };

    const saveConfig = async () => {
        setSaving(true);
        setSaveSuccess(false);
        try {
            // Safely increment version: extract numeric part from "1.0", "2.0-B2B-timestamp", etc.
            const numericPart = parseFloat(version.toString().split('-')[0]) || 1.0;
            const newVersion = (numericPart + 0.1).toFixed(1);
            await api.put('/form-config', {
                version: newVersion,
                fields,
                isActive: true,
                formType: activeFormType
            });
            setVersion(newVersion);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving:', err);
            alert('Failed to save form configuration');
        } finally {
            setSaving(false);
        }
    };

    const groups = [...new Set(fields.map(f => f.group))];

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-blue mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">Loading form builder...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-8 page-enter">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Form Builder</h1>
                    <p className="page-subtitle">
                        Configure survey fields · Version <span className="font-bold text-brand-blue">{version}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Form Type Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        {[{ value: 'generic', label: 'B2B' }, { value: 'home_visit', label: 'B2C' }].map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setActiveFormType(opt.value)}
                                className={`px-5 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                    activeFormType === opt.value
                                        ? 'bg-white text-brand-blue shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {saveSuccess && (
                        <div className="flex items-center gap-1.5 text-brand-green text-sm font-bold animate-fade-in">
                            <CheckCircle2 className="w-4 h-4" /> Saved!
                        </div>
                    )}

                    <button
                        onClick={saveConfig}
                        disabled={saving}
                        className="btn-primary flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Publishing...' : 'Publish Version'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Field List Panel */}
                <div className="lg:col-span-5">
                    <div className="card p-0 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                                <Layers className="w-4 h-4 text-brand-blue" />
                                Form Structure
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-bold">
                                    {fields.length} fields
                                </span>
                            </h3>
                            <button
                                onClick={() => addField()}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-blue/10 text-brand-blue rounded-lg hover:bg-brand-blue/20 transition-all text-xs font-bold"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Field
                            </button>
                        </div>

                        <div className="p-3 space-y-4 max-h-[72vh] overflow-y-auto">
                            {groups.length === 0 ? (
                                <div className="py-10 text-center text-slate-400">
                                    <Layout className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                                    <p className="text-sm">No fields yet. Add one to get started.</p>
                                </div>
                            ) : groups.map(group => (
                                <div key={group}>
                                    <div className="flex items-center justify-between px-2 mb-2">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group}</h4>
                                        <button
                                            onClick={() => addField(group)}
                                            className="p-1 text-slate-400 hover:text-brand-blue transition-colors"
                                            title={`Add field to ${group}`}
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        {fields.filter(f => f.group === group).map((field) => {
                                            const fieldIndex = fields.indexOf(field);
                                            return (
                                                <div
                                                    key={field.id}
                                                    onClick={() => setSelectedField(field)}
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer group/item flex items-center justify-between ${
                                                        selectedField?.id === field.id
                                                            ? 'bg-brand-blue/5 border-brand-blue/30 shadow-sm'
                                                            : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`p-1.5 rounded-lg text-xs font-bold shrink-0 ${
                                                            selectedField?.id === field.id
                                                                ? 'bg-brand-blue/10 text-brand-blue'
                                                                : 'bg-slate-50 text-slate-400'
                                                        }`}>
                                                            <Settings className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`text-sm font-bold truncate ${selectedField?.id === field.id ? 'text-brand-blue' : 'text-slate-700'}`}>
                                                                {field.label}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${TYPE_COLORS[field.type] || 'bg-slate-100 text-slate-500'}`}>
                                                                    {field.type}
                                                                </span>
                                                                {field.required && (
                                                                    <span className="text-[9px] font-bold text-red-500">*required</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); moveField(fieldIndex, 'up'); }}
                                                            className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                                        >
                                                            <MoveUp className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); moveField(fieldIndex, 'down'); }}
                                                            className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                                        >
                                                            <MoveDown className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteField(field.id); }}
                                                            className="p-1 text-red-400 hover:text-red-600 rounded ml-0.5"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Field Editor Panel */}
                <div className="lg:col-span-7">
                    {selectedField ? (
                        <div className="card animate-fade-in">
                            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Edit2 className="w-4 h-4 text-brand-blue" />
                                    Configure Field
                                </h3>
                                <code className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg">
                                    {selectedField.id}
                                </code>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label className="label">Field Label</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={selectedField.label}
                                        onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label">Section / Group</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={selectedField.group}
                                        onChange={(e) => updateField(selectedField.id, { group: e.target.value })}
                                        placeholder="e.g., Agency Profile"
                                    />
                                </div>
                                <div>
                                    <label className="label">Field Type</label>
                                    <select
                                        className="input-field"
                                        value={selectedField.type}
                                        onChange={(e) => {
                                            const nextType = e.target.value;
                                            updateField(selectedField.id, {
                                                type: nextType,
                                                options: [],
                                                ...(nextType === 'action_items' ? { id: 'actionItems', label: selectedField.label === 'New Field' ? 'Action Items' : selectedField.label } : {})
                                            });
                                        }}
                                    >
                                        {FIELD_TYPES.map(t => (
                                            <option key={t} value={t}>{t === 'action_items' ? 'Action Items' : t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end pb-0.5">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={selectedField.required}
                                                onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                                            />
                                            <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-brand-blue peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700">Required Field</span>
                                    </label>
                                </div>
                            </div>

                            {selectedField.type === 'action_items' && (
                                <div className="mt-5 p-4 bg-green-50 rounded-xl border border-green-100">
                                    <p className="text-sm font-bold text-green-800">Action Items block</p>
                                    <p className="text-xs font-semibold text-green-700/80 mt-1">
                                        Renders the follow-up tracker with text, assignee, due date, status, and append-only history.
                                    </p>
                                </div>
                            )}

                            {['dropdown', 'multi-select'].includes(selectedField.type) && (
                                <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <label className="label mb-2">Options <span className="text-slate-400 font-normal normal-case">(comma-separated)</span></label>
                                    <textarea
                                        className="input-field h-24"
                                        placeholder="Option 1, Option 2, Option 3"
                                        value={selectedField.options?.join(', ')}
                                        onChange={(e) => updateField(selectedField.id, {
                                            options: e.target.value.split(',').map(o => o.trim()).filter(Boolean)
                                        })}
                                    />
                                    {selectedField.options?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {selectedField.options.map(opt => (
                                                <span key={opt} className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-xs font-semibold rounded-lg">
                                                    {opt}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end mt-5 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setSelectedField(null)}
                                    className="btn-ghost px-5"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="card h-full min-h-[400px] flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 bg-slate-50/50">
                            <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                                <Layout className="w-7 h-7 text-slate-300" />
                            </div>
                            <h3 className="font-bold text-slate-600 text-base">No Field Selected</h3>
                            <p className="text-sm text-slate-400 max-w-xs mt-1.5">
                                Click a field from the left panel to edit its properties, or add a new one.
                            </p>
                            <button
                                onClick={() => addField()}
                                className="btn-primary mt-5 flex items-center gap-2"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Add New Field
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FormBuilder;
