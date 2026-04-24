import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
    Receipt, Plane, Train, Bus, Car, Hotel, UtensilsCrossed,
    Users, Wifi, ParkingCircle, Stamp, Package, PenLine,
    ArrowLeft, Loader2, MapPin, Calendar, IndianRupee, Upload,
    AlertTriangle, Info, ShieldCheck
} from 'lucide-react';
import ImageUpload from '../../components/shared/ImageUpload';
import CityAutocomplete from '../../components/shared/CityAutocomplete';
import { getCityTier } from '../../utils/indianCities';

const CATEGORIES = [
    { value: 'flight',              label: 'Flight',             icon: Plane },
    { value: 'train',               label: 'Train',              icon: Train },
    { value: 'bus',                 label: 'Bus',                icon: Bus },
    { value: 'cab',                 label: 'Cab / Taxi',         icon: Car },
    { value: 'metro',              label: 'Metro',              icon: Train },
    { value: 'hotel',              label: 'Hotel / Stay',       icon: Hotel },
    { value: 'food',               label: 'Food & Meals',       icon: UtensilsCrossed },
    { value: 'agent_entertainment', label: 'Spent on Agent',     icon: Users },
    { value: 'internet_phone',     label: 'Internet / Phone',   icon: Wifi },
    { value: 'parking_toll',       label: 'Parking / Toll',     icon: ParkingCircle },
    { value: 'visa_passport',      label: 'Visa / Passport',    icon: Stamp },
    { value: 'office_supplies',    label: 'Office Supplies',    icon: Package },
    { value: 'other',              label: 'Other',              icon: PenLine },
];

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Debit/Credit Card' },
    { value: 'company_card', label: 'Company Card' },
    { value: 'other', label: 'Other' },
];

const TRAIN_CLASSES = [
    { value: '3AC', label: '3rd AC (Rajdhani/Tejas/Shatabdi)' },
    { value: '2nd_class', label: '2nd Class (Express/Superfast)' },
    { value: 'sleeper', label: 'Sleeper' },
    { value: 'general', label: 'General' },
    { value: '2AC', label: '2nd AC' },
    { value: '1AC', label: '1st AC' },
];

const BUS_TYPES = [
    { value: 'volvo', label: 'Volvo / AC Bus' },
    { value: 'non_ac', label: 'Non-AC Bus' },
    { value: 'sleeper', label: 'Sleeper Bus' },
    { value: 'semi_sleeper', label: 'Semi-Sleeper' },
];

const BOOKING_MODES = [
    { value: 'ola', label: 'Ola' },
    { value: 'uber', label: 'Uber' },
    { value: 'app_other', label: 'Other App' },
    { value: 'public_transport', label: 'Public Transport (Metro/BRTS/Bus)' },
    { value: 'direct', label: 'Direct / Walk-in' },
    { value: 'other', label: 'Other' },
];

const CITY_TIERS = [
    { value: 'tier_1', label: 'Tier-1 (Mumbai, Delhi, Bangalore, etc.)', cap: 1000 },
    { value: 'tier_2', label: 'Tier-2 (Ahmedabad, Jaipur, Lucknow, etc.)', cap: 600 },
    { value: 'tier_3', label: 'Tier-3 (All other cities)', cap: 400 },
];

// Policy hint messages per category
const POLICY_HINTS = {
    train: { icon: Info, color: 'text-blue-600 bg-blue-50 border-blue-100', text: 'Policy: Train travel must be 3rd AC (Rajdhani/Tejas/Shatabdi) or 2nd Class (Express/Superfast). Upgrades need prior management approval.' },
    bus: { icon: Info, color: 'text-blue-600 bg-blue-50 border-blue-100', text: 'Policy: Volvo/AC buses are allowed for intercity travel. Book through Vicky Ray at least 21 days prior.' },
    cab: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-100', text: 'Policy: Cabs only via Ola/Uber or tracked apps. Public transport (Metro/BRTS) preferred. Daily intra-city limits apply.' },
    metro: { icon: ShieldCheck, color: 'text-green-600 bg-green-50 border-green-100', text: 'Policy: Metro/public transport is the preferred mode for intra-city travel. Great choice!' },
    food: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-100', text: 'Policy: Daily food allowance is ₹600 for Lunch + Dinner combined. Breakfast should be complimentary at hotel.' },
    hotel: { icon: Info, color: 'text-blue-600 bg-blue-50 border-blue-100', text: 'Policy: All hotel bookings must be done by Vicky Ray (HOD Ticketing). Only complimentary breakfast — no lunch/dinner on hotel bill.' },
};

const AddExpense = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        category: '',
        otherCategory: '',
        amount: '',
        description: '',
        expenseDate: new Date().toISOString().split('T')[0],
        travelFrom: { city: '', state: '' },
        travelTo: { city: '', state: '' },
        vendor: '',
        paymentMethod: 'cash',
        receiptUrl: '',      // primary receipt (first upload)
        uploadRefs: [],      // all uploaded URLs
        cityTier: 'na',
        travelClass: '',
        bookingMode: 'other'
    });
    // uploadedUrls drives the ImageUpload component (source of truth for previews)
    const [uploadedUrls, setUploadedUrls] = useState([]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleNestedChange = (parent, field, value) => {
        setForm(prev => ({ ...prev, [parent]: { ...prev[parent], [field]: value } }));
    };

    const handleUploadsChange = (uploads) => {
        setUploadedUrls(uploads);
        setForm(prev => ({
            ...prev,
            receiptUrl: uploads[0]?.url || '',
            uploadRefs: uploads.map(u => u.uploadId).filter(Boolean),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.category || !form.amount || !form.expenseDate) {
            alert('Please fill in category, amount, and date');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/expenses', {
                ...form,
                amount: parseFloat(form.amount)
            });
            navigate('/expenses');
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating expense');
        } finally {
            setSubmitting(false);
        }
    };

    const showTravelClass = ['train'].includes(form.category);
    const showBusType = ['bus'].includes(form.category);
    const showBookingMode = ['cab', 'metro'].includes(form.category);
    const showCityTier = ['cab', 'metro', 'bus', 'parking_toll'].includes(form.category);
    const policyHint = POLICY_HINTS[form.category];
    const selectedTier = CITY_TIERS.find(t => t.value === form.cityTier);

    return (
        <div className="space-y-6 page-enter max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/expenses')} className="p-2 rounded-xl hover:bg-slate-100 transition-all">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                    <h1 className="page-title">Add Expense</h1>
                    <p className="page-subtitle">Record a travel or business expense</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Category Selection */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-brand-blue" />
                        Expense Category
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {CATEGORIES.map(cat => {
                            const Icon = cat.icon;
                            const active = form.category === cat.value;
                            return (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => handleChange('category', cat.value)}
                                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-bold ${
                                        active
                                            ? 'border-brand-blue bg-brand-blue/5 text-brand-blue shadow-sm'
                                            : 'border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                    {form.category === 'other' && (
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Specify expense type..."
                            value={form.otherCategory}
                            onChange={(e) => handleChange('otherCategory', e.target.value)}
                            required
                        />
                    )}

                    {/* Policy Hint Banner */}
                    {policyHint && (
                        <div className={`flex items-start gap-3 p-3 rounded-xl border ${policyHint.color}`}>
                            <policyHint.icon className="w-4 h-4 mt-0.5 shrink-0" />
                            <p className="text-xs font-medium leading-relaxed">{policyHint.text}</p>
                        </div>
                    )}
                </div>

                {/* Conditional: Train Class */}
                {showTravelClass && (
                    <div className="card p-5 space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Train className="w-4 h-4 text-brand-blue" />
                            Travel Class
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {TRAIN_CLASSES.map(tc => {
                                const active = form.travelClass === tc.value;
                                const isCompliant = ['3AC', '2nd_class'].includes(tc.value);
                                return (
                                    <button
                                        key={tc.value}
                                        type="button"
                                        onClick={() => handleChange('travelClass', tc.value)}
                                        className={`p-3 rounded-xl border-2 transition-all text-xs font-bold text-left ${
                                            active
                                                ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
                                                : 'border-slate-100 text-slate-500 hover:border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isCompliant && <ShieldCheck className="w-3.5 h-3.5 text-green-500" />}
                                            {tc.label}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {form.travelClass && !['3AC', '2nd_class'].includes(form.travelClass) && (
                            <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-100 bg-amber-50 text-amber-700">
                                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                <p className="text-xs font-medium">This class may require prior management approval per policy.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Conditional: Bus Type */}
                {showBusType && (
                    <div className="card p-5 space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Bus className="w-4 h-4 text-brand-blue" />
                            Bus Type
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {BUS_TYPES.map(bt => {
                                const active = form.travelClass === bt.value;
                                return (
                                    <button
                                        key={bt.value}
                                        type="button"
                                        onClick={() => handleChange('travelClass', bt.value)}
                                        className={`p-3 rounded-xl border-2 transition-all text-xs font-bold ${
                                            active
                                                ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
                                                : 'border-slate-100 text-slate-500 hover:border-slate-200'
                                        }`}
                                    >
                                        {bt.value === 'volvo' && <ShieldCheck className="w-3.5 h-3.5 text-green-500 inline mr-1" />}
                                        {bt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Conditional: City Tier for intra-city */}
                {showCityTier && (
                    <div className="card p-5 space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-brand-blue" />
                            City Tier (for daily limit)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {CITY_TIERS.map(ct => {
                                const active = form.cityTier === ct.value;
                                return (
                                    <button
                                        key={ct.value}
                                        type="button"
                                        onClick={() => handleChange('cityTier', ct.value)}
                                        className={`p-3 rounded-xl border-2 transition-all text-left ${
                                            active
                                                ? 'border-brand-blue bg-brand-blue/5'
                                                : 'border-slate-100 hover:border-slate-200'
                                        }`}
                                    >
                                        <p className={`text-xs font-bold ${active ? 'text-brand-blue' : 'text-slate-600'}`}>{ct.label}</p>
                                        <p className={`text-lg font-extrabold mt-1 ${active ? 'text-brand-blue' : 'text-slate-800'}`}>₹{ct.cap}/day</p>
                                    </button>
                                );
                            })}
                        </div>
                        {selectedTier && selectedTier.value !== 'na' && (
                            <div className="flex items-start gap-2 p-3 rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
                                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                <p className="text-xs font-medium">Daily intra-city cap for {selectedTier.label.split('(')[0].trim()}: <strong>₹{selectedTier.cap}</strong></p>
                            </div>
                        )}
                    </div>
                )}

                {/* Conditional: Booking Mode for cabs */}
                {showBookingMode && (
                    <div className="card p-5 space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Car className="w-4 h-4 text-brand-blue" />
                            Booking Mode
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {BOOKING_MODES.map(bm => {
                                const active = form.bookingMode === bm.value;
                                const isPreferred = ['public_transport', 'ola', 'uber'].includes(bm.value);
                                return (
                                    <button
                                        key={bm.value}
                                        type="button"
                                        onClick={() => handleChange('bookingMode', bm.value)}
                                        className={`p-3 rounded-xl border-2 transition-all text-xs font-bold ${
                                            active
                                                ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
                                                : 'border-slate-100 text-slate-500 hover:border-slate-200'
                                        }`}
                                    >
                                        {isPreferred && <ShieldCheck className="w-3.5 h-3.5 text-green-500 inline mr-1" />}
                                        {bm.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Amount & Date */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-brand-blue" />
                        Amount & Date
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Amount (INR)</label>
                            <input
                                type="number"
                                className="input-field"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                value={form.amount}
                                onChange={(e) => handleChange('amount', e.target.value)}
                                required
                            />
                            {form.category === 'food' && parseFloat(form.amount) > 600 && (
                                <p className="text-xs text-amber-600 font-bold mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Exceeds daily ₹600 food allowance
                                </p>
                            )}
                            {showCityTier && selectedTier && parseFloat(form.amount) > selectedTier.cap && (
                                <p className="text-xs text-amber-600 font-bold mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Exceeds {selectedTier.label.split('(')[0].trim()} daily cap of ₹{selectedTier.cap}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="label">Expense Date</label>
                            <input
                                type="date"
                                className="input-field"
                                value={form.expenseDate}
                                onChange={(e) => handleChange('expenseDate', e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Vendor / Provider</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g., IndiGo, OYO, Uber..."
                                value={form.vendor}
                                onChange={(e) => handleChange('vendor', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="label">Payment Method</label>
                            <select
                                className="input-field"
                                value={form.paymentMethod}
                                onChange={(e) => handleChange('paymentMethod', e.target.value)}
                            >
                                {PAYMENT_METHODS.map(pm => (
                                    <option key={pm.value} value={pm.value}>{pm.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Travel Details */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-brand-blue" />
                        Travel Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">From</p>
                            <CityAutocomplete
                                city={form.travelFrom.city}
                                state={form.travelFrom.state}
                                placeholder="City (type to search)"
                                onSelect={(city, state) => {
                                    const tier = (city && showCityTier) ? getCityTier(city) : null;
                                    setForm(prev => ({ ...prev, travelFrom: { city, state }, ...(tier ? { cityTier: tier } : {}) }));
                                }}
                            />
                            <input
                                type="text"
                                className="input-field"
                                placeholder="State (auto-detected)"
                                value={form.travelFrom.state}
                                onChange={(e) => handleNestedChange('travelFrom', 'state', e.target.value)}
                            />
                        </div>
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">To</p>
                            <CityAutocomplete
                                city={form.travelTo.city}
                                state={form.travelTo.state}
                                placeholder="City (type to search)"
                                onSelect={(city, state) => {
                                    const tier = (city && showCityTier) ? getCityTier(city) : null;
                                    setForm(prev => ({ ...prev, travelTo: { city, state }, ...(tier ? { cityTier: tier } : {}) }));
                                }}
                            />
                            <input
                                type="text"
                                className="input-field"
                                placeholder="State (auto-detected)"
                                value={form.travelTo.state}
                                onChange={(e) => handleNestedChange('travelTo', 'state', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Description & Receipt */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <PenLine className="w-4 h-4 text-brand-blue" />
                        Details & Receipt
                    </h3>
                    <div>
                        <label className="label">Description / Notes</label>
                        <textarea
                            className="input-field min-h-[80px]"
                            placeholder="Add any relevant details..."
                            value={form.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label">Upload Receipts / Bills</label>
                        <ImageUpload
                            urls={uploadedUrls}
                            onChange={handleUploadsChange}
                            maxFiles={5}
                            label="Upload receipts, bills or tickets"
                            context="expense_receipt"
                        />
                    </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/expenses')}
                        className="flex-1 btn-outline py-3"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || !form.category || !form.amount}
                        className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                    >
                        {submitting
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                            : <><Receipt className="w-4 h-4" /> Save Expense</>
                        }
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddExpense;
