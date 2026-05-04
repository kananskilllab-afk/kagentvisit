import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import api from '../utils/api';
import { 
    Building2, Search, PlusCircle, Filter, 
    MapPin, Calendar, 
    ChevronRight, ChevronLeft, Loader2, X, Edit2, Trash2, Shield, Upload, History
} from 'lucide-react';
import AgentHistoryCard from '../components/AgentHistoryCard';

// ── Constants ──────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

// ── AgentRow (memoized to prevent all rows re-rendering on search) ─────────────
const AgentRow = React.memo(({ agent, onEdit, onDelete, onHistory }) => (
    <tr className="hover:bg-slate-50/60 transition-colors">
        <td className="px-6 py-3.5">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple/10 to-brand-blue/10 flex items-center justify-center font-black text-brand-purple shrink-0 text-sm">
                    {agent.name?.charAt(0) || 'A'}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <p className="font-bold text-slate-800 truncate max-w-[200px] text-sm">{agent.name}</p>
                        {agent.rank && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border leading-none uppercase tracking-tighter shrink-0 ${
                                agent.rank === 'Platinum' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                agent.rank === 'Diamond'  ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                agent.rank === 'Gold'     ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/20' :
                                agent.rank === 'Silver'   ? 'bg-slate-50 text-slate-500 border-slate-200' :
                                'bg-orange-50 text-orange-600 border-orange-100'
                            }`}>
                                {agent.rank}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-black border uppercase tracking-tighter ${agent.isActive ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                            {agent.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {agent.agentType && <span className="text-[10px] text-slate-400 font-bold uppercase">{agent.agentType}</span>}
                    </div>
                </div>
            </div>
        </td>
        <td className="px-6 py-3.5 text-center">
            <div className="flex flex-col items-center gap-0.5">
                <p className="text-xs font-bold text-slate-600">{agent.mobile || '—'}</p>
                <p className="text-[10px] text-slate-400">{agent.emailId || '—'}</p>
            </div>
        </td>
        <td className="px-6 py-3.5">
            <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {[agent.city, agent.state].filter(Boolean).join(', ')}{agent.pinCode ? ` (${agent.pinCode})` : ''}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{[agent.region, agent.zone].filter(Boolean).join(' • ')}</p>
        </td>
        <td className="px-6 py-3.5">
            <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-brand-blue/10 flex items-center justify-center text-[8px] font-bold text-brand-blue shrink-0">BDM</span>
                    <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{agent.bdmName || '—'}</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded bg-brand-gold/10 flex items-center justify-center text-[8px] font-bold text-brand-gold shrink-0">RM</span>
                    <p className="text-xs text-slate-500 truncate max-w-[120px]">{agent.rmName || '—'}</p>
                </div>
            </div>
        </td>
        <td className="px-6 py-3.5 text-center">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-sky/10 text-brand-sky font-bold text-xs ring-1 ring-brand-sky/20">
                {agent.visitCount || 0}
            </span>
        </td>
        <td className="px-6 py-3.5">
            {agent.lastVisitDate ? (
                <div>
                    <p className="text-xs font-bold text-slate-600">{new Date(agent.lastVisitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    <p className="text-[10px] text-slate-400">{new Date(agent.lastVisitDate).getFullYear()}</p>
                </div>
            ) : <span className="text-xs text-slate-300">—</span>}
        </td>
        <td className="px-6 py-3.5">
            <div className="flex items-center justify-center gap-1.5">
                <button
                    onClick={() => onHistory(agent)}
                    className="p-1.5 hover:bg-green-50 rounded-lg text-slate-400 hover:text-green-700 transition-colors"
                    title="History"
                >
                    <History className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => onEdit(agent)}
                    className="p-1.5 hover:bg-brand-blue/10 rounded-lg text-slate-400 hover:text-brand-blue transition-colors"
                    title="Edit"
                >
                    <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => onDelete(agent._id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                    title="Delete"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </td>
    </tr>
));
AgentRow.displayName = 'AgentRow';

const AgentCard = React.memo(({ agent, onEdit, onDelete, onHistory }) => (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-purple/10 to-brand-blue/10 flex items-center justify-center font-black text-brand-purple shrink-0 text-sm">
                {agent.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                    <p className="font-bold text-slate-800 truncate text-sm">{agent.name}</p>
                    {agent.rank && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded border leading-none uppercase tracking-tighter shrink-0 bg-slate-50 text-slate-500 border-slate-200">
                            {agent.rank}
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-black border uppercase tracking-tighter ${agent.isActive ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {agent.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {agent.agentType && <span className="text-[10px] text-slate-400 font-bold uppercase">{agent.agentType}</span>}
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onHistory(agent)} className="p-2 rounded-lg border border-green-200 text-green-700 hover:bg-green-50" title="History">
                    <History className="w-4 h-4" />
                </button>
                <button onClick={() => onEdit(agent)} className="p-2 rounded-lg border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5" title="Edit">
                    <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(agent._id)} className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50" title="Delete">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-xs">
            <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Contact</p>
                <p className="font-bold text-slate-700 break-words">{agent.mobile || '-'}</p>
                <p className="text-slate-500 break-words">{agent.emailId || '-'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Location</p>
                <p className="font-bold text-slate-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="min-w-0 break-words">{[agent.city, agent.state].filter(Boolean).join(', ') || '-'}</span>
                </p>
                <p className="text-slate-500">{[agent.region, agent.zone].filter(Boolean).join(' / ') || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">BDM</p>
                    <p className="font-bold text-slate-700 truncate">{agent.bdmName || '-'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Visits</p>
                    <p className="font-black text-brand-sky">{agent.visitCount || 0}</p>
                </div>
            </div>
        </div>
    </div>
));
AgentCard.displayName = 'AgentCard';

// ── Main Component ─────────────────────────────────────────────────────────────
const ManageAgent = () => {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState('');      // raw input
    const [searchTerm, setSearchTerm] = useState('');        // debounced
    const [selectedRank, setSelectedRank] = useState('All Ranks');
    const [activeTab, setActiveTab] = useState('all');
    const [page, setPage] = useState(1);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [editingAgent, setEditingAgent] = useState(null);
    const [historyAgent, setHistoryAgent] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const fileInputRef = useRef(null);
    const searchDebounceRef = useRef(null);

    useEffect(() => { fetchAgents(); }, []);

    // Debounce search so filtering only runs 300ms after typing stops
    const handleSearchInput = useCallback((e) => {
        const val = e.target.value;
        setSearchInput(val);
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setSearchTerm(val);
            setPage(1);
        }, 300);
    }, []);

    const handleRankChange = useCallback((e) => {
        setSelectedRank(e.target.value);
        setPage(1);
    }, []);

    const handleTabChange = useCallback((tab) => {
        setActiveTab(tab);
        setPage(1);
    }, []);

    const fetchAgents = async () => {
        setLoading(true);
        try {
            const res = await api.get('/agents');
            setAgents(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch agents', err);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/agents/import', formData);
            alert(res.data.message);
            setShowImportModal(false);
            fetchAgents();
        } catch (err) {
            alert(err.response?.data?.message || 'Error importing agents');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSaveAgent = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData(e.currentTarget);
            const data = Object.fromEntries(formData.entries());
            data.isActive = data.isActive === 'on' || data.isActive === 'true';
            data.allowRegistration = data.allowRegistration === 'on' || data.allowRegistration === 'true';
            if (editingAgent) {
                await api.put(`/agents/${editingAgent._id}`, data);
            } else {
                await api.post('/agents', data);
            }
            setShowRegisterModal(false);
            setEditingAgent(null);
            fetchAgents();
        } catch (err) {
            alert(err.response?.data?.message || 'Error saving agent');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAgent = useCallback(async (id) => {
        if (!window.confirm('Are you sure you want to delete this agent?')) return;
        try {
            await api.delete(`/agents/${id}`);
            setAgents(prev => prev.filter(a => a._id !== id));
        } catch (err) {
            alert('Failed to delete agent');
        }
    }, []);

    const handleEditAgent = useCallback((agent) => {
        setEditingAgent(agent);
        setShowRegisterModal(true);
    }, []);

    const downloadTemplate = () => {
        const headers = ['Rank', 'K-Apply Account Name', 'Category Type', 'Type', 'EmailId', 'Mobile', 'City', 'State', 'Zone', 'Team', 'RM Name', 'Active', 'Created On', 'OnBoarded Date', 'Updated Date', 'Allow Registration', 'AccountUrl', 'BDM', 'Region'];
        const blob = new Blob([headers.join(',') + '\n'], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'agent_import_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteAll = async () => {
        if (!window.confirm('CRITICAL: Delete ALL agents? This cannot be undone.')) return;
        if (prompt('Type "DELETE ALL" to confirm:') !== 'DELETE ALL') return;
        try {
            const res = await api.delete('/agents/delete-all');
            alert(res.data.message);
            fetchAgents();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to clear directory');
        }
    };

    // ── Memoized filtering + pagination ───────────────────────────────────────
    const filteredAgents = useMemo(() => {
        const lc = searchTerm.toLowerCase();
        return agents.filter(a => {
            if (searchTerm && !(
                (a.name || '').toLowerCase().includes(lc) ||
                (a.bdmName || '').toLowerCase().includes(lc) ||
                (a.pinCode || '').toLowerCase().includes(lc) ||
                (a.city || '').toLowerCase().includes(lc)
            )) return false;
            if (activeTab === 'active' && !a.isActive) return false;
            if (activeTab === 'inactive' && a.isActive) return false;
            if (selectedRank !== 'All Ranks' && a.rank !== selectedRank) return false;
            return true;
        });
    }, [agents, searchTerm, activeTab, selectedRank]);

    const totalPages = Math.max(1, Math.ceil(filteredAgents.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageAgents = useMemo(
        () => filteredAgents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
        [filteredAgents, safePage]
    );

    // Summary stats
    const stats = useMemo(() => ({
        total: agents.length,
        active: agents.filter(a => a.isActive).length,
        filtered: filteredAgents.length,
        recent: agents.filter(a => a.onboardingDate && new Date(a.onboardingDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
    }), [agents, filteredAgents.length]);

    return (
        <div className="space-y-4 sm:space-y-6 page-enter pb-10 max-w-full overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 sm:gap-6 min-w-0">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3 min-w-0">
                        <div className="p-2 sm:p-2.5 bg-brand-purple/10 rounded-2xl shrink-0">
                            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-brand-purple" />
                        </div>
                        <span className="truncate">Manage Agent</span>
                    </h1>
                    <p className="text-sm sm:text-base text-slate-500 mt-2 font-medium">Directory of all registered agencies and companies.</p>
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-full xl:w-auto">
                    <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls,.csv" className="hidden" />
                    <button onClick={() => setShowImportModal(true)} className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:bg-slate-50 transition-colors" title="Bulk Import">
                        <Upload className="w-4 h-4" />Import
                    </button>
                    <button onClick={() => { setEditingAgent(null); setShowRegisterModal(true); }} className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-colors">
                        <PlusCircle className="w-4 h-4" />New Agent
                    </button>
                    <div className="hidden sm:block w-[1px] h-8 bg-slate-100 mx-1" />
                    <button onClick={handleDeleteAll} className="p-2.5 hover:bg-red-50 rounded-xl text-red-400 hover:text-red-600 transition-colors" title="Clear Directory">
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button onClick={fetchAgents} className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors" title="Refresh">
                        <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Register / Edit Modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-5xl max-h-[94vh] shadow-2xl overflow-hidden flex flex-col animate-fade-in">
                        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">{editingAgent ? 'Edit Agent' : 'Register New Agent'}</h3>
                                <p className="text-xs text-slate-500 font-medium">Enter detailed agency information</p>
                            </div>
                            <button onClick={() => { setShowRegisterModal(false); setEditingAgent(null); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveAgent} className="flex-1 overflow-y-auto p-5 sm:p-8 no-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-purple">Identification</h4>
                                    <div>
                                        <label className="label">K-Apply Account Name</label>
                                        <input name="name" required className="input-field" placeholder="K-Apply Profile Name" defaultValue={editingAgent?.name || ''} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="label">Rank</label>
                                            <select name="rank" className="input-field" defaultValue={editingAgent?.rank || ''}>
                                                <option value="">Select Rank</option>
                                                {['Bronze','Diamond','Gold','Platinum','Silver'].map(r => <option key={r}>{r}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Type</label>
                                            <input name="agentType" className="input-field" placeholder="e.g. Master" defaultValue={editingAgent?.agentType || ''} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Category Type</label>
                                        <input name="categoryType" className="input-field" placeholder="e.g. Platinum" defaultValue={editingAgent?.categoryType || ''} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-blue">Connectivity</h4>
                                    <div>
                                        <label className="label">Email ID</label>
                                        <input name="emailId" type="email" className="input-field" placeholder="contact@agency.com" defaultValue={editingAgent?.emailId || ''} />
                                    </div>
                                    <div>
                                        <label className="label">Mobile Number</label>
                                        <input name="mobile" className="input-field" placeholder="+91 ..." defaultValue={editingAgent?.mobile || ''} />
                                    </div>
                                    <div>
                                        <label className="label">Account URL</label>
                                        <input name="accountUrl" className="input-field" placeholder="https://..." defaultValue={editingAgent?.accountUrl || ''} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="label">City</label>
                                            <input name="city" className="input-field" placeholder="Ahmedabad" defaultValue={editingAgent?.city || ''} />
                                        </div>
                                        <div>
                                            <label className="label">State</label>
                                            <input name="state" className="input-field" placeholder="Gujarat" defaultValue={editingAgent?.state || ''} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">PIN Code</label>
                                        <input name="pinCode" className="input-field" placeholder="380001" defaultValue={editingAgent?.pinCode || ''} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-gold">Governance</h4>
                                    <div>
                                        <label className="label">BDM</label>
                                        <input name="bdmName" className="input-field" placeholder="Assigned BDM" defaultValue={editingAgent?.bdmName || ''} />
                                    </div>
                                    <div>
                                        <label className="label">RM Name</label>
                                        <input name="rmName" className="input-field" placeholder="Relationship Manager" defaultValue={editingAgent?.rmName || ''} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="label">Zone</label>
                                            <input name="zone" className="input-field" placeholder="West" defaultValue={editingAgent?.zone || ''} />
                                        </div>
                                        <div>
                                            <label className="label">Team</label>
                                            <input name="team" className="input-field" placeholder="Team A" defaultValue={editingAgent?.team || ''} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Region</label>
                                        <select name="region" className="input-field" defaultValue={editingAgent?.region || ''}>
                                            <option value="">Select Region</option>
                                            {['Region 1','Region 2','Region 3','Region 4','Region 5'].map(r => <option key={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">OnBoarded Date</label>
                                        <input name="onboardingDate" type="date" className="input-field" defaultValue={editingAgent?.onboardingDate ? new Date(editingAgent.onboardingDate).toISOString().split('T')[0] : ''} />
                                    </div>
                                    <div className="flex flex-col gap-2 py-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" name="isActive" defaultChecked={editingAgent ? editingAgent.isActive : true} className="w-4 h-4 rounded" />
                                            <span className="text-sm font-bold text-slate-700">Active</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" name="allowRegistration" defaultChecked={editingAgent ? editingAgent.allowRegistration : true} className="w-4 h-4 rounded" />
                                            <span className="text-sm font-bold text-slate-700">Allow Registration</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-8 sm:pt-10 sticky bottom-0 bg-white">
                                <button type="button" onClick={() => { setShowRegisterModal(false); setEditingAgent(null); }} className="flex-1 btn-outline py-3.5 rounded-2xl">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-[2] btn-primary py-3.5 rounded-2xl">
                                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Processing...</> : (editingAgent ? 'Update Agent' : 'Register Agent')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Bulk Import Agents</h3>
                                <p className="text-xs text-slate-500 font-medium">Upload CSV or Excel file</p>
                            </div>
                            <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="p-6 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50 flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-brand-purple">
                                    <Upload className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-slate-700">Select your directory file</p>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Supports .csv, .xlsx, .xls</p>
                                </div>
                                <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                                    {isImporting ? 'Processing...' : 'Choose File'}
                                </button>
                            </div>
                            <button onClick={downloadTemplate} className="w-full flex items-center justify-between p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl hover:bg-indigo-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-white rounded-xl text-indigo-500 shadow-sm">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-slate-800">CSV Template</p>
                                        <p className="text-xs text-slate-500">Download formatted structure</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-indigo-300" />
                            </button>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                            <button onClick={() => setShowImportModal(false)} className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {historyAgent && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setHistoryAgent(null)}>
                    <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Agent History</h3>
                                <p className="text-xs font-bold text-slate-400">{historyAgent.name}</p>
                            </div>
                            <button onClick={() => setHistoryAgent(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <AgentHistoryCard agentId={historyAgent._id} agentName={historyAgent.name} />
                    </div>
                </div>
            )}

            {/* KPI Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                    { label: 'Total Agents',   value: stats.total,    color: 'text-brand-purple', bg: 'bg-brand-purple/10', Icon: Building2 },
                    { label: 'Active Status',  value: stats.active,   color: 'text-brand-blue',   bg: 'bg-brand-blue/10',   Icon: Calendar },
                    { label: 'Records Found',  value: stats.filtered, color: 'text-brand-gold',   bg: 'bg-brand-gold/10',   Icon: Shield },
                    { label: 'Recently Added', value: stats.recent,   color: 'text-brand-green',  bg: 'bg-brand-green/10',  Icon: PlusCircle },
                ].map((stat) => (
                    <div key={stat.label} className="card p-4 sm:p-5 min-w-0">
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                            <stat.Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                        </div>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest truncate">{stat.label}</p>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-800 mt-1">{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="card p-0 overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">
                    <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search name, BDM or pincode…"
                                className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pl-11 pr-4 text-sm font-medium focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple outline-none transition-all shadow-sm"
                                value={searchInput}
                                onChange={handleSearchInput}
                            />
                        </div>
                        <div className="relative w-full sm:w-48">
                            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-600 focus:ring-4 focus:ring-brand-purple/10 outline-none appearance-none shadow-sm cursor-pointer"
                                value={selectedRank}
                                onChange={handleRankChange}
                            >
                                {['All Ranks','Bronze','Diamond','Gold','Platinum','Silver'].map(r => <option key={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2 w-full xl:w-auto overflow-x-auto no-scrollbar">
                        {['all','active','inactive'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                                    activeTab === tab
                                        ? 'bg-brand-purple text-white shadow-md shadow-brand-purple/20'
                                        : 'bg-white text-slate-500 border border-slate-200 hover:border-brand-purple/30'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full min-w-[1040px] text-left">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                {['K-Apply Account Name','Contact','Region/Location','BDM/RM','Visits','Last Visit','Actions'].map(h => (
                                    <th key={h} className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-brand-purple mx-auto mb-3" />
                                        <p className="text-sm font-bold text-slate-400">Synchronizing agent directory…</p>
                                    </td>
                                </tr>
                            ) : pageAgents.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-slate-400">
                                        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-10" />
                                        <p className="font-bold text-sm">No agents found</p>
                                        <p className="text-xs mt-1">Try resetting your search or filters</p>
                                    </td>
                                </tr>
                            ) : pageAgents.map(agent => (
                                <AgentRow
                                    key={agent._id}
                                    agent={agent}
                                    onEdit={handleEditAgent}
                                    onDelete={handleDeleteAgent}
                                    onHistory={setHistoryAgent}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="lg:hidden p-3 sm:p-4 space-y-3 bg-slate-50/30">
                    {loading ? (
                        <div className="py-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-purple mx-auto mb-3" />
                            <p className="text-sm font-bold text-slate-400">Synchronizing agent directory...</p>
                        </div>
                    ) : pageAgents.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-10" />
                            <p className="font-bold text-sm">No agents found</p>
                            <p className="text-xs mt-1">Try resetting your search or filters</p>
                        </div>
                    ) : pageAgents.map(agent => (
                        <AgentCard
                            key={agent._id}
                            agent={agent}
                            onEdit={handleEditAgent}
                            onDelete={handleDeleteAgent}
                            onHistory={setHistoryAgent}
                        />
                    ))}
                </div>

                {/* Pagination footer */}
                <div className="p-4 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-slate-400">
                    <span>Showing {Math.min((safePage - 1) * PAGE_SIZE + 1, filteredAgents.length)}–{Math.min(safePage * PAGE_SIZE, filteredAgents.length)} of {filteredAgents.length} agents</span>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                                className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-3 py-1 bg-brand-purple/10 text-brand-purple rounded-lg font-extrabold">
                                {safePage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={safePage === totalPages}
                                className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageAgent;
