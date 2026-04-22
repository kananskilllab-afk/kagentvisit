import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
    FileText, ArrowLeft, Loader2, MapPin, Calendar,
    IndianRupee, Check, Receipt, Navigation
} from 'lucide-react';

const NewClaim = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [expenses, setExpenses] = useState([]);
    const [loadingExpenses, setLoadingExpenses] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [form, setForm] = useState({
        title: '',
        description: '',
        travelPurpose: '',
        travelFrom: { city: '', state: '' },
        travelTo: { city: '', state: '' },
        travelStartDate: '',
        travelEndDate: '',
        claimLocation: { city: '', state: '', coordinates: { lat: null, lng: null } }
    });

    useEffect(() => {
        fetchUnclaimedExpenses();
        detectLocation();
    }, []);

    const fetchUnclaimedExpenses = async () => {
        try {
            const res = await api.get('/expenses', { params: { unclaimed: 'true' } });
            setExpenses(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch expenses', err);
        } finally {
            setLoadingExpenses(false);
        }
    };

    const detectLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setForm(prev => ({
                    ...prev,
                    claimLocation: {
                        ...prev.claimLocation,
                        coordinates: { lat: pos.coords.latitude, lng: pos.coords.longitude }
                    }
                }));
            },
            () => {} // ignore errors
        );
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleNestedChange = (parent, field, value) => {
        setForm(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));
    };

    const toggleExpense = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedIds.length === expenses.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(expenses.map(e => e._id));
        }
    };

    const selectedTotal = expenses
        .filter(e => selectedIds.includes(e._id))
        .reduce((sum, e) => sum + (e.amount || 0), 0);

    const handleSubmit = async (e, submitNow = false) => {
        e.preventDefault();
        if (!form.title) {
            alert('Please provide a claim title');
            return;
        }
        if (selectedIds.length === 0) {
            alert('Please select at least one expense');
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post('/expenses/claims', {
                ...form,
                expenseIds: selectedIds
            });

            if (submitNow && res.data.data?._id) {
                await api.post(`/expenses/claims/${res.data.data._id}/submit`);
            }

            navigate('/expenses/claims');
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating claim');
        } finally {
            setSubmitting(false);
        }
    };

    const CATEGORY_LABELS = {
        flight: 'Flight', train: 'Train', bus: 'Bus', cab: 'Cab', metro: 'Metro',
        hotel: 'Hotel', food: 'Food', agent_entertainment: 'Agent', internet_phone: 'Internet',
        parking_toll: 'Parking', visa_passport: 'Visa', office_supplies: 'Supplies', other: 'Other'
    };

    return (
        <div className="space-y-6 page-enter max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/expenses/claims')} className="p-2 rounded-xl hover:bg-slate-100 transition-all">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                    <h1 className="page-title">New Expense Claim</h1>
                    <p className="page-subtitle">Group expenses and submit for reimbursement</p>
                </div>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
                {/* Claim Details */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-blue" />
                        Claim Details
                    </h3>
                    <div>
                        <label className="label">Claim Title</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="e.g., Mumbai B2B Visit - April 2026"
                            value={form.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Travel Purpose</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="e.g., Agent visit and partnership meeting"
                            value={form.travelPurpose}
                            onChange={(e) => handleChange('travelPurpose', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label">Description (Optional)</label>
                        <textarea
                            className="input-field min-h-[60px]"
                            placeholder="Additional details about this claim..."
                            value={form.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                        />
                    </div>
                </div>

                {/* Travel Info */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-brand-blue" />
                        Travel Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Travel From</p>
                            <input type="text" className="input-field" placeholder="City" value={form.travelFrom.city} onChange={(e) => handleNestedChange('travelFrom', 'city', e.target.value)} />
                            <input type="text" className="input-field" placeholder="State" value={form.travelFrom.state} onChange={(e) => handleNestedChange('travelFrom', 'state', e.target.value)} />
                        </div>
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Travel To</p>
                            <input type="text" className="input-field" placeholder="City" value={form.travelTo.city} onChange={(e) => handleNestedChange('travelTo', 'city', e.target.value)} />
                            <input type="text" className="input-field" placeholder="State" value={form.travelTo.state} onChange={(e) => handleNestedChange('travelTo', 'state', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Travel Start Date</label>
                            <input type="date" className="input-field" value={form.travelStartDate} onChange={(e) => handleChange('travelStartDate', e.target.value)} />
                        </div>
                        <div>
                            <label className="label">Travel End Date</label>
                            <input type="date" className="input-field" value={form.travelEndDate} onChange={(e) => handleChange('travelEndDate', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Claim Location */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-brand-blue" />
                        Claim Filed From
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label">City</label>
                            <input type="text" className="input-field" placeholder="City" value={form.claimLocation.city} onChange={(e) => handleNestedChange('claimLocation', 'city', e.target.value)} />
                        </div>
                        <div>
                            <label className="label">State</label>
                            <input type="text" className="input-field" placeholder="State" value={form.claimLocation.state} onChange={(e) => handleNestedChange('claimLocation', 'state', e.target.value)} />
                        </div>
                    </div>
                    {form.claimLocation.coordinates?.lat && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            GPS: {form.claimLocation.coordinates.lat.toFixed(4)}, {form.claimLocation.coordinates.lng.toFixed(4)}
                        </p>
                    )}
                </div>

                {/* Select Expenses */}
                <div className="card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-brand-blue" />
                            Select Expenses ({selectedIds.length} selected)
                        </h3>
                        {expenses.length > 0 && (
                            <button type="button" onClick={selectAll} className="text-xs font-bold text-brand-blue hover:underline">
                                {selectedIds.length === expenses.length ? 'Deselect All' : 'Select All'}
                            </button>
                        )}
                    </div>

                    {loadingExpenses ? (
                        <div className="py-6 flex items-center justify-center gap-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="py-6 text-center">
                            <p className="text-sm text-slate-500">No unclaimed expenses found.</p>
                            <button type="button" onClick={() => navigate('/expenses/add')} className="mt-2 text-sm font-bold text-brand-blue hover:underline">
                                Add Expenses First
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {expenses.map(exp => {
                                const selected = selectedIds.includes(exp._id);
                                return (
                                    <button
                                        key={exp._id}
                                        type="button"
                                        onClick={() => toggleExpense(exp._id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                            selected
                                                ? 'border-brand-blue bg-brand-blue/5'
                                                : 'border-slate-100 hover:border-slate-200'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                                            selected ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-300'
                                        }`}>
                                            {selected && <Check className="w-3 h-3" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-700">
                                                {CATEGORY_LABELS[exp.category] || exp.category}
                                                {exp.vendor && <span className="font-normal text-slate-400"> - {exp.vendor}</span>}
                                            </p>
                                            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(exp.expenseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                {exp.travelFrom?.city && exp.travelTo?.city && (
                                                    <span>{exp.travelFrom.city} → {exp.travelTo.city}</span>
                                                )}
                                            </p>
                                        </div>
                                        <p className="font-bold text-slate-800 shrink-0">
                                            {exp.amount?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {selectedIds.length > 0 && (
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <p className="text-sm font-bold text-slate-600">Total Claim Amount</p>
                            <p className="text-xl font-extrabold text-brand-blue flex items-center gap-1">
                                <IndianRupee className="w-4 h-4" />
                                {selectedTotal.toLocaleString('en-IN')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button type="button" onClick={() => navigate('/expenses/claims')} className="flex-1 btn-outline py-3">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || !form.title || selectedIds.length === 0}
                        className="flex-1 btn-outline py-3 flex items-center justify-center gap-2 border-brand-blue text-brand-blue hover:bg-brand-blue/5"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save as Draft'}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, true)}
                        disabled={submitting || !form.title || selectedIds.length === 0}
                        className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                    >
                        {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                            : <><FileText className="w-4 h-4" /> Submit Claim</>
                        }
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewClaim;
