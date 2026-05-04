import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck, MapPinned, ClipboardCheck } from 'lucide-react';

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
        <div className="min-h-screen bg-meridian-bg text-meridian-text lg:grid lg:grid-cols-[minmax(340px,42vw)_1fr]">
            <aside className="relative flex min-h-[320px] flex-col justify-between overflow-hidden bg-meridian-navy px-6 py-6 text-white sm:px-10 lg:min-h-screen lg:px-12 lg:py-10">
                <div className="relative z-10">
                    <div className="inline-flex rounded bg-white px-3 py-2">
                        <img src="/logo.png" alt="Kanan.co" className="h-10 w-[300px] max-w-[calc(100vw-4.5rem)] object-contain object-left" />
                    </div>
                </div>

                <div className="relative z-10 max-w-xl py-10 lg:py-16">
                    <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand-gold">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Secure Access
                    </p>
                    <h1 className="font-display text-4xl font-black leading-tight tracking-normal sm:text-5xl">
                        Agent visit operations, in one workspace.
                    </h1>
                    <p className="mt-5 max-w-md text-sm font-medium leading-6 text-white/65">
                        Sign in to manage visits, follow-ups, claims, and field activity with the Meridian interface.
                    </p>
                </div>

                <div className="relative z-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                        <MapPinned className="mb-3 h-5 w-5 text-brand-gold" />
                        <p className="text-sm font-black">Field visibility</p>
                        <p className="mt-1 text-xs font-medium leading-5 text-white/55">Plans, visits, and assigned follow-ups stay connected.</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                        <ClipboardCheck className="mb-3 h-5 w-5 text-brand-green" />
                        <p className="text-sm font-black">Review ready</p>
                        <p className="mt-1 text-xs font-medium leading-5 text-white/55">Dashboards surface pending work as soon as you arrive.</p>
                    </div>
                </div>
            </aside>

            <main className="flex min-h-[calc(100vh-320px)] items-center justify-center px-4 py-10 sm:px-6 lg:min-h-screen lg:px-12">
                <section className="w-full max-w-[440px]">
                    <div className="mb-8">
                        <p className="text-[10px] font-black uppercase tracking-widest text-meridian-sub">Agent Portal</p>
                        <h2 className="mt-2 font-display text-3xl font-black tracking-normal text-meridian-text">Sign in</h2>
                    </div>

                    {error && (
                        <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                            <p className="text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-meridian-sub">Email Address</label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-meridian-muted" />
                                <input
                                    {...register('email')}
                                    type="email"
                                    autoComplete="email"
                                    className={`h-12 w-full rounded-lg border bg-white pl-11 pr-4 text-sm font-bold text-meridian-text outline-none transition focus:ring-4 ${
                                        errors.email
                                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                                            : 'border-meridian-border focus:border-meridian-blue focus:ring-blue-100'
                                    }`}
                                    placeholder="name@kanan.co"
                                />
                            </div>
                            {errors.email && <p className="mt-2 text-xs font-bold text-red-500">{errors.email.message}</p>}
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-meridian-sub">Password</label>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-meridian-muted" />
                                <input
                                    {...register('password')}
                                    type={showPass ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    className={`h-12 w-full rounded-lg border bg-white pl-11 pr-12 text-sm font-bold text-meridian-text outline-none transition focus:ring-4 ${
                                        errors.password
                                            ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                                            : 'border-meridian-border focus:border-meridian-blue focus:ring-blue-100'
                                    }`}
                                    placeholder="Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(v => !v)}
                                    aria-label={showPass ? 'Hide password' : 'Show password'}
                                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-meridian-sub transition hover:bg-meridian-bg hover:text-meridian-blue"
                                >
                                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-2 text-xs font-bold text-red-500">{errors.password.message}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-meridian-blue px-4 text-sm font-black text-white shadow-meridian-card transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isLoading ? (
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-xs font-bold text-meridian-muted">
                        Copyright {new Date().getFullYear()} Kanan International.
                    </p>
                </section>
            </main>
        </div>
    );
};

export default Login;
