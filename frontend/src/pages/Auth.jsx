import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, LogIn, UserPlus, FileText } from 'lucide-react';
import { Button } from '../components/Button';
import useAuthStore from '../store/useAuthStore';
import { useToast } from '../components/Toasts';
import { useNavigate } from 'react-router-dom';

export function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const { login, signup, status, errorMessage, clearError } = useAuthStore();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errorMessage) clearError();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isLogin) {
            if (formData.password !== formData.confirmPassword) {
                toast({ title: 'Error', description: 'Passwords do not match', variant: 'error' });
                return;
            }
            if (formData.password.length < 6) {
                toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'error' });
                return;
            }
        }

        const success = isLogin
            ? await login(formData.email, formData.password)
            : await signup(formData.username, formData.email, formData.password);

        if (success) {
            toast({
                title: 'Success!',
                description: isLogin ? 'Welcome back!' : 'Account created successfully!',
                variant: 'success'
            });
            navigate('/');
        } else {
            toast({
                title: 'Authentication Failed',
                description: useAuthStore.getState().errorMessage || 'Something went wrong.',
                variant: 'error'
            });
        }
    };

    return (
        <div className="flex w-full min-h-screen">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full flex"
            >
                {/* Visual Side (Left Half) */}
                <div className="hidden md:flex flex-col w-1/2 bg-[var(--color-primary-600)] justify-center items-center p-12 text-white relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--color-primary-500)_0%,_transparent_100%)]"></div>
                    <div className="relative z-10text-center flex flex-col items-center">
                        <FileText className="w-16 h-16 text-[var(--color-primary-100)] mb-6" />
                        <h2 className="text-4xl font-anton font-normal tracking-wide text-[var(--color-primary-50)] mb-4">
                            {isLogin ? "Welcome Back to Docling!" : "Join Docling Today!"}
                        </h2>
                        <p className="text-[var(--color-primary-100)] text-center text-lg max-w-sm font-sans mx-auto">
                            {isLogin
                                ? "Sign in to pick up where you left off and continue crafting beautiful academic documents."
                                : "Create an account to unlock advanced formatting agents and professional LaTeX tools."}
                        </p>
                    </div>
                </div>

                {/* Form Side (Right Half) */}
                <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-24 bg-[var(--color-surface-50)] flex items-center justify-center">
                    <div className="w-full max-w-md mx-auto">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-anton text-[var(--color-text-main)] mb-2">
                                {isLogin ? 'Sign In' : 'Create Account'}
                            </h2>
                            <p className="text-[var(--color-text-muted)]">
                                {isLogin ? 'Enter your credentials to access your account' : 'Fill in the details to get started'}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!isLogin && (
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-[var(--color-text-main)]">Username</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-[var(--color-text-muted)]" />
                                        </div>
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            required={!isLogin}
                                            className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface-100)] border border-[var(--color-surface-300)] rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] text-[var(--color-text-main)]"
                                            placeholder="johndoe"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-[var(--color-text-main)]">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-[var(--color-text-muted)]" />
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface-100)] border border-[var(--color-surface-300)] rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] text-[var(--color-text-main)]"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium text-[var(--color-text-main)]">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-[var(--color-text-muted)]" />
                                    </div>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface-100)] border border-[var(--color-surface-300)] rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] text-[var(--color-text-main)]"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            {!isLogin && (
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-[var(--color-text-main)]">Confirm Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-[var(--color-text-muted)]" />
                                        </div>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required={!isLogin}
                                            className="w-full pl-10 pr-4 py-2 bg-[var(--color-surface-100)] border border-[var(--color-surface-300)] rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] text-[var(--color-text-main)]"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            )}

                            {errorMessage && (
                                <p className="text-red-500 text-sm font-medium text-center">{errorMessage}</p>
                            )}

                            <Button type="submit" className="w-full mt-6 py-6" disabled={status === 'loading'}>
                                {status === 'loading' ? (
                                    <span className="flex items-center gap-2">
                                        {/* spinner */}
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </span>
                                ) : isLogin ? (
                                    <span className="flex items-center gap-2">Sign In <LogIn className="w-4 h-4" /></span>
                                ) : (
                                    <span className="flex items-center gap-2">Create Account <UserPlus className="w-4 h-4" /></span>
                                )}
                            </Button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-sm text-[var(--color-text-muted)]">
                                {isLogin ? "Don't have an account?" : "Already have an account?"}
                                <button
                                    onClick={() => {
                                        setIsLogin(!isLogin);
                                        clearError();
                                        setFormData({ username: '', email: '', password: '', confirmPassword: '' });
                                    }}
                                    className="ml-2 font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-900)] transition-colors"
                                >
                                    {isLogin ? 'Sign up' : 'Sign in'}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
