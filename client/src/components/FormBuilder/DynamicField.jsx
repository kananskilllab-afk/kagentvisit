import React, { useState } from 'react';
import MultiSelect from '../shared/MultiSelect';
import StarRating from '../shared/StarRating';
import PhotoUpload from './PhotoUpload';
import AgentAutocomplete from './AgentAutocomplete';
import RichTextEditor from '../shared/RichTextEditor';
import ActionItemTracker from '../ActionItemTracker';
import { Copy, Check, Plus, X } from 'lucide-react';

const DynamicField = ({ field, register, control, errors, watch, setValue, Controller, disabled, showCopy }) => {
    const [copied, setCopied] = useState(false);
    const { id, label, type, required, options } = field;
    const name = id;
    const error = id.split('.').reduce((obj, key) => obj?.[key], errors);

    const getOtherFieldName = (fieldName) => {
        const parts = fieldName.split('.');
        if (parts.length < 2) return `${fieldName}Other`;
        const key = parts[1];
        return `${parts[0]}.other${key.charAt(0).toUpperCase() + key.slice(1)}`;
    };

    const getToggleOtherFieldName = (fieldName) => {
        if (fieldName === 'kananTools.useAcademyPortal') return 'kananTools.academyPortalOther';
        if (fieldName === 'kananTools.useBooks') return 'kananTools.booksOther';
        return null;
    };

    const baseClass = `input-field ${error ? 'border-red-400 focus:ring-red-300/30 focus:border-red-400' : ''} ${disabled ? 'bg-slate-50 cursor-not-allowed text-slate-500' : ''}`;

    const handleCopy = () => {
        const val = watch(name);
        if (val) {
            navigator.clipboard.writeText(val);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const renderInput = () => {
        const inputElement = (() => {
            switch (type) {
                case 'textarea':
                    return (
                        <textarea
                            {...register(name)}
                            disabled={disabled}
                            className={`${baseClass} h-24 resize-none`}
                            placeholder={field.placeholder || `Enter ${label.toLowerCase()}...`}
                        />
                    );
                case 'richtext':
                    return (
                        <Controller
                            name={name}
                            control={control}
                            render={({ field: { value, onChange } }) => (
                                <RichTextEditor
                                    value={value}
                                    onChange={onChange}
                                    disabled={disabled}
                                    placeholder={field.placeholder || `Enter ${label.toLowerCase()}...`}
                                />
                            )}
                        />
                    );
                case 'number':
                    return (
                        <input
                            type="number"
                            {...register(name, { valueAsNumber: true })}
                            disabled={disabled}
                            className={baseClass}
                            placeholder={field.placeholder || ''}
                        />
                    );
                case 'date':
                    return (
                        <input type="date" {...register(name)} disabled={disabled} className={baseClass} />
                    );
                case 'datetime':
                    return (
                        <input type="datetime-local" {...register(name)} disabled={disabled} className={baseClass} />
                    );
                case 'dropdown':
                    return (
                        <div className="space-y-2">
                            <select {...register(name)} disabled={disabled} className={baseClass}>
                                <option value="">Select {label}...</option>
                                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            {(watch(name) === 'Other' || watch(name) === 'Others') && (
                                <input type="text" {...register(getOtherFieldName(name))} className={`${baseClass} py-1.5 text-xs border-brand-blue/30`} placeholder={`Please specify ${label.toLowerCase()}...`} disabled={disabled} />
                            )}
                        </div>
                    );
                case 'multi-select':
                    return (
                        <div className="space-y-2">
                            <Controller
                                name={name}
                                control={control}
                                render={({ field: { value, onChange } }) => (
                                    <MultiSelect
                                        options={options}
                                        value={value || []}
                                        onChange={onChange}
                                        disabled={disabled}
                                        placeholder={`Select ${label.toLowerCase()}...`}
                                    />
                                )}
                            />
                            {(watch(name)?.includes('Other') || watch(name)?.includes('Others')) && (
                                <input type="text" {...register(getOtherFieldName(name))} className={`${baseClass} py-1.5 text-xs border-brand-blue/30`} placeholder={`Please specify ${label.toLowerCase()}...`} disabled={disabled} />
                            )}
                        </div>
                    );
                case 'star-rating':
                    return (
                        <Controller
                            name={name}
                            control={control}
                            render={({ field: { value, onChange } }) => (
                                <StarRating
                                    value={value || 0}
                                    onChange={onChange}
                                    disabled={disabled}
                                />
                            )}
                        />
                    );
                case 'toggle':
                    return (
                        <div className="space-y-2">
                            <div className={`flex items-center gap-3 py-2 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        {...register(name)}
                                        disabled={disabled}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-5 bg-slate-200 rounded-full peer peer-checked:bg-brand-blue peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                                </label>
                                <span className="text-sm text-slate-500 font-medium">
                                    {watch(name) ? 'Yes' : 'No'}
                                </span>
                            </div>
                            {watch(name) === false && getToggleOtherFieldName(name) && (
                                <input type="text" {...register(getToggleOtherFieldName(name))} className={`${baseClass} py-1.5 text-xs border-brand-blue/30`} placeholder={`Which services/books are they using?`} disabled={disabled} />
                            )}
                        </div>
                    );
                case 'photo-upload':
                    return (
                        <Controller
                            name={name}
                            control={control}
                            render={({ field: { value, onChange } }) => (
                                <PhotoUpload
                                    label={label}
                                    value={value}
                                    onChange={onChange}
                                    disabled={disabled}
                                />
                            )}
                        />
                    );
                case 'autocomplete-agent':
                    return (
                        <Controller
                            name={name}
                            control={control}
                            render={({ field: { value, onChange } }) => (
                                <AgentAutocomplete
                                    value={value}
                                    onChange={onChange}
                                    disabled={disabled}
                                    error={error}
                                    name={name}
                                    setValue={setValue}
                                    placeholder={field.placeholder || `Search ${label.toLowerCase()}...`}
                                />
                            )}
                        />
                    );
                case 'action_items':
                    return (
                        <Controller
                            name={name}
                            control={control}
                            render={({ field: { value, onChange } }) => (
                                <ActionItemTracker
                                    value={value || []}
                                    onChange={onChange}
                                    readOnly={disabled}
                                    compact
                                    title={label || 'Action Items'}
                                />
                            )}
                        />
                    );
                case 'dynamic-list':
                    return (
                        <Controller
                            name={name}
                            control={control}
                            render={({ field: { value, onChange } }) => {
                                const list = Array.isArray(value) ? value : (value ? [value] : ['']);
                                return (
                                    <div className="space-y-2">
                                        {list.map((item, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={item}
                                                    onChange={(e) => {
                                                        const newList = [...list];
                                                        newList[index] = e.target.value;
                                                        onChange(newList);
                                                    }}
                                                    disabled={disabled}
                                                    className={`${baseClass} py-2.5 sm:py-3`}
                                                    placeholder={field.placeholder || `Enter item ${index + 1}...`}
                                                />
                                                {list.length > 1 && (
                                                    <button type="button" onClick={() => onChange(list.filter((_, i) => i !== index))} className="p-2 sm:p-2.5 text-red-500 hover:bg-red-50 rounded-xl" disabled={disabled}>
                                                        <X className="w-5 h-5 sm:w-4 sm:h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => onChange([...list, ''])} className="text-xs font-bold text-brand-blue flex items-center gap-1 hover:text-brand-sky" disabled={disabled}>
                                            <Plus className="w-3 h-3" /> Add More
                                        </button>
                                    </div>
                                );
                            }}
                        />
                    );
                case 'dynamic-contacts':
                    return (
                        <Controller
                            name={name}
                            control={control}
                            render={({ field: { value, onChange } }) => {
                                const list = Array.isArray(value) ? value : (value ? [{ name: '', designation: '', number: value }] : [{ name: '', designation: '', number: '' }]);
                                return (
                                    <div className="space-y-3">
                                        {list.map((item, index) => (
                                            <div key={index} className="flex items-stretch sm:items-center flex-col sm:flex-row gap-2.5 sm:gap-2 bg-slate-50 p-3 sm:p-2.5 rounded-xl border border-slate-100">
                                                <input type="text" value={item.name || ''} onChange={(e) => { const n = [...list]; n[index] = { ...n[index], name: e.target.value }; onChange(n); }} placeholder="Name" className="input-field py-2.5 sm:py-1.5 text-sm sm:text-xs flex-1 w-full" disabled={disabled} />
                                                <input type="text" value={item.designation || ''} onChange={(e) => { const n = [...list]; n[index] = { ...n[index], designation: e.target.value }; onChange(n); }} placeholder="Designation" className="input-field py-2.5 sm:py-1.5 text-sm sm:text-xs flex-1 w-full" disabled={disabled} />
                                                <input type="text" value={item.number || ''} onChange={(e) => { const n = [...list]; n[index] = { ...n[index], number: e.target.value }; onChange(n); }} placeholder="Phone Number" className="input-field py-2.5 sm:py-1.5 text-sm sm:text-xs flex-1 w-full" disabled={disabled} />
                                                {list.length > 1 && (
                                                    <button type="button" onClick={() => onChange(list.filter((_, i) => i !== index))} className="p-2 sm:p-1.5 text-red-500 hover:bg-red-50 rounded-lg shrink-0 w-full sm:w-auto" disabled={disabled}>
                                                        <X className="w-5 h-5 sm:w-4 sm:h-4 mx-auto sm:mx-0" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => onChange([...list, { name: '', designation: '', number: '' }])} className="text-xs font-bold text-brand-blue flex items-center gap-1 hover:text-brand-sky" disabled={disabled}>
                                            <Plus className="w-3 h-3" /> Add Contact
                                        </button>
                                    </div>
                                );
                            }}
                        />
                    );
                case 'office-area-combo':
                    return (
                        <Controller
                            name={name}
                            control={control}
                            render={({ field: { value, onChange } }) => {
                                return (
                                    <div className="space-y-3">
                                        <select value={value || ''} onChange={(e) => { onChange(e.target.value); setValue('agencyProfile.officeArea', ''); }} className={baseClass} disabled={disabled}>
                                            <option value="">Select office size...</option>
                                            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest shrink-0">Or Specify Sq.ft</span>
                                            <input type="number" {...register('agencyProfile.officeArea', { valueAsNumber: true })} className={`${baseClass} py-1.5 text-xs flex-1`} placeholder="e.g. 1500" disabled={disabled || !!value} />
                                        </div>
                                    </div>
                                );
                            }}
                        />
                    );
                default:
                    return (
                        <input
                            type="text"
                            {...register(name)}
                            disabled={disabled}
                            className={baseClass}
                            placeholder={field.placeholder || `Enter ${label.toLowerCase()}...`}
                        />
                    );
            }
        })();

        if (showCopy) {
            return (
                <div className="relative group">
                    {inputElement}
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-blue transition-colors bg-white/80 backdrop-blur-sm border border-slate-100"
                        title="Copy to clipboard"
                    >
                        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                    {copied && (
                        <span className="absolute -top-8 right-0 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-200">
                            Copied!
                        </span>
                    )}
                </div>
            );
        }

        return inputElement;
    };

    const isFullWidth = ['textarea', 'richtext', 'multi-select', 'photo-upload', 'dynamic-list', 'dynamic-contacts', 'action_items'].includes(type);

    return (
        <div className={`${isFullWidth ? 'md:col-span-2' : ''} space-y-1.5`}>
            <label className="label">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {renderInput()}
            {error && (
                <p className="text-xs text-red-500 font-medium mt-1">{error.message}</p>
            )}
        </div>
    );
};

export default DynamicField;
