import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
    ArrowLeft, BarChart3, IndianRupee, Loader2, Receipt, FileText,
    TrendingUp, Users, ShieldCheck, ShieldAlert, ShieldX, MapPin,
    Wallet, CreditCard, Calendar, PieChart, Activity
} from 'lucide-react';

const CATEGORY_COLORS = {
    flight: '#3b82f6', train: '#22c55e', bus: '#f97316', cab: '#eab308',
    metro: '#a855f7', hotel: '#ec4899', food: '#ef4444', agent_entertainment: '#6366f1',
    internet_phone: '#06b6d4', parking_toll: '#6b7280', visa_passport: '#14b8a6',
    office_supplies: '#f59e0b', other: '#94a3b8'
};

const CATEGORY_LABELS = {
    flight: 'Flight', train: 'Train', bus: 'Bus', cab: 'Cab/Taxi',
    metro: 'Metro', hotel: 'Hotel', food: 'Food', agent_entertainment: 'Agent Spend',
    internet_phone: 'Internet/Phone', parking_toll: 'Parking/Toll', visa_passport: 'Visa/Passport',
    office_supplies: 'Supplies', other: 'Other'
};

const TIER_LABELS = { tier_1: 'Tier 1', tier_2: 'Tier 2', tier_3: 'Tier 3' };
const TIER_CAPS = { tier_1: 1000, tier_2: 600, tier_3: 400 };

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PAYMENT_LABELS = { cash: 'Cash', upi: 'UPI', card: 'Card', company_card: 'Company Card', other: 'Other' };

const StatCard = ({ icon: Icon, label, value, subtext, color = 'text-brand-blue', bg = 'bg-brand-blue/10' }) => (
    <div className="card p-5 space-y-2">
        <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            <div className={`p-2 rounded-xl ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
            </div>
        </div>
        <p className="text-2xl font-extrabold text-slate-800">{value}</p>
        {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
    </div>
);

// CSS-based horizontal bar chart
const HBarChart = ({ data, labelKey, valueKey, colorKey, formatValue, maxItems = 10 }) => {
    const items = (data || []).slice(0, maxItems);
    const maxVal = Math.max(...items.map(d => d[valueKey] || 0), 1);
    return (
        <div className="space-y-2">
            {items.map((item, idx) => (
                <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600 truncate">{item[labelKey] || 'Unknown'}</span>
                        <span className="font-extrabold text-slate-700 shrink-0 ml-2">{formatValue ? formatValue(item[valueKey]) : item[valueKey]}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${(item[valueKey] / maxVal) * 100}%`,
                                backgroundColor: item[colorKey] || CATEGORY_COLORS[item._id] || '#6366f1'
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

// CSS-based donut chart
const DonutChart = ({ data, colorFn, labelFn, valueFn }) => {
    const total = data.reduce((s, d) => s + (valueFn(d) || 0), 0);
    let rotation = 0;
    const segments = data.map(d => {
        const pct = total > 0 ? (valueFn(d) / total) * 100 : 0;
        const seg = { ...d, pct, rotation };
        rotation += pct;
        return seg;
    });

    // Build conic-gradient
    let gradient = '';
    let cumPct = 0;
    segments.forEach(seg => {
        const color = colorFn(seg);
        gradient += `${color} ${cumPct}% ${cumPct + seg.pct}%, `;
        cumPct += seg.pct;
    });
    gradient = gradient.replace(/, $/, '');

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                className="w-40 h-40 rounded-full relative"
                style={{ background: `conic-gradient(${gradient || '#e2e8f0 0% 100%'})` }}
            >
                <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-lg font-extrabold text-slate-800">₹{(total / 1000).toFixed(0)}K</p>
                        <p className="text-[9px] text-slate-400 font-bold">TOTAL</p>
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
                {segments.filter(s => s.pct > 0).map((seg, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorFn(seg) }} />
                        {labelFn(seg)} ({seg.pct.toFixed(0)}%)
                    </div>
                ))}
            </div>
        </div>
    );
};

// Mini trend line using SVG
const TrendLine = ({ data, height = 120 }) => {
    if (!data || data.length === 0) return <p className="text-sm text-slate-400 text-center py-4">No data available</p>;

    const maxVal = Math.max(...data.map(d => d.total || 0), 1);
    const w = 100;
    const h = height;
    const padding = 10;
    const usableW = w - padding * 2;
    const usableH = h - padding * 2;

    const points = data.map((d, i) => ({
        x: padding + (i / Math.max(data.length - 1, 1)) * usableW,
        y: padding + usableH - ((d.total || 0) / maxVal) * usableH,
        ...d
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${h - padding} L ${points[0].x} ${h - padding} Z`;

    return (
        <div className="relative">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height: `${height}px` }}>
                <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={areaD} fill="url(#trendGrad)" />
                <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="2" fill="#6366f1" />
                ))}
            </svg>
            <div className="flex justify-between px-2 mt-2">
                {data.map((d, i) => {
                    const [y, m] = (d._id || '').split('-');
                    return (
                        <div key={i} className="text-center" style={{ flex: 1, maxWidth: `${100 / data.length}%` }}>
                            <p className="text-[9px] font-bold text-slate-400">{MONTH_NAMES[parseInt(m) - 1] || m}</p>
                            <p className="text-[9px] font-bold text-slate-600">₹{((d.total || 0) / 1000).toFixed(0)}K</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ExpenseAnalytics = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

    const isPrivileged = ['admin', 'superadmin', 'accounts'].includes(user?.role);

    useEffect(() => {
        if (!isPrivileged) {
            navigate('/expenses');
            return;
        }
        fetchAnalytics();
    }, [dateRange]);

    const fetchAnalytics = async () => {
        try {
            const params = {};
            if (dateRange.startDate) params.startDate = dateRange.startDate;
            if (dateRange.endDate) params.endDate = dateRange.endDate;
            const res = await api.get('/expenses/analytics', { params });
            setData(res.data.data);
        } catch (err) {
            console.error('Failed to fetch analytics', err);
        } finally {
            setLoading(false);
        }
    };

    const applyQuickDate = (months) => {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - months);
        setDateRange({
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading analytics...
            </div>
        );
    }

    const overview = data?.overview || {};
    const compliance = data?.complianceStats || [];
    const totalAudited = compliance.reduce((s, c) => s + c.count, 0);
    const compliantCount = compliance.find(c => c._id === 'compliant')?.count || 0;
    const avgScore = totalAudited > 0
        ? Math.round(compliance.reduce((s, c) => s + (c.avgScore || 0) * c.count, 0) / totalAudited)
        : null;

    const claimStatusMap = {};
    (data?.claimStatusStats || []).forEach(s => { claimStatusMap[s._id] = s; });

    return (
        <div className="space-y-6 page-enter">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/expenses')} className="p-2 rounded-xl hover:bg-slate-100 transition-all">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="page-title">Expense Analytics</h1>
                        <p className="page-subtitle">Comprehensive spending insights and policy compliance</p>
                    </div>
                </div>
            </div>

            {/* Date Filter */}
            <div className="card p-4 flex flex-wrap items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div className="flex gap-2 flex-wrap">
                    {[
                        { label: 'Last Month', months: 1 },
                        { label: 'Last 3M', months: 3 },
                        { label: 'Last 6M', months: 6 },
                        { label: 'Last Year', months: 12 },
                    ].map(q => (
                        <button
                            key={q.label}
                            onClick={() => applyQuickDate(q.months)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:border-brand-blue hover:text-brand-blue hover:bg-brand-blue/5 transition-all"
                        >
                            {q.label}
                        </button>
                    ))}
                    {dateRange.startDate && (
                        <button
                            onClick={() => setDateRange({ startDate: '', endDate: '' })}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:text-red-700 transition-all"
                        >
                            Clear
                        </button>
                    )}
                </div>
                <div className="flex gap-2 ml-auto">
                    <input type="date" className="input-field h-8 text-xs w-36" value={dateRange.startDate} onChange={e => setDateRange(p => ({ ...p, startDate: e.target.value }))} />
                    <input type="date" className="input-field h-8 text-xs w-36" value={dateRange.endDate} onChange={e => setDateRange(p => ({ ...p, endDate: e.target.value }))} />
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard
                    icon={IndianRupee}
                    label="Total Spending"
                    value={`₹${(overview.totalExpenses || 0).toLocaleString('en-IN')}`}
                    subtext={`${overview.totalExpenseCount || 0} expenses`}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StatCard
                    icon={FileText}
                    label="Total Claims"
                    value={overview.totalClaims || 0}
                    subtext={`₹${(overview.totalClaimAmount || 0).toLocaleString('en-IN')} value`}
                    color="text-purple-600"
                    bg="bg-purple-50"
                />
                <StatCard
                    icon={Receipt}
                    label="Avg Expense"
                    value={`₹${(overview.avgExpenseAmount || 0).toLocaleString('en-IN')}`}
                    subtext="per expense"
                    color="text-green-600"
                    bg="bg-green-50"
                />
                <StatCard
                    icon={Activity}
                    label="Pending"
                    value={overview.pendingClaims || 0}
                    subtext="awaiting review"
                    color="text-orange-600"
                    bg="bg-orange-50"
                />
                <StatCard
                    icon={ShieldCheck}
                    label="Audited"
                    value={totalAudited}
                    subtext={avgScore !== null ? `${avgScore}% avg score` : 'No audits yet'}
                    color="text-violet-600"
                    bg="bg-violet-50"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Compliance"
                    value={totalAudited > 0 ? `${Math.round(compliantCount / totalAudited * 100)}%` : '—'}
                    subtext={`${compliantCount}/${totalAudited} compliant`}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
            </div>

            {/* Charts Row 1: Category Breakdown + Monthly Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Category Breakdown */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-brand-blue" />
                        Spending by Category
                    </h3>
                    {(data?.categoryBreakdown || []).length > 0 ? (
                        <DonutChart
                            data={data.categoryBreakdown}
                            colorFn={(d) => CATEGORY_COLORS[d._id] || '#94a3b8'}
                            labelFn={(d) => CATEGORY_LABELS[d._id] || d._id}
                            valueFn={(d) => d.total}
                        />
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-8">No data available</p>
                    )}
                </div>

                {/* Monthly Trend */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-brand-blue" />
                        Monthly Spending Trend
                    </h3>
                    <TrendLine data={data?.monthlyTrends || []} height={200} />
                </div>
            </div>

            {/* Charts Row 2: Employee + Compliance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Spenders */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand-blue" />
                        Top Spenders
                    </h3>
                    {(data?.employeeSpending || []).length > 0 ? (
                        <HBarChart
                            data={data.employeeSpending.map(d => ({
                                ...d,
                                _label: `${d.name} (${d.count})`,
                                _color: '#6366f1'
                            }))}
                            labelKey="_label"
                            valueKey="total"
                            colorKey="_color"
                            formatValue={v => `₹${v.toLocaleString('en-IN')}`}
                        />
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-8">No data available</p>
                    )}
                </div>

                {/* Policy Compliance */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-brand-blue" />
                        Policy Compliance
                    </h3>
                    {totalAudited > 0 ? (
                        <div className="space-y-5">
                            <div className="flex items-center justify-center gap-8">
                                {compliance.map(c => {
                                    const cfgs = {
                                        compliant: { icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50', label: 'Compliant' },
                                        warning: { icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Warning' },
                                        violation: { icon: ShieldX, color: 'text-red-600', bg: 'bg-red-50', label: 'Violation' },
                                    };
                                    const cfg = cfgs[c._id] || cfgs.warning;
                                    const Icon = cfg.icon;
                                    return (
                                        <div key={c._id} className="text-center">
                                            <div className={`w-16 h-16 rounded-2xl ${cfg.bg} flex items-center justify-center mx-auto mb-2`}>
                                                <Icon className={`w-8 h-8 ${cfg.color}`} />
                                            </div>
                                            <p className="text-2xl font-extrabold text-slate-800">{c.count}</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${cfg.color}`}>{cfg.label}</p>
                                            <p className="text-[10px] text-slate-400">Avg: {Math.round(c.avgScore || 0)}%</p>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                                {compliance.map(c => {
                                    const pct = totalAudited > 0 ? (c.count / totalAudited) * 100 : 0;
                                    const colors = { compliant: '#22c55e', warning: '#f59e0b', violation: '#ef4444' };
                                    return (
                                        <div
                                            key={c._id}
                                            className="h-full transition-all duration-700"
                                            style={{ width: `${pct}%`, backgroundColor: colors[c._id] || '#94a3b8' }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <ShieldCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400">No audits conducted yet</p>
                            <p className="text-xs text-slate-300 mt-1">Run AI audits on claims to see compliance data</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Row 3: City Tier + Payment + Claim Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* City Tier */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-brand-blue" />
                        City Tier Breakdown
                    </h3>
                    {(data?.cityTierBreakdown || []).length > 0 ? (
                        <div className="space-y-3">
                            {data.cityTierBreakdown.map(tier => {
                                const cap = TIER_CAPS[tier._id] || 0;
                                const avgDaily = tier.avg || 0;
                                const overCap = avgDaily > cap;
                                return (
                                    <div key={tier._id} className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-600">{TIER_LABELS[tier._id] || tier._id}</span>
                                            <span className="text-xs font-extrabold text-slate-700">₹{tier.total.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                            <span>{tier.count} expenses</span>
                                            <span>•</span>
                                            <span className={overCap ? 'text-red-500 font-bold' : 'text-green-600'}>
                                                Avg ₹{Math.round(avgDaily)} {cap > 0 ? `/ ₹${cap} cap` : ''}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${overCap ? 'bg-red-400' : 'bg-teal-400'}`}
                                                style={{ width: `${Math.min((avgDaily / Math.max(cap, avgDaily)) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-6">No city tier data</p>
                    )}
                </div>

                {/* Payment Methods */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-brand-blue" />
                        Payment Methods
                    </h3>
                    {(data?.paymentMethodStats || []).length > 0 ? (
                        <div className="space-y-3">
                            {data.paymentMethodStats.map(pm => {
                                const total = data.paymentMethodStats.reduce((s, p) => s + p.total, 0);
                                const pct = total > 0 ? (pm.total / total * 100) : 0;
                                const pmColors = { cash: '#22c55e', upi: '#3b82f6', card: '#a855f7', company_card: '#6366f1', other: '#94a3b8' };
                                return (
                                    <div key={pm._id} className="flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pmColors[pm._id] || '#94a3b8' }} />
                                        <span className="text-xs font-bold text-slate-600 flex-1">{PAYMENT_LABELS[pm._id] || pm._id}</span>
                                        <span className="text-xs font-extrabold text-slate-700">₹{pm.total.toLocaleString('en-IN')}</span>
                                        <span className="text-[10px] text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-6">No data</p>
                    )}
                </div>

                {/* Claim Status Distribution */}
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-blue" />
                        Claim Status
                    </h3>
                    {(data?.claimStatusStats || []).length > 0 ? (
                        <div className="space-y-2">
                            {data.claimStatusStats.map(s => {
                                const statusColors = {
                                    draft: '#94a3b8', submitted: '#f97316', under_review: '#3b82f6',
                                    approved: '#22c55e', rejected: '#ef4444', needs_justification: '#f59e0b', paid: '#10b981'
                                };
                                const statusLabels = {
                                    draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review',
                                    approved: 'Approved', rejected: 'Rejected', needs_justification: 'Justification', paid: 'Paid'
                                };
                                return (
                                    <div key={s._id} className="flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: statusColors[s._id] || '#94a3b8' }} />
                                        <span className="text-xs font-bold text-slate-600 flex-1">{statusLabels[s._id] || s._id}</span>
                                        <span className="text-xs font-extrabold text-slate-700">{s.count}</span>
                                        <span className="text-[10px] text-slate-400">₹{(s.totalAmount || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-6">No claims data</p>
                    )}
                </div>
            </div>

            {/* Top Expenses Table */}
            {(data?.topExpenses || []).length > 0 && (
                <div className="card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-brand-blue" />
                        Highest Expenses
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-2">Category</th>
                                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-2">Employee</th>
                                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-2 hidden sm:table-cell">Vendor</th>
                                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-2 hidden sm:table-cell">Date</th>
                                    <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-2">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topExpenses.map(exp => (
                                    <tr key={exp._id} className="border-b border-slate-50 last:border-0">
                                        <td className="py-2.5">
                                            <span className="text-xs font-bold text-slate-600">{CATEGORY_LABELS[exp.category] || exp.category}</span>
                                        </td>
                                        <td className="py-2.5 text-xs text-slate-500">{exp.createdBy?.name || '—'}</td>
                                        <td className="py-2.5 text-xs text-slate-400 hidden sm:table-cell">{exp.vendor || '—'}</td>
                                        <td className="py-2.5 text-xs text-slate-400 hidden sm:table-cell">{new Date(exp.expenseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                                        <td className="py-2.5 text-right font-bold text-slate-700">₹{(exp.amount || 0).toLocaleString('en-IN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseAnalytics;
