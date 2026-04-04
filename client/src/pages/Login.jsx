import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

const schema = z.object({
    email:    z.string().email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

    const onSubmit = async (data) => {
        setIsLoading(true);
        setError('');
        try {
            const result = await login(data.email, data.password);
            if (result.success) {
                navigate('/');
            } else {
                setError(result.message || 'Login failed. Please try again.');
            }
        } catch (err) {
            if (!err.response) {
                setError('Cannot connect to server. Please ensure the backend is running.');
            } else {
                setError(err.response?.data?.message || 'An error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
            {/* Ambient Background Mesh */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-blue/10 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-brand-sky/20 blur-[120px]" />
                <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-brand-purple/10 blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-md animate-fade-in">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-[2rem] shadow-glass mb-6">
                        <img src="/logo.png" alt="Kanan" className="h-10 w-auto object-contain" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Agent Portal</h1>
                    <p className="text-slate-500 mt-2 text-sm font-medium">Sign in to manage your visit reports.</p>
                </div>

                {/* Card */}
                <div className="bg-white/70 backdrop-blur-3xl rounded-[2rem] shadow-glass border border-white/60 overflow-hidden transition-all duration-300">
                    <div className="h-1.5 w-full bg-gradient-to-r from-brand-blue to-brand-sky" />

                    <div className="p-8 sm:p-10">
                        {/* Error */}
                        {error && (
                            <div className="mb-6 flex items-start gap-3 p-4 bg-red-50/80 backdrop-blur-sm border border-red-100 rounded-2xl text-red-700 animate-slide-down shadow-sm">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                                <p className="text-sm font-semibold">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Email */}
                            <div>
                                <label className="label text-[10px] text-slate-400">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-blue transition-colors pointer-events-none" />
                                    <input
                                        {...register('email')}
                                        type="email"
                                        autoComplete="email"
                                        className={`input-field pl-11 py-3.5 ${errors.email ? 'border-red-400 focus:ring-red-400/20' : ''}`}
                                        placeholder="name@kanan.co"
                                    />
                                </div>
                                {errors.email && <p className="mt-2 text-[11px] text-red-500 font-bold">{errors.email.message}</p>}
                            </div>

                            {/* Password */}
                            <div>
                                <label className="label text-[10px] text-slate-400">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-blue transition-colors pointer-events-none" />
                                    <input
                                        {...register('password')}
                                        type={showPass ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        className={`input-field pl-11 pr-12 py-3.5 ${errors.password ? 'border-red-400 focus:ring-red-400/20' : ''}`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass(v => !v)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-blue transition-colors"
                                    >
                                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.password && <p className="mt-2 text-[11px] text-red-500 font-bold">{errors.password.message}</p>}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-4 h-14 bg-gradient-to-r from-brand-blue to-brand-sky text-white rounded-2xl font-bold text-[15px] tracking-wide flex items-center justify-center gap-2.5 hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <svg className="w-6 h-6 animate-spin text-white/50" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                                    </svg>
                                ) : (
                                    <>Sign In <ArrowRight className="w-5 h-5" /></>
                                )}
                            </button>
                        </form>

                        <div className="mt-10 text-center space-y-1.5 opacity-60 hover:opacity-100 transition-opacity">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secure Access</p>
                            <p className="text-[10px] font-medium text-slate-500">© {new Date().getFullYear()} Kanan International.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
