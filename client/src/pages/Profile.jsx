import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
    User as UserIcon,
    Mail,
    Shield,
    Building2,
    Globe,
    Lock,
    Eye,
    EyeOff,
    Save,
    BadgeCheck,
    LogOut,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

const ROLE_COLORS = {
    superadmin: 'bg-brand-purple/10 text-brand-purple border-brand-purple/20',
    admin:      'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
    home_visit: 'bg-brand-orange/10 text-brand-orange border-brand-orange/20',
    user:       'bg-brand-sky/10 text-brand-sky border-brand-sky/20',
};

const Profile = () => {
    const { user, logout } = useAuth();
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return setMessage({ type: 'error', text: 'New passwords do not match' });
        }
        setIsLoading(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await api.put('/auth/password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            if (res.data.success) {
                setMessage({ type: 'success', text: 'Password updated successfully!' });
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setIsChangingPassword(false);
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update password' });
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const roleColorClass = ROLE_COLORS[user.role] || ROLE_COLORS.user;
    const avatarLetter = user.name?.charAt(0)?.toUpperCase() || 'U';

    return (
        <div className="max-w-4xl mx-auto space-y-8 page-enter">
            {/* Profile Header */}
            <div className="card p-8 sm:p-10">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="w-24 h-24 rounded-lg bg-meridian-navy text-white flex items-center justify-center text-4xl font-extrabold shadow-meridian-card shrink-0">
                        {avatarLetter}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-black tracking-normal text-meridian-text">{user.name}</h1>
                        <p className="text-meridian-sub text-sm mt-0.5">{user.email}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${roleColorClass}`}>
                                <Shield className="w-3 h-3" />
                                {user.role.replace('_', ' ')}
                            </span>
                            {user.employeeId && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-meridian-bg text-meridian-text border border-meridian-border">
                                    <BadgeCheck className="w-3 h-3" />
                                    {user.employeeId}
                                </span>
                            )}
                            {user.department && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-meridian-bg text-meridian-text border border-meridian-border">
                                    <Building2 className="w-3 h-3" />
                                    {user.department}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Personal Info */}
                <div className="lg:col-span-1 card p-6">
                    <h3 className="font-extrabold text-slate-800 mb-5 pb-4 border-b border-slate-100">Personal Details</h3>
                    <div className="space-y-4">
                        {[
                            { icon: Mail,      label: 'Email',      value: user.email },
                            { icon: BadgeCheck, label: 'Employee ID', value: user.employeeId },
                            { icon: Building2, label: 'Department',  value: user.department || 'Not Assigned' },
                            { icon: Globe,     label: 'Region',     value: user.region || 'All Regions' },
                        ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="flex items-start gap-3">
                                <div className="p-2 bg-slate-50 rounded-xl text-slate-400 shrink-0">
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                                    <p className="text-sm font-semibold text-slate-700 truncate mt-0.5">{value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Security Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Password Section */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Lock className="w-4 h-4 text-brand-gold" />
                                Account Security
                            </h3>
                            {!isChangingPassword && (
                                <button
                                    onClick={() => { setIsChangingPassword(true); setMessage({ type: '', text: '' }); }}
                                    className="text-sm font-bold text-brand-blue hover:underline"
                                >
                                    Change Password
                                </button>
                            )}
                        </div>

                        {message.text && (
                            <div className={`mb-5 flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium ${
                                message.type === 'error'
                                    ? 'bg-red-50 text-red-700 border-red-100'
                                    : 'bg-green-50 text-green-700 border-green-100'
                            }`}>
                                {message.type === 'error'
                                    ? <AlertCircle className="w-4 h-4 shrink-0" />
                                    : <CheckCircle2 className="w-4 h-4 shrink-0" />
                                }
                                {message.text}
                            </div>
                        )}

                        {!isChangingPassword ? (
                            <div className="p-5 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-sm text-slate-500 italic">
                                    Your password provides secure access to the Agent Visit Portal. Keep it confidential and change it regularly.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handlePasswordChange} className="space-y-4 animate-fade-in">
                                {[
                                    { key: 'current', label: 'Current Password', field: 'currentPassword' },
                                    { key: 'new', label: 'New Password', field: 'newPassword' },
                                    { key: 'confirm', label: 'Confirm New Password', field: 'confirmPassword' },
                                ].map(({ key, label, field }) => (
                                    <div key={key}>
                                        <label className="label">{label}</label>
                                        <div className="relative">
                                            <input
                                                type={showPasswords[key] ? 'text' : 'password'}
                                                required
                                                className="input-field pr-11"
                                                value={passwordData[field]}
                                                onChange={(e) => setPasswordData({ ...passwordData, [field]: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => togglePasswordVisibility(key)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPasswords[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="btn-primary flex items-center gap-2 px-6"
                                    >
                                        {isLoading ? 'Updating...' : <><Save className="w-4 h-4" /> Update Password</>}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsChangingPassword(false)}
                                        className="btn-ghost px-6"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Sign Out */}
                    <div className="card p-6 bg-red-50/50 border-red-100 flex items-center justify-between">
                        <div>
                            <h4 className="font-bold text-slate-800">Sign Out</h4>
                            <p className="text-sm text-slate-500 mt-0.5">Securely end your current session.</p>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-red-700 transition-all shadow-md shadow-red-200"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
