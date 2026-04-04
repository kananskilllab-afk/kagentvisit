import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FileText, Search, MapPin, Calendar, Building2, Trash2, Edit, PlusCircle, Filter, X, Lock, Bell, Eye } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import VisitDetailModal from '../components/VisitDetailModal';

const STATUS_CFG = {
    submitted:       { label: 'Pending Review',  bg: 'bg-orange-50',  text: 'text-brand-orange', dot: 'bg-brand-orange', ring: 'ring-brand-orange/20' },
    reviewed:        { label: 'Reviewed',          bg: 'bg-blue-50',   text: 'text-brand-sky',    dot: 'bg-brand-sky',    ring: 'ring-brand-sky/20'    },
    action_required: { label: 'Action Required',  bg: 'bg-red-50',    text: 'text-red-600',       dot: 'bg-red-500',      ring: 'ring-red-400/20'      },
    closed:          { label: 'Closed',            bg: 'bg-green-50',  text: 'text-brand-green',  dot: 'bg-brand-green',  ring: 'ring-brand-green/20'  },
    draft:           { label: 'Draft',             bg: 'bg-slate-50',  text: 'text-slate-500',    dot: 'bg-slate-400',    ring: 'ring-slate-200'       },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.bg} ${cfg.text} ring-1 ${cfg.ring}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

const VisitsList = () => {
    const { user, isAdmin } = useAuth();
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [visitToDelete, setVisitToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlFormType = searchParams.get('formType');

    const isHomeVisit = urlFormType === 'home_visit' || user?.department === 'B2C' || user?.role === 'home_visit';

    const fetchVisits = async () => {
        setLoading(true);
        try {
            const query = urlFormType ? `?formType=${urlFormType}` : '';
            const res = await api.get(`/visits${query}`);
            setVisits(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch visits', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchVisits(); }, [urlFormType]);

    const handleApproveUnlock = async (visitId) => {
        setIsSubmitting(true);
        try {
            await api.put(`/visits/${visitId}/approve-unlock`, { unlock: true });
            fetchVisits();
            alert('Visit unlocked successfully');
        } catch (err) {
            alert('Failed to approve unlock: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteVisit = async () => {
        if (!visitToDelete) return;
        setIsSubmitting(true);
        try {
            await api.delete(`/visits/${visitToDelete._id}`);
            fetchVisits();
            setVisitToDelete(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete visit');
        } finally {
            setIsSubmitting(false);
        }
    };

    const q = searchTerm.toLowerCase();
    const filteredVisits = visits.filter(visit => {
        const matchesSearch = !q || (
            (visit?.meta?.companyName || '').toLowerCase().includes(q) ||
            (visit?.studentInfo?.name || '').toLowerCase().includes(q) ||
            (visit?.agencyProfile?.address || '').toLowerCase().includes(q) ||
            (visit?.location?.address || '').toLowerCase().includes(q) ||
            (visit?.submittedBy?.name || '').toLowerCase().includes(q)
        );
        const matchesStatus = !statusFilter || visit.status === statusFilter;
        return matchesSearch && matchesStatus;
    });



    return (
        <div className="space-y-5 page-enter">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">{isHomeVisit ? 'Home Visits' : 'Visit Reports'}</h1>
                    <p className="page-subtitle">
                        {filteredVisits.length} of {visits.length} {isHomeVisit ? 'home visits' : 'visit reports'}
                    </p>
                </div>
                {(user.role === 'user' || user.role === 'home_visit') && (
                    <button
                        onClick={() => navigate('/new-visit')}
                        className="btn-primary shrink-0 flex items-center gap-2 px-6 shadow-brand-blue/30 hover:shadow-brand-blue/40"
                    >
                        <PlusCircle className="w-4 h-4" />
                        New Report
                    </button>
                )}
            </div>

            {/* Search + Filter Bar */}
            <div className="glass p-4 rounded-3xl border border-white/60 shadow-glass">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={`Search ${isHomeVisit ? 'student, address' : 'agent/company, address'}...`}
                            className="input-field pl-10 h-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                        <select
                            className="input-field h-10 w-44 text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="submitted">Pending Review</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="action_required">Action Required</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="card p-8 space-y-3 animate-pulse">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-16 bg-slate-100 rounded-xl" />
                    ))}
                </div>
            ) : filteredVisits.length === 0 ? (
                <div className="card flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="font-bold text-slate-600 text-lg">No visits found</p>
                    <p className="text-sm text-slate-400 mt-1">
                        {searchTerm || statusFilter ? 'Try adjusting your filters' : 'Start by creating a new visit report'}
                    </p>
                    {!searchTerm && !statusFilter && (user.role === 'user' || user.role === 'home_visit') && (
                        <button onClick={() => navigate('/new-visit')} className="btn-primary mt-5">
                            Create First Report
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block glass rounded-[2rem] p-0 overflow-hidden shadow-glass border border-white/60">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="th">{isHomeVisit ? 'Student / Visit' : 'Agent / Company Name'}</th>
                                    <th className="th">Status</th>
                                    <th className="th">Location</th>
                                    <th className="th">Date</th>
                                    <th className="th text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredVisits.map((visit) => (
                                    <tr
                                        key={visit._id}
                                        onClick={() => setSelectedVisit(visit)}
                                        className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
                                    >
                                        <td className="td">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold shrink-0 group-hover:bg-brand-blue/20 transition-colors">
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-brand-blue transition-colors flex items-center gap-1.5">
                                                        {visit?.studentInfo?.name || visit?.meta?.companyName || 'Untitled'}
                                                        {visit.isLocked && <Lock className="w-3 h-3 text-red-400" title="Locked" />}
                                                        {isAdmin && visit.unlockRequestSent && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter bg-red-100 text-red-600 animate-pulse">
                                                                Unlock Req
                                                            </span>
                                                        )}
                                                        {!isAdmin && visit.status === 'action_required' && (
                                                            <Bell className="w-3 h-3 text-red-500 animate-bounce" title="Action Required By Admin" />
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-slate-400 truncate mt-0.5">
                                                        By: {visit?.submittedBy?.name || user?.name}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="td">
                                            <StatusBadge status={visit.status} />
                                        </td>
                                        <td className="td">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 max-w-[200px]">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span className="truncate">
                                                    {visit?.gpsLocation?.substring(0, 30) || visit?.location?.city || visit?.agencyProfile?.address?.substring(0, 30) || '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="td">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                {new Date(visit.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="td text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end gap-1.5">
                                                <button
                                                    onClick={() => setSelectedVisit(visit)}
                                                    className="p-1.5 rounded-lg border border-brand-sky/20 text-brand-sky hover:bg-brand-sky/5 transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                                {isAdmin && visit.unlockRequestSent && (
                                                    <button
                                                        onClick={() => handleApproveUnlock(visit._id)}
                                                        disabled={isSubmitting}
                                                        className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center gap-1.5 text-[10px] font-black uppercase pointer-events-auto"
                                                        title="Approve Unlock"
                                                    >
                                                        <Lock className="w-3.5 h-3.5" />
                                                        Unlock
                                                    </button>
                                                )}
                                                {(isAdmin || visit.submittedBy?._id === user?._id) && (
                                                    <button
                                                        onClick={() => navigate(`/edit-visit/${visit._id}`)}
                                                        className="p-1.5 rounded-lg border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5 transition-all"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {(user?.role === 'superadmin' || visit.submittedBy?._id === user?._id) && (
                                                    <button
                                                        onClick={() => setVisitToDelete(visit)}
                                                        className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-4">
                        {filteredVisits.map((visit) => (
                            <div
                                key={visit._id}
                                onClick={() => setSelectedVisit(visit)}
                                className="glass rounded-[2rem] p-5 border border-white/60 shadow-glass hover:shadow-glow hover:-translate-y-1 cursor-pointer transition-all duration-300"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
                                                {visit?.studentInfo?.name || visit?.meta?.companyName || 'Untitled'}
                                                {visit.isLocked && <Lock className="w-3 h-3 text-red-400" />}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-xs text-slate-400">
                                                    {new Date(visit.createdAt).toLocaleDateString()}
                                                </p>
                                                {isAdmin && visit.unlockRequestSent && (
                                                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[8px] font-black uppercase">
                                                        Unlock Req
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {isAdmin && visit.unlockRequestSent && (
                                            <button
                                                onClick={() => handleApproveUnlock(visit._id)}
                                                disabled={isSubmitting}
                                                className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center gap-1.5 text-[10px] font-black uppercase"
                                                title="Approve Unlock"
                                            >
                                                <Lock className="w-4 h-4" />
                                                Unlock
                                            </button>
                                        )}
                                        {(isAdmin || visit.submittedBy?._id === user?._id) && (
                                            <button
                                                onClick={() => navigate(`/edit-visit/${visit._id}`)}
                                                className="p-2 rounded-lg border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        )}
                                        {(user?.role === 'superadmin' || visit.submittedBy?._id === user?._id) && (
                                            <button
                                                onClick={() => setVisitToDelete(visit)}
                                                className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                                    <StatusBadge status={visit.status} />
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <MapPin className="w-3 h-3" />
                                        <span className="truncate max-w-[140px]">
                                            {visit?.gpsLocation?.substring(0, 25) || visit?.location?.city || visit?.agencyProfile?.address?.substring(0, 25) || 'No location'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Visit Detail Modal */}
            {selectedVisit && (
                <VisitDetailModal
                    visit={selectedVisit}
                    onClose={() => setSelectedVisit(null)}
                    onEdit={() => {
                        setSelectedVisit(null);
                        navigate(`/edit-visit/${selectedVisit._id}`);
                    }}
                />
            )}

            {/* Delete Modal */}
            {visitToDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-7 h-7 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Visit?</h3>
                            <p className="text-sm text-slate-500">
                                Permanently delete <strong className="text-slate-800">{visitToDelete.meta?.companyName || visitToDelete.studentInfo?.name || 'this visit'}</strong>? This cannot be undone.
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 flex gap-3">
                            <button onClick={() => setVisitToDelete(null)} className="flex-1 btn-outline py-2.5">Cancel</button>
                            <button
                                onClick={handleDeleteVisit}
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 transition-all"
                            >
                                {isSubmitting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisitsList;
