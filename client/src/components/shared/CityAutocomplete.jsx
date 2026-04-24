import React, { useState, useRef, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';
import { searchCities } from '../../utils/indianCities';

const CityAutocomplete = ({ city = '', state = '', onSelect, placeholder = 'City', className = '', disabled = false }) => {
    const [input, setInput] = useState(city);
    const [suggestions, setSuggestions] = useState([]);
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);
    const containerRef = useRef(null);

    useEffect(() => { setInput(city); }, [city]);

    useEffect(() => {
        const handleOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const handleInput = (val) => {
        setInput(val);
        setHighlighted(-1);
        if (val.length >= 1) {
            const results = searchCities(val, 10);
            setSuggestions(results);
            setOpen(results.length > 0);
        } else {
            setSuggestions([]);
            setOpen(false);
        }
        onSelect(val, state);
    };

    const handleSelect = (c) => {
        setInput(c.city);
        setSuggestions([]);
        setOpen(false);
        setHighlighted(-1);
        onSelect(c.city, c.state);
    };

    const handleKeyDown = (e) => {
        if (!open) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted(h => Math.min(h + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted(h => Math.max(h - 1, 0));
        } else if (e.key === 'Enter' && highlighted >= 0) {
            e.preventDefault();
            handleSelect(suggestions[highlighted]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const tierColors = {
        tier_1: 'text-blue-600 bg-blue-50',
        tier_2: 'text-purple-600 bg-purple-50',
        tier_3: 'text-slate-500 bg-slate-50',
    };

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                    type="text"
                    className={`input-field pl-9 pr-8 ${className}`}
                    placeholder={placeholder}
                    value={input}
                    onChange={(e) => handleInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
                    disabled={disabled}
                    autoComplete="off"
                />
                {input && !disabled && (
                    <button
                        type="button"
                        onClick={() => { setInput(''); setSuggestions([]); setOpen(false); onSelect('', ''); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {open && suggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                    {suggestions.map((c, idx) => (
                        <button
                            key={`${c.city}-${c.state}`}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); handleSelect(c); }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                                highlighted === idx ? 'bg-brand-blue/5' : 'hover:bg-slate-50'
                            }`}
                        >
                            <div>
                                <span className="text-sm font-bold text-slate-800">{c.city}</span>
                                <span className="text-xs text-slate-400 ml-2">{c.state}</span>
                            </div>
                            {c.tier && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${tierColors[c.tier] || ''}`}>
                                    {c.tier.replace('_', '-').toUpperCase()}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CityAutocomplete;
