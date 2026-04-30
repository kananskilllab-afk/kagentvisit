import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, User, MapPin, Building2 } from 'lucide-react';
import api from '../../utils/api';

const AgentAutocomplete = ({ value, onChange, placeholder, disabled, error, name, setValue }) => {
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchAgents = async (search) => {
        if (search.length < 2) {
            setSuggestions([]);
            return;
        }
        setLoading(true);
        try {
            const res = await api.get('/agents');
            if (res.data?.success) {
                const filtered = res.data.data.filter(agent => 
                    agent.name.toLowerCase().includes(search.toLowerCase()) ||
                    (agent.bdmName && agent.bdmName.toLowerCase().includes(search.toLowerCase())) ||
                    (agent.city && agent.city.toLowerCase().includes(search.toLowerCase()))
                );
                setSuggestions(filtered.slice(0, 10)); // Limit to 10
            }
        } catch (err) {
            console.error('Error fetching agents:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        onChange(val); // Still update the form value as user types
        fetchAgents(val);
        setShowSuggestions(true);
    };

    const handleSelect = (agent) => {
        setQuery(agent.name);
        onChange(agent.name);
        
        // If we are setting meta.companyName, also set meta.agentId and potentially BDM/RM
        if (name === 'meta.companyName' && setValue) {
            const opts = { shouldValidate: true, shouldDirty: true };
            setValue('meta.agentId', agent._id, opts);
            if (agent.bdmName) setValue('meta.bdmName', agent.bdmName, opts);
            if (agent.rmName) setValue('meta.rmName', agent.rmName, opts);
            
            // Auto-fill agency profile if available
            if (agent.emailId) setValue('meta.email', agent.emailId, opts);
            if (agent.city) setValue('agencyProfile.city', agent.city, opts);
            if (agent.state) setValue('agencyProfile.state', agent.state, opts);
            if (agent.pinCode) setValue('agencyProfile.pinCode', agent.pinCode, opts);
            if (agent.mobile) setValue('agencyProfile.contactNumber', agent.mobile, opts);
        }
        
        setShowSuggestions(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                    disabled={disabled}
                    className={`input-field pl-10 ${error ? 'border-red-400' : ''}`}
                    placeholder={placeholder || "Search agent/company..."}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </div>
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-premium border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-64 overflow-y-auto">
                        {suggestions.map((agent) => (
                            <button
                                key={agent._id}
                                type="button"
                                onClick={() => handleSelect(agent)}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 flex flex-col gap-0.5"
                            >
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5 text-brand-blue" />
                                    <span className="font-bold text-slate-900">{agent.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                                    {agent.bdmName && (
                                        <div className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            <span>BDM: {agent.bdmName}</span>
                                        </div>
                                    )}
                                    {agent.city && (
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            <span>{agent.city}</span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {showSuggestions && query.length >= 2 && suggestions.length === 0 && !loading && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-premium border border-slate-100 p-4 text-center animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-sm font-medium text-slate-500">No matching agents found in database</p>
                    <p className="text-[10px] text-slate-400 mt-1">You can continue typing to enter a new name</p>
                </div>
            )}
        </div>
    );
};

export default AgentAutocomplete;
