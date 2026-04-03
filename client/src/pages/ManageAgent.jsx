import React, { useEffect, useState, useRef } from 'react';
import api from '../utils/api';
import { 
    Building2, Search, PlusCircle, Filter, 
    MoreVertical, User, MapPin, Phone, 
    Globe, ExternalLink, Calendar, 
    ChevronRight, Loader2, X, Edit2, Trash2, Shield, Upload
} from 'lucide-react';

const ManageAgent = () => {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRank, setSelectedRank] = useState('All Ranks');
    const [activeTab, setActiveTab] = useState('all');
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [editingAgent, setEditingAgent] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchAgents();
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

    const handleDeleteAgent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this agent?')) return;
        try {
            await api.delete(`/agents/${id}`);
            fetchAgents();
        } catch (err) {
            alert('Failed to delete agent');
        }
    };

    const downloadTemplate = () => {
        const headers = [
            'Rank', 'K-Apply Account Name', 'Category Type', 'Type', 'EmailId', 'Mobile', 
            'City', 'State', 'Zone', 'Team', 'RM Name', 'Active', 'Created On', 
            'OnBoarded Date', 'Updated Date', 'Allow Registration', 'AccountUrl', 'BDM', 'Region'
        ];
        const csvContent = headers.join(',') + '\n';
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'agent_import_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteAll = async () => {
        if (!window.confirm('CRITICAL: Are you sure you want to PERMANENTLY DELETE ALL registered agents? This action cannot be undone.')) return;
        const confirmText = prompt('Please type "DELETE ALL" to confirm this operation:');
        if (confirmText !== 'DELETE ALL') return;

        try {
            const res = await api.delete('/agents/delete-all');
            alert(res.data.message);
            fetchAgents();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to clear directory');
        }
    };

    const filteredAgents = agents.filter(a => {
        const matchesSearch = 
            (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (a.bdmName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (a.pinCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (a.city || '').toLowerCase().includes(searchTerm.toLowerCase());
            
        const matchesStatus = 
            activeTab === 'all' || 
            (activeTab === 'active' ? a.isActive : !a.isActive);
            
        const matchesRank = 
            selectedRank === 'All Ranks' || 
            a.rank === selectedRank;
            
        return matchesSearch && matchesStatus && matchesRank;
    });

    return (
        <div className="space-y-6 page-enter pb-10">
            {/* Header section with Stats */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
                        <div className="p-2.5 bg-brand-purple/10 rounded-2xl">
                            <Building2 className="w-8 h-8 text-brand-purple" />
                        </div>
                        Manage Agent
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Directory of all registered agencies and companies.</p>
                </div>
                
                <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImport} 
                        accept=".xlsx, .xls, .csv"
                        className="hidden" 
                    />
                    <button 
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:bg-slate-50 transition-all"
                        title="Bulk Import (CSV/Excel)"
                    >
                        <Upload className="w-4 h-4" />
                        Import
                    </button>
                    <button 
                        onClick={() => { setEditingAgent(null); setShowRegisterModal(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <PlusCircle className="w-4 h-4" />
                        New Agent
                    </button>
                    
                    <div className="w-[1px] h-8 bg-slate-100 mx-1" />
                    
                    <button 
                        onClick={handleDeleteAll} 
                        className="p-2.5 hover:bg-red-50 rounded-xl text-red-400 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                        title="Clear Directory (Danger Zone)"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>

                    <button onClick={fetchAgents} className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-500 transition-all border border-transparent hover:border-slate-100">
                        <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Registration Modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-fade-in">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">{editingAgent ? 'Edit Agent' : 'Register New Agent'}</h3>
                                <p className="text-xs text-slate-500 font-medium">Enter detailed agency information for the directory</p>
                            </div>
                            <button onClick={() => setShowRegisterModal(false)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveAgent} className="flex-1 overflow-y-auto p-8 no-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Basic Info */}
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
                                                <option value="Bronze">Bronze</option>
                                                <option value="Diamond">Diamond</option>
                                                <option value="Gold">Gold</option>
                                                <option value="Platinum">Platinum</option>
                                                <option value="Silver">Silver</option>
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

                                {/* Contact & Location */}
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

                                {/* Management & Mapping */}
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
                                </div>

                                {/* Extra Details */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Regional Mapping</h4>
                                    <div>
                                        <label className="label">Region</label>
                                        <select name="region" className="input-field" defaultValue={editingAgent?.region || ''}>
                                            <option value="">Select Region</option>
                                            <option value="Region 1">Region 1</option>
                                            <option value="Region 2">Region 2</option>
                                            <option value="Region 3">Region 3</option>
                                            <option value="Region 4">Region 4</option>
                                            <option value="Region 5">Region 5</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Auto Region Mapping</label>
                                        <input name="autoRegionMapping" className="input-field" defaultValue={editingAgent?.autoRegionMapping || ''} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Dates</h4>
                                    <div>
                                        <label className="label">OnBoarded Date</label>
                                        <input name="onboardingDate" type="date" className="input-field" defaultValue={editingAgent?.onboardingDate ? new Date(editingAgent.onboardingDate).toISOString().split('T')[0] : ''} />
                                    </div>
                                    {editingAgent && (
                                        <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-400 font-bold uppercase">
                                            <div>
                                                <p className="mb-1">Created On</p>
                                                <p className="bg-slate-50 p-2 rounded-lg">{new Date(editingAgent.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <div>
                                                <p className="mb-1">Updated Date</p>
                                                <p className="bg-slate-50 p-2 rounded-lg">{new Date(editingAgent.updatedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2 py-2">
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" name="isActive" id="isActive" defaultChecked={editingAgent ? editingAgent.isActive : true} className="w-5 h-5 rounded-lg border-slate-200 text-brand-purple focus:ring-brand-purple/20" />
                                            <label htmlFor="isActive" className="text-sm font-bold text-slate-700">Active</label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" name="allowRegistration" id="allowRegistration" defaultChecked={editingAgent ? editingAgent.allowRegistration : true} className="w-5 h-5 rounded-lg border-slate-200 text-brand-purple focus:ring-brand-purple/20" />
                                            <label htmlFor="allowRegistration" className="text-sm font-bold text-slate-700">Allow Registration</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-10 sticky bottom-0 bg-white">
                                <button type="button" onClick={() => setShowRegisterModal(false)} className="flex-1 btn-outline py-3.5 rounded-2xl">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-[2] btn-primary py-3.5 rounded-2xl shadow-xl shadow-brand-blue/20">
                                    {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : (editingAgent ? 'Update Agent Data' : 'Complete Registration')}
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
                                <p className="text-xs text-slate-500 font-medium">Upload CSV or Excel file to import many agents</p>
                            </div>
                            <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100">
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
                                
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isImporting}
                                    className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    {isImporting ? 'Processing File...' : 'Choose File'}
                                </button>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Resources</p>
                                <button 
                                    onClick={downloadTemplate}
                                    className="w-full flex items-center justify-between p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl group hover:bg-indigo-50 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-white rounded-xl text-indigo-500 shadow-sm border border-indigo-50">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-slate-800">CSV Template</p>
                                            <p className="text-xs text-slate-500">Download formatted structure</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-indigo-300 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                            <button 
                                onClick={() => setShowImportModal(false)}
                                className="flex-1 px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Agents', value: agents.length, color: 'brand-purple', icon: Building2 },
                    { label: 'Active Status', value: agents.filter(a => a.isActive).length, color: 'brand-blue', icon: Calendar },
                    { label: 'Records Found', value: filteredAgents.length, color: 'brand-gold', icon: Shield },
                    { label: 'Recently Added', value: agents.filter(a => a.onboardingDate && new Date(a.onboardingDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length, color: 'brand-green', icon: PlusCircle },
                ].map((stat, i) => (
                    <div key={i} className="card p-5 group hover:shadow-xl transition-all duration-300 overflow-hidden relative">
                        <div className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-5 rounded-full scale-0 group-hover:scale-150 transition-transform duration-500 bg-current text-${stat.color.split('-').pop()}-500`} />
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className={`p-2 bg-${stat.color}/10 rounded-xl text-${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        <h3 className="text-2xl font-black text-slate-800 mt-1">{stat.value}</h3>
                    </div>
                ))}
            </div>

            {/* Search and Table Section */}
            <div className="card p-0 overflow-hidden shadow-card-premium border-slate-100">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row gap-4 justify-between items-center">
                    <div className="flex flex-col md:flex-row gap-3 flex-1 w-full">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search Name, BDM or Pincode..." 
                                className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pl-12 pr-4 text-sm font-medium focus:ring-4 focus:ring-brand-purple/10 focus:border-brand-purple outline-none transition-all shadow-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <div className="relative min-w-[200px]">
                            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select 
                                className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-600 focus:ring-4 focus:ring-brand-purple/10 outline-none appearance-none shadow-sm cursor-pointer"
                                value={selectedRank}
                                onChange={(e) => setSelectedRank(e.target.value)}
                            >
                                <option>All Ranks</option>
                                <option>Bronze</option>
                                <option>Diamond</option>
                                <option>Gold</option>
                                <option>Platinum</option>
                                <option>Silver</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                        {['all', 'active', 'inactive'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                    activeTab === tab 
                                    ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' 
                                    : 'bg-white text-slate-500 border border-slate-200 hover:border-brand-purple/30'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">K-Apply Account Name</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Contact</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Region/Location</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">BDM/RM</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Visits</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Last Visit</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-20">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
                                            <p className="text-sm font-bold">Synchronizing agent directory...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredAgents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-slate-400">
                                        <Building2 className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                        <p className="font-bold">No agents found matching your filters</p>
                                        <p className="text-xs mt-1">Try resetting your search or rank filters</p>
                                    </td>
                                </tr>
                            ) : filteredAgents.map((agent) => (
                                <tr key={agent._id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-purple/10 to-brand-blue/10 flex items-center justify-center font-black text-brand-purple shadow-sm group-hover:scale-105 transition-transform">
                                                {agent.name?.charAt(0) || 'A'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <p className="font-bold text-slate-800 group-hover:text-brand-purple transition-colors truncate max-w-[200px]">{agent.name}</p>
                                                    {agent.rank && (
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border leading-none uppercase tracking-tighter ${
                                                            agent.rank === 'Platinum' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                            agent.rank === 'Diamond'  ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                            agent.rank === 'Gold'     ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/20' :
                                                            agent.rank === 'Silver'   ? 'bg-slate-50 text-slate-500 border-slate-200' :
                                                            'bg-orange-50 text-orange-600 border-orange-100' // Bronze
                                                        }`}>
                                                            {agent.rank}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-tighter ${agent.isActive ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                        {agent.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                    {agent.agentType && <span className="text-[10px] text-slate-400 font-bold uppercase">{agent.agentType}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <p className="text-xs font-bold text-slate-600">{agent.mobile || '—'}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{agent.emailId || '—'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                {agent.city}, {agent.state} {agent.pinCode ? `(${agent.pinCode})` : ''}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{agent.region} • {agent.zone}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-brand-blue/10 flex items-center justify-center text-[9px] font-bold text-brand-blue">
                                                    BDM
                                                </div>
                                                <p className="text-xs font-bold text-slate-700">{agent.bdmName || '—'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-lg bg-brand-gold/10 flex items-center justify-center text-[9px] font-bold text-brand-gold">
                                                    RM
                                                </div>
                                                <p className="text-xs font-medium text-slate-500">{agent.rmName || '—'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-sky/10 text-brand-sky font-bold text-xs ring-1 ring-brand-sky/20">
                                            {agent.visitCount || 0}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {agent.lastVisitDate ? (
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-xs font-bold text-slate-600">{new Date(agent.lastVisitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">{new Date(agent.lastVisitDate).getFullYear()}</p>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => { setEditingAgent(agent); setShowRegisterModal(true); }}
                                                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-brand-blue hover:shadow-md border border-transparent hover:border-slate-100 transition-all"
                                                title="Edit Agent"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteAgent(agent._id)}
                                                className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-red-600 hover:shadow-md border border-transparent hover:border-slate-100 transition-all"
                                                title="Delete Agent"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-4 border-t border-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Showing {filteredAgents.length} Agents</span>
                </div>
            </div>
        </div>
    );
};

export default ManageAgent;
