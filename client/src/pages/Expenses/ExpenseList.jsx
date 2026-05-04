import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
    Receipt, Plus, Search, Filter, Trash2, Edit2, X,
    Plane, Train, Bus, Car, Hotel, UtensilsCrossed, Users,
    Wifi, ParkingCircle, Stamp, Package, PenLine,
    Loader2, Calendar, IndianRupee, FileText, ArrowRight,
    ChevronDown, ChevronUp, BarChart3, SlidersHorizontal,
    User as UserIcon, ChevronRight
} from 'lucide-react';

const CATEGORY_META = {
    flight:              { label: 'Flight',           icon: Plane,            color: 'text-blue-600 bg-blue-50' },
    train:               { label: 'Train',            icon: Train,            color: 'text-green-600 bg-green-50' },
    bus:                 { label: 'Bus',              icon: Bus,              color: 'text-orange-600 bg-orange-50' },
    cab:                 { label: 'Cab / Taxi',       icon: Car,              color: 'text-yellow-600 bg-yellow-50' },
    metro:               { label: 'Metro',            icon: Train,            color: 'text-purple-600 bg-purple-50' },
    hotel:               { label: 'Hotel',            icon: Hotel,            color: 'text-pink-600 bg-pink-50' },
    food:                { label: 'Food',             icon: UtensilsCrossed,  color: 'text-red-600 bg-red-50' },
    agent_entertainment: { label: 'Agent',            icon: Users,            color: 'text-indigo-600 bg-indigo-50' },
    internet_phone:      { label: 'Internet',         icon: Wifi,             color: 'text-cyan-600 bg-cyan-50' },
    parking_toll:        { label: 'Parking',          icon: ParkingCircle,    color: 'text-gray-600 bg-gray-50' },
    visa_passport:       { label: 'Visa',             icon: Stamp,            color: 'text-teal-600 bg-teal-50' },
    office_supplies:     { label: 'Supplies',         icon: Package,          color: 'text-amber-600 bg-amber-50' },
    other:               { label: 'Other',            icon: PenLine,          color: 'text-slate-600 bg-slate-50' },
};

const PAYMENT_LABELS = {
    cash: 'Cash', upi: 'UPI', card: 'Card', company_card: 'Company Card', other: 'Other'
};

const DATE_PRESETS = [
    { label: 'Today', getValue: () => { const d = new Date().toISOString().split('T')[0]; return { start: d, end: d }; } },
    { label: 'This Week', getValue: () => { const now = new Date(); const d = new Date(now); d.setDate(d.getDate() - d.getDay()); return { start: d.toISOString().split('T')[0], end: now.toISOString().split('T')[0] }; } },
    { label: 'This Month', getValue: () => { const now = new Date(); return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, end: now.toISOString().split('T')[0] }; } },
    { label: 'This Quarter', getValue: () => { const now = new Date(); const qm = Math.floor(now.getMonth() / 3) * 3; return { start: `${now.getFullYear()}-${String(qm + 1).padStart(2, '0')}-01`, end: now.toISOString().split('T')[0] }; } },
];

function getInitials(name = '') {
    return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
}

const UserCard = ({ group, isSelected, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full text-left p-4 rounded-lg border transition-all ${
            isSelected
                ? 'border-meridian-blue bg-blue-50 shadow-sm'
                : 'border-meridian-border bg-white hover:bg-meridian-row-hov'
        }`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                isSelected ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-600'
            }`}>
                {getInitials(group.user.name)}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{group.user.name}</p>
                <p className="text-xs text-slate-400">{group.expenses.length} expense{group.expenses.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-right shrink-0">
                <p className={`font-extrabold text-sm flex items-center gap-0.5 ${isSelected ? 'text-brand-blue' : 'text-slate-800'}`}>
                    <IndianRupee className="w-3 h-3" />
                    {group.totalAmount.toLocaleString('en-IN')}
                </p>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'rotate-90 text-brand-blue' : 'text-slate-300'}`} />
        </div>
    </button>
);

const ExpenseList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        minAmount: '',
        maxAmount: '',
        paymentMethod: '',
        employee: '',
        cityTier: ''
    });

    const isPrivileged = ['admin', 'superadmin', 'accounts'].includes(user?.role);

    useEffect(() => { fetchExpenses(); }, [filterCategory, filters]);
    useEffect(() => { if (isPrivileged) fetchEmployees(); }, []);

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/users');
            setEmployees(res.data.data || res.data || []);
        } catch (err) {
            console.error('Failed to fetch employees', err);
        }
    };

    const fetchExpenses = async () => {
        try {
            const params = {};
            if (filterCategory) params.category = filterCategory;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.minAmount) params.minAmount = filters.minAmount;
            if (filters.maxAmount) params.maxAmount = filters.maxAmount;
            if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
            if (filters.employee) params.employee = filters.employee;
            if (filters.cityTier) params.cityTier = filters.cityTier;
            const res = await api.get('/expenses', { params });
            setExpenses(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch expenses', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await api.delete(`/expenses/${deleteTarget._id}`);
            fetchExpenses();
            setDeleteTarget(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete');
        } finally {
            setDeleting(false);
        }
    };

    const applyPreset = (preset) => {
        const { start, end } = preset.getValue();
        setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
    };

    const clearFilters = () => {
        setFilters({ startDate: '', endDate: '', minAmount: '', maxAmount: '', paymentMethod: '', employee: '', cityTier: '' });
        setFilterCategory('');
        setSelectedUserId(null);
    };

    const activeFilterCount = [filterCategory, filters.startDate, filters.minAmount, filters.maxAmount, filters.paymentMethod, filters.employee, filters.cityTier].filter(Boolean).length;

    const sq = search.toLowerCase();
    const filtered = !sq ? expenses : expenses.filter(e =>
        (e.description || '').toLowerCase().includes(sq) ||
        (e.vendor || '').toLowerCase().includes(sq) ||
        (e.category || '').toLowerCase().includes(sq) ||
        (e.createdBy?.name || '').toLowerCase().includes(sq) ||
        (e.travelFrom?.city || '').toLowerCase().includes(sq) ||
        (e.travelTo?.city || '').toLowerCase().includes(sq)
    );

    const totalAmount = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Group by user
    const groupedByUser = Object.values(
        filtered.reduce((acc, expense) => {
            const uId = expense.createdBy?._id || 'unassigned';
            if (!acc[uId]) {
                acc[uId] = {
                    user: expense.createdBy || { name: 'Unknown User', _id: 'unassigned' },
                    expenses: [],
                    totalAmount: 0
                };
            }
            acc[uId].expenses.push(expense);
            acc[uId].totalAmount += (expense.amount || 0);
            return acc;
        }, {})
    );

    const displayedExpenses = isPrivileged
        ? (selectedUserId
            ? filtered.filter(e => (e.createdBy?._id || 'unassigned') === selectedUserId)
            : filtered)
        : filtered;

    const selectedGroup = selectedUserId ? groupedByUser.find(g => (g.user._id || 'unassigned') === selectedUserId) : null;

    return (
        <div className="space-y-5 page-enter">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">Expenses</h1>
                    <p className="page-subtitle">
                        {expenses.length} expense{expenses.length !== 1 ? 's' : ''} recorded
                    </p>
                </div>
                <div className="flex gap-2">
                    {isPrivileged && (
                        <Link to="/expenses/analytics" className="btn-outline shrink-0 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Analytics
                        </Link>
                    )}
                    <Link to="/expenses/claims" className="btn-outline shrink-0 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Claims
                    </Link>
                    <button onClick={() => navigate('/expenses/add')} className="btn-primary shrink-0 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Expense
                    </button>
                </div>
            </div>

            {/* Summary Card */}
            <div className="card p-4 flex flex-wrap items-center gap-4 sm:gap-8">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                    <p className="text-2xl font-extrabold text-slate-800 flex items-center gap-1">
                        <IndianRupee className="w-5 h-5" />
                        {totalAmount.toLocaleString('en-IN')}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Count</p>
                    <p className="text-2xl font-extrabold text-slate-800">{displayedExpenses.length}</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="card p-3 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search expenses, vendor, city..."
                            className="input-field pl-10 h-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <select
                        className="input-field h-10 w-full sm:w-48"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="">All Categories</option>
                        {Object.entries(CATEGORY_META).map(([val, meta]) => (
                            <option key={val} value={val}>{meta.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`flex items-center gap-2 px-4 h-10 rounded-xl border-2 text-sm font-bold transition-all shrink-0 ${
                            showAdvancedFilters || activeFilterCount > 0
                                ? 'border-brand-blue text-brand-blue bg-brand-blue/5'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-brand-blue text-white text-[10px] flex items-center justify-center font-bold">{activeFilterCount}</span>
                        )}
                        {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                </div>

                {/* Advanced Filter Panel */}
                {showAdvancedFilters && (
                    <div className="border-t border-slate-100 pt-4 space-y-4 animate-fade-in">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quick Date</p>
                            <div className="flex flex-wrap gap-2">
                                {DATE_PRESETS.map(p => (
                                    <button key={p.label} onClick={() => applyPreset(p)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:border-brand-blue hover:text-brand-blue hover:bg-brand-blue/5 transition-all">
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From Date</label>
                                <input type="date" className="input-field h-9 mt-1" value={filters.startDate} onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To Date</label>
                                <input type="date" className="input-field h-9 mt-1" value={filters.endDate} onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Min Amount</label>
                                <input type="number" className="input-field h-9 mt-1" placeholder="₹0" value={filters.minAmount} onChange={e => setFilters(p => ({ ...p, minAmount: e.target.value }))} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Max Amount</label>
                                <input type="number" className="input-field h-9 mt-1" placeholder="₹∞" value={filters.maxAmount} onChange={e => setFilters(p => ({ ...p, maxAmount: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Method</label>
                                <select className="input-field h-9 mt-1" value={filters.paymentMethod} onChange={e => setFilters(p => ({ ...p, paymentMethod: e.target.value }))}>
                                    <option value="">All Methods</option>
                                    {Object.entries(PAYMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </select>
                            </div>
                            {isPrivileged && (
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employee</label>
                                    <select className="input-field h-9 mt-1" value={filters.employee} onChange={e => setFilters(p => ({ ...p, employee: e.target.value }))}>
                                        <option value="">All Employees</option>
                                        {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name} ({emp.employeeId})</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">City Tier</label>
                                <select className="input-field h-9 mt-1" value={filters.cityTier} onChange={e => setFilters(p => ({ ...p, cityTier: e.target.value }))}>
                                    <option value="">All Tiers</option>
                                    <option value="tier_1">Tier 1</option>
                                    <option value="tier_2">Tier 2</option>
                                    <option value="tier_3">Tier 3</option>
                                </select>
                            </div>
                        </div>
                        {activeFilterCount > 0 && (
                            <button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-700 transition-all">
                                Clear All Filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Expenses List */}
            {loading ? (
                <div className="card p-8 flex items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading expenses...
                </div>
            ) : filtered.length === 0 ? (
                <div className="card p-12 text-center">
                    <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-bold">No expenses found</p>
                    <p className="text-sm text-slate-400 mt-1">Add your first expense to get started</p>
                </div>
            ) : isPrivileged ? (
                <div className="space-y-5">
                    {/* User Cards Grid */}
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <UserIcon className="w-3 h-3" /> Team Members
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {groupedByUser.map(group => (
                                <UserCard
                                    key={group.user._id || 'unassigned'}
                                    group={group}
                                    isSelected={(group.user._id || 'unassigned') === selectedUserId}
                                    onClick={() => setSelectedUserId(prev =>
                                        prev === (group.user._id || 'unassigned') ? null : (group.user._id || 'unassigned')
                                    )}
                                />
                            ))}
                        </div>
                        {selectedUserId && (
                            <button
                                onClick={() => setSelectedUserId(null)}
                                className="mt-2 text-xs font-bold text-brand-blue hover:underline flex items-center gap-1"
                            >
                                <X className="w-3 h-3" /> Show all employees
                            </button>
                        )}
                    </div>

                    {/* Expenses for selected user or all */}
                    <div className="space-y-2">
                        {selectedGroup && (
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                                    {selectedGroup.user.name}
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                                        {selectedGroup.expenses.length} expense{selectedGroup.expenses.length !== 1 ? 's' : ''}
                                    </span>
                                </h3>
                                <p className="font-extrabold text-brand-blue flex items-center gap-0.5">
                                    <IndianRupee className="w-4 h-4" />
                                    {selectedGroup.totalAmount.toLocaleString('en-IN')}
                                </p>
                            </div>
                        )}
                        {displayedExpenses.map(expense => (
                            <ExpenseCard key={expense._id} expense={expense} isPrivileged={isPrivileged} setDeleteTarget={setDeleteTarget} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(expense => (
                        <ExpenseCard key={expense._id} expense={expense} isPrivileged={isPrivileged} setDeleteTarget={setDeleteTarget} />
                    ))}
                </div>
            )}

            {/* Delete Confirm */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in border border-meridian-border">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-7 h-7 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Expense?</h3>
                            <p className="text-sm text-slate-500">
                                Delete this {CATEGORY_META[deleteTarget.category]?.label || 'expense'} of <strong>{deleteTarget.amount?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</strong>?
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 flex gap-3">
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 btn-outline py-2.5">Cancel</button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ExpenseCard = ({ expense, isPrivileged, setDeleteTarget }) => {
    const cat = CATEGORY_META[expense.category] || CATEGORY_META.other;
    const Icon = cat.icon;
    const isClaimed = !!expense.claimRef;

    return (
        <div className="card p-4 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${cat.color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800 text-sm">
                            {expense.category === 'other' ? (expense.otherCategory || 'Other') : cat.label}
                        </p>
                        {expense.travelClass && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                                {expense.travelClass}
                            </span>
                        )}
                        {expense.cityTier && expense.cityTier !== 'na' && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">
                                {expense.cityTier.replace('_', '-').toUpperCase()}
                            </span>
                        )}
                        {isClaimed && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue">
                                {expense.claimRef?.claimNumber || 'Claimed'}
                            </span>
                        )}
                        {isPrivileged && expense.createdBy && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                {expense.createdBy.name}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        {expense.vendor && <span>{expense.vendor}</span>}
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(expense.expenseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {expense.travelFrom?.city && expense.travelTo?.city && (
                            <span className="hidden sm:inline">
                                {expense.travelFrom.city} → {expense.travelTo.city}
                            </span>
                        )}
                        {expense.bookingMode && expense.bookingMode !== 'other' && (
                            <span className="hidden sm:inline capitalize">{expense.bookingMode.replace('_', ' ')}</span>
                        )}
                    </div>
                    {expense.description && (
                        <p className="text-xs text-slate-400 mt-1 truncate">{expense.description}</p>
                    )}
                </div>
                <div className="text-right shrink-0">
                    <p className="font-extrabold text-slate-800">
                        {expense.amount?.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </p>
                    <p className="text-[10px] text-slate-400 capitalize">{expense.paymentMethod?.replace('_', ' ')}</p>
                </div>
                {!isClaimed && (
                    <button
                        onClick={() => setDeleteTarget(expense)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all shrink-0"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ExpenseList;
