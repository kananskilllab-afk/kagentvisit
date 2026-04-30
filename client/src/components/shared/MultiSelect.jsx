import React from 'react';
import { X, Check } from 'lucide-react';

const MultiSelect = ({ options = [], value = [], onChange, placeholder, disabled = false }) => {
    const toggle = (option) => {
        if (disabled) return;
        onChange(value.includes(option) ? value.filter(v => v !== option) : [...value, option]);
    };

    return (
        <div className="w-full space-y-3">
            {/* Selected chips */}
            <div className={`min-h-[44px] p-2 border border-slate-200 rounded-xl bg-white flex flex-wrap gap-1.5 items-center focus-within:ring-2 focus-within:ring-brand-sky/30 focus-within:border-brand-sky transition-all ${disabled ? 'bg-slate-50 opacity-70 cursor-not-allowed' : ''}`}>
                {value.length === 0 && (
                    <span className="text-slate-400 text-sm ml-1">{placeholder || 'Select options...'}</span>
                )}
                {value.map(val => (
                    <span key={val} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-blue/10 text-brand-blue text-xs font-semibold border border-brand-blue/20">
                        {val}
                        <button
                            type="button"
                            onClick={() => toggle(val)}
                            disabled={disabled}
                            className="ml-0.5 hover:text-red-500 transition-colors disabled:cursor-not-allowed"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
            </div>

            {/* Option pills */}
            <div className="flex flex-wrap gap-2">
                {options.map(option => {
                    const selected = value.includes(option);
                    return (
                        <button
                            key={option}
                            type="button"
                            onClick={() => toggle(option)}
                            disabled={disabled}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                                selected
                                    ? 'bg-brand-blue text-white border-brand-blue shadow-sm shadow-brand-blue/20'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-sky hover:text-brand-sky'
                            } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600`}
                        >
                            {selected && <Check className="w-3 h-3" />}
                            {option}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MultiSelect;
