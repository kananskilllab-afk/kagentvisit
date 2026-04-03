import React, { useState } from 'react';
import MultiSelect from '../shared/MultiSelect';
import StarRating from '../shared/StarRating';
import PhotoUpload from './PhotoUpload';
import AgentAutocomplete from './AgentAutocomplete';
import RichTextEditor from '../shared/RichTextEditor';
import { Copy, Check } from 'lucide-react';

const DynamicField = ({ field, register, control, errors, watch, setValue, Controller, disabled, showCopy }) => {
    const [copied, setCopied] = useState(false);
    const { id, label, type, required, options } = field;
    const name = id;
    const error = id.split('.').reduce((obj, key) => obj?.[key], errors);

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
                            placeholder={field.placeholder || '0'}
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
                        <select {...register(name)} disabled={disabled} className={baseClass}>
                            <option value="">Select {label}...</option>
                            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    );
                case 'multi-select':
                    return (
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

    const isFullWidth = ['textarea', 'richtext', 'multi-select', 'photo-upload'].includes(type);

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
