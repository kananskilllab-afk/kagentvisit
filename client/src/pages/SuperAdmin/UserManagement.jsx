import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import {
    Users,
    UserPlus,
    Search,
    Mail,
    Shield,
    Trash2,
    UserCheck,
    UserX,
    Edit2,
    X,
    Loader2,
    Link2,
    Check,
    ClipboardList
} from 'lucide-react';

const FORM_ACCESS_OPTIONS = [
    { value: 'b2b_visit',     label: 'B2B Visit Form',  icon: '🏢' },
    { value: 'b2c_visit',     label: 'B2C Visit Form',  icon: '🏠' },
    { value: 'post_field_day',label: 'Post Field Day',  icon: '📋' },
    { value: 'daily_report',      label: 'Daily Report',           icon: '📝' },
    { value: 'post_demo_feedback', label: 'Post-Demo Feedback',    icon: '💬' },
];

const ROLE_BADGE = {
    superadmin:   'bg-brand-purple/10 text-brand-purple border-brand-purple/20',
    admin:        'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
    home_visit:   'bg-brand-orange/10 text-brand-orange border-brand-orange/20',
    user:         'bg-brand-sky/10 text-brand-sky border-brand-sky/20',
    accounts:     'bg-brand-gold/10 text-brand-gold border-brand-gold/20',
    regional_bdm: 'bg-brand-green/10 text-brand-green border-brand-green/20',
};

const DEPT_BADGE = {
    B2B: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
    B2C: 'bg-brand-gold/10 text-brand-gold border-brand-gold/20',
};

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [assignModal, setAssignModal] = useState(null); // admin user object
    const [assignedIds, setAssignedIds] = useState([]);
    const [assignSearch, setAssignSearch] = useState('');
    const [assignSaving, setAssignSaving] = useState(false);
    const [formAccess, setFormAccess] = useState([]);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData(e.currentTarget);
            const data = Object.fromEntries(formData.entries());
            if (editingUser && !data.passwordHash) delete data.passwordHash;
            if (data.role === 'user' && data.department === 'B2C') data.role = 'home_visit';
            data.formAccess = formAccess;
            if (editingUser) {
                await api.put(`/users/${editingUser._id}`, data);
            } else {
                await api.post('/users', { ...data, isActive: true });
            }
            setShowAddModal(false);
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.message || 'Error saving user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleUserStatus = async (user) => {
        try {
            await api.put(`/users/${user._id}`, { isActive: !user.isActive });
            fetchUsers();
        } catch (err) {
            console.error('Error updating status', err);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setIsSubmitting(true);
        try {
            await api.delete(`/users/${userToDelete._id}`);
            fetchUsers();
            setUserToDelete(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openAssignModal = (adminUser) => {
        setAssignModal(adminUser);
        setAssignedIds(adminUser.assignedEmployees?.map(e => typeof e === 'object' ? e._id : e) || []);
        setAssignSearch('');
    };

    const toggleAssign = (userId) => {
        setAssignedIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const saveAssignments = async () => {
        if (!assignModal) return;
        setAssignSaving(true);
        try {
            await api.put(`/users/${assignModal._id}`, { assignedEmployees: assignedIds });
            fetchUsers();
            setAssignModal(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save assignments');
        } finally {
            setAssignSaving(false);
        }
    };

    const uq = searchTerm.toLowerCase();
    const filteredUsers = !uq ? users : users.filter(u =>
        (u?.name || '').toLowerCase().includes(uq) ||
        (u?.email || '').toLowerCase().includes(uq) ||
        (u?.employeeId || '').toLowerCase().includes(uq)
    );

    const toggleFormAccess = (value) => {
        setFormAccess(prev =>
            prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
        );
    };

    const openAdd = () => { setEditingUser(null); setFormAccess([]); setShowAddModal(true); };
    const openEdit = (user) => { setEditingUser(user); setFormAccess(user.formAccess || []); setShowAddModal(true); };

    return (
        <div className="space-y-5 page-enter">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">{users.length} team members across all departments</p>
                </div>
                <button onClick={openAdd} className="btn-primary shrink-0 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add User
                </button>
            </div>

            {/* Search Bar */}
            <div className="card p-3 sm:p-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email or employee ID..."
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
                    <div className="text-xs font-bold text-slate-500 shrink-0 bg-slate-100 px-3 py-2 rounded-lg">
                        {filteredUsers.length} users
                    </div>
                </div>
            </div>

            {/* Users Table */}
            {loading ? (
                <div className="card p-8 flex items-center justify-center gap-3 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading users...
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block card p-0 overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="th">User</th>
                                    <th className="th">Employee ID</th>
                                    <th className="th">Dept</th>
                                    <th className="th">Role</th>
                                    <th className="th">Status</th>
                                    <th className="th">Joined</th>
                                    <th className="th text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400">
                                            No users found
                                        </td>
                                    </tr>
                                ) : filteredUsers.map((user) => {
                                    const dept = user.department || (user.role === 'home_visit' ? 'B2C' : 'B2B');
                                    const displayRole = user.role === 'home_visit' ? 'user' : user.role;
                                    return (
                                        <tr key={user._id} className="hover:bg-blue-50/20 transition-colors">
                                            <td className="td">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-sm shrink-0">
                                                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{user?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <Mail className="w-3 h-3" />
                                                            {user?.email}
                                                        </p>
                                                        {user?.formAccess?.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {user.formAccess.map(f => {
                                                                    const opt = FORM_ACCESS_OPTIONS.find(o => o.value === f);
                                                                    return opt ? (
                                                                        <span key={f} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-brand-blue/8 text-brand-blue text-[9px] font-bold border border-brand-blue/15">
                                                                            {opt.icon} {opt.label}
                                                                        </span>
                                                                    ) : null;
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="td">
                                                <code className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                                    {user?.employeeId || '—'}
                                                </code>
                                            </td>
                                            <td className="td">
                                                <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold border ${DEPT_BADGE[dept] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                    {dept}
                                                </span>
                                            </td>
                                            <td className="td">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${ROLE_BADGE[user.role] || ROLE_BADGE.user}`}>
                                                    <Shield className="w-3 h-3" />
                                                    {displayRole}
                                                </span>
                                            </td>
                                            <td className="td">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                                    user.isActive ? 'bg-brand-green/10 text-brand-green' : 'bg-red-50 text-red-600'
                                                }`}>
                                                    {user.isActive
                                                        ? <><UserCheck className="w-3 h-3" /> Active</>
                                                        : <><UserX className="w-3 h-3" /> Inactive</>
                                                    }
                                                </span>
                                            </td>
                                            <td className="td text-xs text-slate-500">
                                                {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="td">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => openEdit(user)}
                                                        className="p-1.5 rounded-lg border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5 transition-all"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    {user.role === 'admin' && (
                                                        <button
                                                            onClick={() => openAssignModal(user)}
                                                            className="p-1.5 rounded-lg border border-brand-purple/20 text-brand-purple hover:bg-brand-purple/5 transition-all"
                                                            title="Assign Employees"
                                                        >
                                                            <Link2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => toggleUserStatus(user)}
                                                        className={`p-1.5 rounded-lg border transition-all ${
                                                            user.isActive
                                                                ? 'border-brand-orange/20 text-brand-orange hover:bg-brand-orange/5'
                                                                : 'border-brand-green/20 text-brand-green hover:bg-brand-green/5'
                                                        }`}
                                                        title={user.isActive ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                                    </button>
                                                    <button
                                                        onClick={() => setUserToDelete(user)}
                                                        className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                        {filteredUsers.map((user) => {
                            const dept = user.department || (user.role === 'home_visit' ? 'B2C' : 'B2B');
                            return (
                                <div key={user._id} className="card space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold">
                                                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{user.name}</p>
                                                <p className="text-xs text-slate-400">{user.email}</p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                            user.isActive ? 'bg-brand-green/10 text-brand-green' : 'bg-red-50 text-red-600'
                                        }`}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${DEPT_BADGE[dept] || ''}`}>{dept}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLE_BADGE[user.role] || ROLE_BADGE.user}`}>
                                            {user.role === 'home_visit' ? 'user' : user.role}
                                        </span>
                                        {user.employeeId && (
                                            <code className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                                                {user.employeeId}
                                            </code>
                                        )}
                                    </div>
                                    <div className="flex gap-2 pt-1 border-t border-slate-50">
                                        <button onClick={() => openEdit(user)} className="flex-1 py-2 rounded-xl border border-brand-blue/20 text-brand-blue text-xs font-bold hover:bg-brand-blue/5">
                                            Edit
                                        </button>
                                        <button onClick={() => toggleUserStatus(user)} className={`flex-1 py-2 rounded-xl border text-xs font-bold ${user.isActive ? 'border-brand-orange/20 text-brand-orange' : 'border-brand-green/20 text-brand-green'}`}>
                                            {user.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button onClick={() => setUserToDelete(user)} className="flex-1 py-2 rounded-xl border border-red-200 text-red-500 text-xs font-bold hover:bg-red-50">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Add/Edit User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl animate-fade-in max-h-[92vh] sm:max-h-[90vh] flex flex-col">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{editingUser ? 'Edit User' : 'Add New User'}</h3>
                                <p className="text-xs text-slate-400 mt-0.5">{editingUser ? 'Update account details' : 'Create a new team member account'}</p>
                            </div>
                            <button
                                onClick={() => { setShowAddModal(false); setEditingUser(null); }}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveUser} className="flex flex-col flex-1 overflow-hidden">
                        <div className="p-5 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="label">Full Name</label>
                                <input name="name" required className="input-field" placeholder="John Doe" defaultValue={editingUser?.name || ''} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Employee ID</label>
                                    <input name="employeeId" required className="input-field" placeholder="K-1001" defaultValue={editingUser?.employeeId || ''} />
                                </div>
                                <div>
                                    <label className="label">Department</label>
                                    <select name="department" required className="input-field" defaultValue={editingUser?.department || (editingUser?.role === 'home_visit' ? 'B2C' : 'B2B')}>
                                        <option value="B2B">B2B</option>
                                        <option value="B2C">B2C</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label">Role</label>
                                <select name="role" required className="input-field" defaultValue={editingUser?.role === 'home_visit' ? 'user' : (editingUser?.role || 'user')}>
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    <option value="accounts">Accounts</option>
                                    <option value="superadmin">SuperAdmin</option>
                                </select>
                            </div>

                            {/* Form Access */}
                            <div>
                                <label className="label flex items-center gap-1.5">
                                    <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                                    Form Access
                                </label>
                                <p className="text-[11px] text-slate-400 mb-2">Select which forms this user can access</p>
                                <div className="space-y-2">
                                    {FORM_ACCESS_OPTIONS.map(opt => {
                                        const checked = formAccess.includes(opt.value);
                                        return (
                                            <label
                                                key={opt.value}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all select-none ${
                                                    checked
                                                        ? 'border-brand-blue bg-brand-blue/5'
                                                        : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                                    checked
                                                        ? 'border-brand-blue bg-brand-blue text-white'
                                                        : 'border-slate-300'
                                                }`}>
                                                    {checked && <Check className="w-3 h-3" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="sr-only"
                                                    checked={checked}
                                                    onChange={() => toggleFormAccess(opt.value)}
                                                />
                                                <span className="text-sm">{opt.icon}</span>
                                                <span className={`text-sm font-semibold ${checked ? 'text-brand-blue' : 'text-slate-600'}`}>
                                                    {opt.label}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="label">Email Address</label>
                                <input name="email" type="email" required className="input-field" placeholder="john@kanan.co" defaultValue={editingUser?.email || ''} />
                            </div>
                            <div>
                                <label className="label">{editingUser ? 'New Password (leave blank to keep current)' : 'Initial Password'}</label>
                                <input name="passwordHash" type="password" required={!editingUser} className="input-field" placeholder="••••••••" />
                            </div>
                        </div>
                        {/* Sticky footer */}
                        <div className="p-5 border-t border-slate-100 flex gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddModal(false); setEditingUser(null); }}
                                    className="flex-1 btn-outline py-3"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                                        : editingUser ? 'Update Account' : 'Create Account'
                                    }
                                </button>
                        </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {userToDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-7 h-7 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete User?</h3>
                            <p className="text-sm text-slate-500">
                                Permanently delete <strong className="text-slate-800">{userToDelete.name}</strong>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 flex gap-3">
                            <button onClick={() => setUserToDelete(null)} className="flex-1 btn-outline py-2.5">Cancel</button>
                            <button
                                onClick={handleDeleteUser}
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Employees Modal */}
            {assignModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl animate-fade-in max-h-[85vh] flex flex-col">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Assign Employees</h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Select employees to assign to <strong>{assignModal.name}</strong>
                                </p>
                            </div>
                            <button
                                onClick={() => setAssignModal(null)}
                                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-4 border-b border-slate-50 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    className="input-field pl-10 h-10"
                                    value={assignSearch}
                                    onChange={(e) => setAssignSearch(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-2 font-bold">
                                {assignedIds.length} employee{assignedIds.length !== 1 ? 's' : ''} assigned
                            </p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                            {users
                                .filter(u =>
                                    u._id !== assignModal._id &&
                                    ['user', 'home_visit'].includes(u.role) &&
                                    u.isActive &&
                                    (!assignSearch || u.name?.toLowerCase().includes(assignSearch.toLowerCase()) || u.employeeId?.toLowerCase().includes(assignSearch.toLowerCase()))
                                )
                                .map(emp => {
                                    const isAssigned = assignedIds.includes(emp._id);
                                    return (
                                        <button
                                            key={emp._id}
                                            type="button"
                                            onClick={() => toggleAssign(emp._id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                                isAssigned
                                                    ? 'border-brand-purple bg-brand-purple/5'
                                                    : 'border-slate-100 hover:border-slate-200'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                                                isAssigned ? 'border-brand-purple bg-brand-purple text-white' : 'border-slate-300'
                                            }`}>
                                                {isAssigned && <Check className="w-3 h-3" />}
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-xs shrink-0">
                                                {emp.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-700 truncate">{emp.name}</p>
                                                <p className="text-xs text-slate-400">{emp.employeeId} &middot; {emp.department || 'B2B'}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>
                        <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0">
                            <button onClick={() => setAssignModal(null)} className="flex-1 btn-outline py-2.5">
                                Cancel
                            </button>
                            <button
                                onClick={saveAssignments}
                                disabled={assignSaving}
                                className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2"
                            >
                                {assignSaving
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                                    : <><Link2 className="w-4 h-4" /> Save Assignments</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
